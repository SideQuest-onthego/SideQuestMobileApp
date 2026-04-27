import type { ActivityModel } from "@/types/sidequest-models";

const MANHATTAN_COORDS = { lat: 40.7831, lng: -73.9712 };
const TEN_MILES_IN_METERS = 16093;
const MAX_NEARBY_RADIUS_METERS = 50000;
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_RESULTS_PER_REQUEST = 20;
const INCLUDED_TYPES = ["tourist_attraction", "museum", "park", "restaurant"];
const REQUESTS_PER_PAGE = 2;

const nearbyPlacesCache = new Map<
  string,
  { expiresAt: number; places: ActivityModel[] }
>();

type NearbySearchResponse = {
  places?: GooglePlace[];
};

export type NearbyPlacesPage = {
  places: ActivityModel[];
  nextCursor: number | null;
};

type SearchCenter = {
  lat: number;
  lng: number;
};

type GooglePlace = {
  id: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  types?: string[];
  primaryType?: string;
  photos?: {
    name: string;
  }[];
  priceLevel?:
    | "PRICE_LEVEL_UNSPECIFIED"
    | "PRICE_LEVEL_FREE"
    | "PRICE_LEVEL_INEXPENSIVE"
    | "PRICE_LEVEL_MODERATE"
    | "PRICE_LEVEL_EXPENSIVE"
    | "PRICE_LEVEL_VERY_EXPENSIVE";
};

function estimateCostFromType(
  type?: GooglePlace["primaryType"],
  priceLevel?: GooglePlace["priceLevel"],
): ActivityModel["estimatedCost"] {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
      return { currency: "USD", type: "flat", min: 0, max: 0 };
    case "PRICE_LEVEL_INEXPENSIVE":
      return { currency: "USD", type: "per_person", min: 10, max: 20 };
    case "PRICE_LEVEL_MODERATE":
      return { currency: "USD", type: "per_person", min: 21, max: 40 };
    case "PRICE_LEVEL_EXPENSIVE":
      return { currency: "USD", type: "per_person", min: 41, max: 75 };
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return { currency: "USD", type: "per_person", min: 76, max: 150 };
  }

  if (!type) {
    return { currency: "USD", type: "per_person", min: 10, max: 40 };
  }

  if (type.includes("park")) {
    return { currency: "USD", type: "flat", min: 0, max: 0 };
  }

  if (type.includes("museum")) {
    return { currency: "USD", type: "per_person", min: 0, max: 30 };
  }

  if (type.includes("restaurant") || type.includes("food")) {
    return { currency: "USD", type: "per_person", min: 15, max: 40 };
  }

  return { currency: "USD", type: "per_person", min: 10, max: 50 };
}

function googleTypeToActivityType(
  type?: string
): ActivityModel["type"] {
  if (!type) return "activity";
  if (type.includes("restaurant") || type.includes("food")) return "restaurant";
  if (type.includes("museum")) return "museum";
  if (type.includes("park")) return "park";
  return "activity";
}

