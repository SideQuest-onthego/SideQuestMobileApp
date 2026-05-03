import type { ActivityModel } from "@/types/sidequest-models";
import type {
  ItineraryResult,
  ItineraryStopResult,
  ItineraryStopViewModel,
} from "@/types/itinerary";

type DayWindow = "morning" | "lunch" | "afternoon" | "dinner" | "evening";

type RouteCandidate = {
  orderedPlaces: ActivityModel[];
  score: number;
};

const START_OF_DAY_MINS = 9 * 60;
const MIN_STOP_DURATION_MINS = 45;
const MAX_STOP_DURATION_MINS = 180;
export const MIN_ITINERARY_PLACES = 2;
export const MAX_ITINERARY_PLACES = 5;

function getDistanceMiles(from: ActivityModel, to: ActivityModel): number {
  const lat1 = from.location.lat;
  const lon1 = from.location.lng;
  const lat2 = to.location.lat;
  const lon2 = to.location.lng;

  const earthRadiusMiles = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatClock(minutesSinceMidnight: number) {
  const normalized = ((minutesSinceMidnight % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  const minuteLabel = minutes.toString().padStart(2, "0");
  return `${hour12}:${minuteLabel} ${suffix}`;
}

function getAveragePrice(place: ActivityModel) {
  const min = place.estimatedCost?.min ?? 0;
  const max = place.estimatedCost?.max ?? 0;
  return Math.round((min + max) / 2);
}

function clampDuration(place: ActivityModel) {
  return Math.max(
    MIN_STOP_DURATION_MINS,
    Math.min(place.typicalDurationMins || 90, MAX_STOP_DURATION_MINS),
  );
}

function normalizeLabel(value?: string) {
  return (value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
}

function isFoodPlace(place: ActivityModel) {
  const raw = [
    place.type,
    place.category,
    ...(place.tags ?? []),
  ]
    .map(normalizeLabel)
    .join(" ");

  return /restaurant|food|cafe|coffee|bakery|brunch|lunch|dinner/.test(raw);
}

function isOutdoorPlace(place: ActivityModel) {
  const raw = [
    place.type,
    place.category,
    ...(place.tags ?? []),
  ]
    .map(normalizeLabel)
    .join(" ");

  return /park|garden|outdoor|trail|zoo|beach|waterfront/.test(raw);
}

function getPlaceCategoryKey(place: ActivityModel) {
  return normalizeLabel(place.category) || normalizeLabel(place.type);
}

function getDayWindow(minutesSinceMidnight: number): DayWindow {
  if (minutesSinceMidnight < 11 * 60) {
    return "morning";
  }

  if (minutesSinceMidnight < 14 * 60) {
    return "lunch";
  }

  if (minutesSinceMidnight < 17 * 60) {
    return "afternoon";
  }

  if (minutesSinceMidnight < 20 * 60) {
    return "dinner";
  }

  return "evening";
}

function getPreferredWindows(place: ActivityModel): DayWindow[] {
  if (isFoodPlace(place)) {
    return ["lunch", "dinner"];
  }

  if (isOutdoorPlace(place)) {
    return ["morning", "afternoon"];
  }

  return ["morning", "afternoon", "evening"];
}

function getWindowPenalty(place: ActivityModel, arrivalMinutes: number) {
  const window = getDayWindow(arrivalMinutes);
  const preferred = getPreferredWindows(place);

  if (preferred.includes(window)) {
    return 0;
  }

  if (isFoodPlace(place) && window === "morning") {
    return 55;
  }

  if (isFoodPlace(place) && window === "evening") {
    return 18;
  }

  if (isOutdoorPlace(place) && window === "evening") {
    return 30;
  }

  return 15;
}

function estimateTravelTimeMins(distanceMiles: number) {
  if (distanceMiles <= 0) {
    return 0;
  }

  if (distanceMiles < 1) {
    return Math.max(8, Math.round(distanceMiles * 18));
  }

  if (distanceMiles < 3) {
    return Math.max(12, Math.round(distanceMiles * 12));
  }

  return Math.max(18, Math.round((distanceMiles / 16) * 60));
}

function getTransitionPenalty(
  previousPlace: ActivityModel,
  nextPlace: ActivityModel,
  arrivalMinutes: number,
) {
  let penalty = 0;

  const previousCategory = getPlaceCategoryKey(previousPlace);
  const nextCategory = getPlaceCategoryKey(nextPlace);

  if (previousCategory && previousCategory === nextCategory) {
    penalty += 28;
  } else if (previousPlace.type === nextPlace.type) {
    penalty += 14;
  }

  penalty += getWindowPenalty(nextPlace, arrivalMinutes);

  return penalty;
}

function scoreStartPlace(place: ActivityModel) {
  let score = 0;

  if (isFoodPlace(place)) {
    score += 40;
  }

  if (isOutdoorPlace(place)) {
    score -= 8;
  }

  score += clampDuration(place) / 20;

  return score;
}

function buildRouteFromStart(
  places: ActivityModel[],
  startIndex: number,
): RouteCandidate {
  const remaining = [...places];
  const orderedPlaces: ActivityModel[] = [];
  let score = 0;
  let clock = START_OF_DAY_MINS;

  let current = remaining.splice(startIndex, 1)[0];

  while (current) {
    orderedPlaces.push(current);
    clock += clampDuration(current);

    if (remaining.length === 0) {
      break;
    }

    let nextIndex = 0;
    let bestCandidateScore = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const distanceMiles = getDistanceMiles(current, candidate);
      const travelTimeMins = estimateTravelTimeMins(distanceMiles);
      const arrivalMinutes = clock + travelTimeMins;
      const candidateScore =
        travelTimeMins +
        distanceMiles * 6 +
        getTransitionPenalty(current, candidate, arrivalMinutes);

      if (candidateScore < bestCandidateScore) {
        bestCandidateScore = candidateScore;
        nextIndex = index;
      }
    });

    score += bestCandidateScore;

    const nextPlace = remaining.splice(nextIndex, 1)[0];
    if (!nextPlace) {
      break;
    }

    clock += estimateTravelTimeMins(getDistanceMiles(current, nextPlace));
    current = nextPlace;
  }

  return { orderedPlaces, score };
}

function orderPlacesForItinerary(places: ActivityModel[]) {
  const rankedStarts = places
    .map((place, index) => ({
      index,
      score: scoreStartPlace(place),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.min(places.length, 5));

  const routeCandidates = rankedStarts.map(({ index }) =>
    buildRouteFromStart(places, index),
  );

  routeCandidates.sort((a, b) => a.score - b.score);

  return routeCandidates[0]?.orderedPlaces ?? places;
}

function buildStopNotes(
  place: ActivityModel,
  previousPlace: ActivityModel | null,
  startMinutes: number,
) {
  const notes: string[] = [];
  const window = getDayWindow(startMinutes);

  if (isFoodPlace(place)) {
    if (window === "lunch" || window === "dinner") {
      notes.push(`Good ${window} stop`);
    } else {
      notes.push("Meal stop placed here for route efficiency");
    }
  } else if (isOutdoorPlace(place) && window !== "evening") {
    notes.push("Outdoor stop scheduled during daylight hours");
  }

  if (previousPlace) {
    const previousCategory = getPlaceCategoryKey(previousPlace);
    const currentCategory = getPlaceCategoryKey(place);

    if (
      previousCategory &&
      currentCategory &&
      previousCategory !== currentCategory
    ) {
      notes.push("Breaks up the day with a different type of activity");
    }
  }

  return notes.join(". ") || undefined;
}

export function generateItineraryResult(
  places: ActivityModel[],
): ItineraryResult | null {
  if (places.length < MIN_ITINERARY_PLACES) {
    return null;
  }

  const ordered = orderPlacesForItinerary(places.slice(0, MAX_ITINERARY_PLACES));
  let clock = START_OF_DAY_MINS;
  let totalActivityMinutes = 0;
  let totalTravelMinutes = 0;
  let totalEstimatedCost = 0;

  const stops: ItineraryStopResult[] = ordered.map((place, index) => {
    const durationMins = clampDuration(place);
    const previousPlace = index === 0 ? null : ordered[index - 1];
    const travelDistanceMiles =
      previousPlace === null ? 0 : getDistanceMiles(previousPlace, place);
    const travelTimeMins =
      previousPlace === null
        ? 0
        : estimateTravelTimeMins(travelDistanceMiles);

    clock += travelTimeMins;
    const startTimeMinutes = clock;
    const startTime = formatClock(clock);
    clock += durationMins;
    const endTime = formatClock(clock);

    totalTravelMinutes += travelTimeMins;
    totalActivityMinutes += durationMins;
    totalEstimatedCost += getAveragePrice(place);

    return {
      order: index + 1,
      placeId: place.id,
      startTime,
      endTime,
      travelTimeMinsFromPrevious: travelTimeMins,
      travelDistanceMilesFromPrevious:
        Math.round(travelDistanceMiles * 10) / 10,
      durationMins,
      notes: buildStopNotes(place, previousPlace, startTimeMinutes),
    };
  });

  return {
    id: `itin-${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: "Your Day Plan",
    dateLabel: "Today",
    startTime: stops[0]?.startTime ?? "9:00 AM",
    endTime: stops[stops.length - 1]?.endTime ?? "5:00 PM",
    totalStops: ordered.length,
    totalActivityMinutes,
    totalTravelMinutes,
    totalEstimatedCost,
    stops,
  };
}

export function buildItineraryViewModel(
  itinerary: ItineraryResult | null,
  places: ActivityModel[],
): ItineraryStopViewModel[] {
  if (!itinerary) {
    return [];
  }

  const placeMap = new Map(places.map((place) => [place.id, place]));

  return itinerary.stops
    .map((stop) => {
      const place = placeMap.get(stop.placeId);
      return place ? { stop, place } : null;
    })
    .filter((item): item is ItineraryStopViewModel => item !== null);
}
