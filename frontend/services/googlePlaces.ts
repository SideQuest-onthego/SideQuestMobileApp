import type { ActivityModel } from "@/types/sidequest-models";

const MANHATTAN_COORDS = { lat: 40.7831, lng: -73.9712 };
const TEN_MILES_IN_METERS = 16093;

type NearbySearchResponse = {
  places?: GooglePlace[];
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
  priceLevel?:
    | "PRICE_LEVEL_FREE"
    | "PRICE_LEVEL_INEXPENSIVE"
    | "PRICE_LEVEL_MODERATE"
    | "PRICE_LEVEL_EXPENSIVE"
    | "PRICE_LEVEL_VERY_EXPENSIVE";
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{
    name: string;
  }>;
  googleMapsUri?: string;
};

function priceLevelToRange(
  priceLevel: GooglePlace["priceLevel"]
): ActivityModel["estimatedCost"] {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
      return { currency: "USD", type: "flat", min: 0, max: 0 };
    case "PRICE_LEVEL_INEXPENSIVE":
      return { currency: "USD", type: "per_person", min: 10, max: 25 };
    case "PRICE_LEVEL_MODERATE":
      return { currency: "USD", type: "per_person", min: 25, max: 50 };
    case "PRICE_LEVEL_EXPENSIVE":
      return { currency: "USD", type: "per_person", min: 50, max: 100 };
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return { currency: "USD", type: "per_person", min: 100, max: 200 };
    default:
      return { currency: "USD", type: "per_person", min: 0, max: 0 };
  }
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
    estimatedCost: priceLevelToRange(place.priceLevel),
    typicalDurationMins: 90,
    links: {
      website: place.googleMapsUri,
      imageUrl,
    },
    rating: place.rating,
    reviewCount: place.userRatingCount,
    createdAt: null,
    updatedAt: null,
  };
}

export async function fetchNearbyManhattanPlaces(
  radiusMeters = TEN_MILES_IN_METERS
): Promise<ActivityModel[]> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY. Add it to your frontend/.env"
    );
  }

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.shortFormattedAddress",
    "places.location",
    "places.types",
    "places.primaryType",
    "places.priceLevel",
    "places.rating",
    "places.userRatingCount",
    "places.photos",
    "places.googleMapsUri",
  ].join(",");

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify({
        maxResultCount: 20,
        includedTypes: ["tourist_attraction", "museum", "park", "restaurant"],
        rankPreference: "POPULARITY",
        locationRestriction: {
          circle: {
            center: {
              latitude: MANHATTAN_COORDS.lat,
              longitude: MANHATTAN_COORDS.lng,
            },
            radius: radiusMeters,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Places request failed: ${response.status} ${errorBody}`);
  }

  const json = (await response.json()) as NearbySearchResponse;
  const mapped = (json.places ?? [])
    .map(placeToActivity)
    .filter((place): place is ActivityModel => Boolean(place));

  return mapped;
}
