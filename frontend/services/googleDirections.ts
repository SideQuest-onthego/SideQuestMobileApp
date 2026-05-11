import type { ActivityModel } from "@/types/sidequest-models";

export type DirectionsMode = "rail" | "bus" | "walk";

export type TransitDirectionStep = {
  instruction: string;
  durationText?: string;
  distanceText?: string;
  travelMode?: string;
  durationValue?: string;
  distanceMeters?: number;
  lineName?: string;
  vehicleName?: string;
  headsign?: string;
  departureStop?: string;
  arrivalStop?: string;
  numStops?: number;
};

export type DirectionsRoute = {
  mode: DirectionsMode;
  durationText: string;
  durationMinutes: number;
  distanceText: string;
  distanceMiles: number;
  summary: string;
  steps: TransitDirectionStep[];
};

type GoogleDirectionsResponse = {
  routes?: {
    description?: string;
    duration?: string;
    distanceMeters?: number;
    localizedValues?: {
      distance?: { text?: string };
      duration?: { text?: string };
      staticDuration?: { text?: string };
    };
    legs?: {
      steps?: GoogleRoutesStep[];
    }[];
  }[];
};

type GoogleRoutesStep = {
  travelMode?: string;
  distanceMeters?: number;
  staticDuration?: string;
  localizedValues?: {
    distance?: { text?: string };
    staticDuration?: { text?: string };
  };
  navigationInstruction?: {
    instructions?: string;
  };
  transitDetails?: {
    headsign?: string;
    stopCount?: number;
    stopDetails?: {
      departureStop?: { name?: string };
      arrivalStop?: { name?: string };
    };
    transitLine?: {
      nameShort?: string;
      shortName?: string;
      name?: string;
      vehicle?: { name?: { text?: string }; type?: string };
    };
  };
};

const directionsCache = new Map<
  string,
  { expiresAt: number; route: DirectionsRoute | null }
>();
const CACHE_TTL_MS = 60 * 1000;

function getDirectionsApiKey() {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
  );
}

function metersToMiles(meters?: number) {
  return Math.round(((meters ?? 0) / 1609.344) * 10) / 10;
}

function durationToSeconds(duration?: string) {
  const seconds = Number(duration?.replace(/s$/, "") ?? 0);
  return Number.isFinite(seconds) ? seconds : 0;
}

function durationToMinutes(duration?: string) {
  return Math.max(1, Math.round(durationToSeconds(duration) / 60));
}

function formatDuration(duration?: string) {
  const minutes = durationToMinutes(duration);
  return `${minutes} min`;
}

function formatMinutes(minutes: number) {
  const rounded = Math.max(1, Math.round(minutes));
  return `${rounded} ${rounded === 1 ? "min" : "mins"}`;
}

function getTransitTravelModes(mode: DirectionsMode) {
  if (mode === "bus") {
    return ["BUS"];
  }

  return ["RAIL"];
}

function getRouteSummary(steps: TransitDirectionStep[], fallback: string) {
  const transitStep = steps.find((step) => step.lineName || step.vehicleName);

  if (transitStep?.lineName && transitStep.headsign) {
    return `${transitStep.lineName} toward ${transitStep.headsign}`;
  }

  if (transitStep?.lineName) {
    return `Take ${transitStep.lineName}`;
  }

  return fallback;
}

function isPedestrianStep(step: TransitDirectionStep) {
  if (step.lineName || step.vehicleName || step.numStops) {
    return false;
  }

  if (step.travelMode === "WALK" || step.travelMode === "WALKING") {
    return true;
  }

  return /^(head|turn|continue|walk|take (the )?(stairs|entrance|exit)|destination)/i.test(
    step.instruction,
  );
}

function getCollapsedWalkInstruction(
  walkingMinutes: number,
  nextStep: TransitDirectionStep | null,
  isLastStep: boolean,
) {
  if (isLastStep) {
    return `Walk to destination for ${formatMinutes(walkingMinutes)}`;
  }

  if (nextStep?.departureStop) {
    return `Walk to ${nextStep.departureStop} for ${formatMinutes(walkingMinutes)}`;
  }

  if (nextStep?.lineName || nextStep?.vehicleName) {
    return `Walk and transfer for ${formatMinutes(walkingMinutes)}`;
  }

  return `Walk for ${formatMinutes(walkingMinutes)}`;
}