function getPhotoUrl(photoName?: string) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!photoName || !apiKey) return undefined;
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=900&key=${apiKey}`;
}

function metersToLatitudeDegrees(meters: number) {
  return meters / 111320;
}

function metersToLongitudeDegrees(meters: number, latitude: number) {
  return meters / (111320 * Math.cos((latitude * Math.PI) / 180));
}

function buildSearchCenters(radiusMeters: number, origin: SearchCenter) {
  const offsetMeters = Math.max(
    Math.min(radiusMeters / 2, 15000),
    5000,
  );
  const latOffset = metersToLatitudeDegrees(offsetMeters);
  const lngOffset = metersToLongitudeDegrees(offsetMeters, origin.lat);

  return [
    origin,
    { lat: origin.lat + latOffset, lng: origin.lng },
    { lat: origin.lat - latOffset, lng: origin.lng },
    { lat: origin.lat, lng: origin.lng + lngOffset },
    { lat: origin.lat, lng: origin.lng - lngOffset },
  ];
}

function getCacheKey(
  radiusMeters: number,
  includedType: string,
  center: { lat: number; lng: number },
) {
  return `${radiusMeters}:${includedType}:${center.lat.toFixed(4)}:${center.lng.toFixed(4)}`;
}

function buildSearchPlan(radiusMeters: number, origin: SearchCenter) {
  const searchCenters = buildSearchCenters(radiusMeters, origin);
  return INCLUDED_TYPES.flatMap((includedType) =>
    searchCenters.map((center) => ({ includedType, center })),
  );
}

function placeToActivity(place: GooglePlace): ActivityModel | null {
  if (!place.id || !place.location) return null;

  const name = place.displayName?.text ?? "Unknown place";
  const firstType = place.primaryType ?? place.types?.[0];
  const imageUrl = getPhotoUrl(place.photos?.[0]?.name);

  return {
    id: place.id,
    name,
    type: googleTypeToActivityType(firstType),
    category: firstType ?? "activity",
    tags: place.types ?? [],
    active: true,
    location: {
      address: place.formattedAddress ?? place.shortFormattedAddress ?? "",
      city: "New York",
      state: "NY",
      country: "US",
      lat: place.location.latitude,
      lng: place.location.longitude,
    },
    source: {
      provider: "google_places",
      googlePlaceId: place.id,
    },
    estimatedCost: estimateCostFromType(firstType, place.priceLevel),
    typicalDurationMins: 90,
    ...(imageUrl ? { links: { imageUrl } } : {}),
    createdAt: null,
    updatedAt: null,
  };
}

export async function fetchNearbyManhattanPlacesPage(
  radiusMeters = TEN_MILES_IN_METERS,
  cursor = 0,
): Promise<NearbyPlacesPage> {
  return fetchNearbyPlacesPage(MANHATTAN_COORDS, radiusMeters, cursor);
}

export async function fetchNearbyPlacesPage(
  center: SearchCenter,
  radiusMeters = TEN_MILES_IN_METERS,
  cursor = 0,
): Promise<NearbyPlacesPage> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY. Add it to your frontend/.env"
    );
  }
  const safeApiKey: string = apiKey;
  const safeRadiusMeters = Math.min(
    Math.max(radiusMeters, 1),
    MAX_NEARBY_RADIUS_METERS,
  );

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.shortFormattedAddress",
    "places.location",
    "places.types",
    "places.primaryType",
    "places.photos",
    "places.priceLevel",
  ].join(",");

  const searchPlan = buildSearchPlan(safeRadiusMeters, center);
  const requestSlice = searchPlan.slice(cursor, cursor + REQUESTS_PER_PAGE);

  const requests = requestSlice.map(async ({ includedType, center }) => {
      const cacheKey = getCacheKey(safeRadiusMeters, includedType, center);
      const cachedResult = nearbyPlacesCache.get(cacheKey);

      if (cachedResult && cachedResult.expiresAt > Date.now()) {
        return cachedResult.places;
      }

      const response = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": safeApiKey,
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify({
            maxResultCount: MAX_RESULTS_PER_REQUEST,
            includedTypes: [includedType],
            rankPreference: "DISTANCE",
            locationRestriction: {
              circle: {
                center: {
                  latitude: center.lat,
                  longitude: center.lng,
                },
                radius: safeRadiusMeters,
              },
            },
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Google Places request failed: ${response.status} ${errorBody}`,
        );
      }

      const json = (await response.json()) as NearbySearchResponse;
      const places = (json.places ?? [])
        .map(placeToActivity)
        .filter((place): place is ActivityModel => Boolean(place));

      nearbyPlacesCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        places,
      });

      return places;
    });
  const results = await Promise.all(requests);
  const dedupedPlaces = new Map<string, ActivityModel>();

  for (const resultSet of results) {
    for (const place of resultSet) {
      if (!dedupedPlaces.has(place.id)) {
        dedupedPlaces.set(place.id, place);
      }
    }
  }

  const places = Array.from(dedupedPlaces.values());
  const nextCursor =
    cursor + REQUESTS_PER_PAGE < searchPlan.length
      ? cursor + REQUESTS_PER_PAGE
      : null;

  return { places, nextCursor };
}

export async function fetchNearbyManhattanPlaces(
  radiusMeters = TEN_MILES_IN_METERS,
): Promise<ActivityModel[]> {
  const allPlaces: ActivityModel[] = [];
  const seenIds = new Set<string>();
  let cursor: number | null = 0;

  while (cursor !== null) {
    const page = await fetchNearbyManhattanPlacesPage(radiusMeters, cursor);

    for (const place of page.places) {
      if (!seenIds.has(place.id)) {
        seenIds.add(place.id);
        allPlaces.push(place);
      }
    }

    cursor = page.nextCursor;
  }

  return allPlaces;
}