function collapsePedestrianSteps(steps: TransitDirectionStep[]) {
  const collapsed: TransitDirectionStep[] = [];
  let index = 0;

  while (index < steps.length) {
    const step = steps[index];

    if (!isPedestrianStep(step)) {
      collapsed.push(step);
      index += 1;
      continue;
    }

    let cursor = index;
    let totalSeconds = 0;
    let totalMeters = 0;

    while (cursor < steps.length && isPedestrianStep(steps[cursor])) {
      totalSeconds += durationToSeconds(steps[cursor].durationValue);
      totalMeters += steps[cursor].distanceMeters ?? 0;
      cursor += 1;
    }

    const walkingMinutes = Math.max(1, Math.round(totalSeconds / 60));
    const nextStep = steps[cursor] ?? null;

    collapsed.push({
      instruction: getCollapsedWalkInstruction(
        walkingMinutes,
        nextStep,
        cursor >= steps.length,
      ),
      durationText: formatMinutes(walkingMinutes),
      distanceText:
        totalMeters > 0 ? `${metersToMiles(totalMeters)} mi` : undefined,
      travelMode: "WALK",
    });

    index = cursor;
  }

  return collapsed;
}

function parseRoute(
  mode: DirectionsMode,
  json: GoogleDirectionsResponse,
): DirectionsRoute | null {
  const leg = json.routes?.[0]?.legs?.[0];
  const route = json.routes?.[0];

  if (!leg || !route) {
    return null;
  }

  const steps =
    leg.steps?.map((step) => {
      const transitDetails = step.transitDetails;
      const transitLine = transitDetails?.transitLine;
      const lineName =
        transitLine?.nameShort ?? transitLine?.shortName ?? transitLine?.name;

      return {
        instruction:
          step.navigationInstruction?.instructions ??
          (step.travelMode === "WALK"
            ? "Walk to continue the route"
            : "Continue on this route segment"),
        durationText:
          step.localizedValues?.staticDuration?.text ??
          formatDuration(step.staticDuration),
        distanceText:
          step.localizedValues?.distance?.text ??
          `${metersToMiles(step.distanceMeters)} mi`,
        travelMode: step.travelMode,
        durationValue: step.staticDuration,
        distanceMeters: step.distanceMeters,
        lineName,
        vehicleName:
          transitLine?.vehicle?.name?.text ?? transitLine?.vehicle?.type,
        headsign: transitDetails?.headsign,
        departureStop: transitDetails?.stopDetails?.departureStop?.name,
        arrivalStop: transitDetails?.stopDetails?.arrivalStop?.name,
        numStops: transitDetails?.stopCount,
      };
    }) ?? [];

  const displaySteps = mode === "walk" ? steps : collapsePedestrianSteps(steps);
  const fallbackSummary =
    mode === "walk" ? "Walk to the next stop" : "Transit directions available";

  return {
    mode,
    durationText:
      route.localizedValues?.duration?.text ??
      route.localizedValues?.staticDuration?.text ??
      formatDuration(route.duration),
    durationMinutes: durationToMinutes(route.duration),
    distanceText:
      route.localizedValues?.distance?.text ??
      `${metersToMiles(route.distanceMeters)} mi`,
    distanceMiles: metersToMiles(route.distanceMeters),
    summary:
      route.description || getRouteSummary(displaySteps, fallbackSummary),
    steps: displaySteps,
  };
}

export async function fetchGoogleDirections(
  fromPlace: ActivityModel,
  toPlace: ActivityModel,
  mode: DirectionsMode,
): Promise<DirectionsRoute | null> {
  const apiKey = getDirectionsApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing Google Maps API key. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY or EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to frontend/.env",
    );
  }

  const cacheKey = [
    fromPlace.id,
    toPlace.id,
    mode,
    Math.floor(Date.now() / CACHE_TTL_MS),
  ].join(":");
  const cached = directionsCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.route;
  }

  const fieldMask = [
    "routes.description",
    "routes.duration",
    "routes.distanceMeters",
    "routes.localizedValues",
    "routes.legs.steps.travelMode",
    "routes.legs.steps.distanceMeters",
    "routes.legs.steps.staticDuration",
    "routes.legs.steps.localizedValues",
    "routes.legs.steps.navigationInstruction",
    "routes.legs.steps.transitDetails",
  ].join(",");

  const body = {
    origin: {
      location: {
        latLng: {
          latitude: fromPlace.location.lat,
          longitude: fromPlace.location.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: toPlace.location.lat,
          longitude: toPlace.location.lng,
        },
      },
    },
    travelMode: mode === "walk" ? "WALK" : "TRANSIT",
    units: "IMPERIAL",
    ...(mode === "walk"
      ? {}
      : {
          departureTime: new Date().toISOString(),
          transitPreferences: {
            allowedTravelModes: getTransitTravelModes(mode),
          },
        }),
  };

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Google Routes request failed: ${response.status} ${errorBody}`,
    );
  }

  const json = (await response.json()) as GoogleDirectionsResponse;
  const route = parseRoute(mode, json);

  directionsCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    route,
  });

  return route;
}
