import type { ActivityModel } from "@/types/sidequest-models";

import type { UserSearchPreferences } from "./userPreferences";


// WAITING FOR FRONTEND TO ADD THE DISTANCE SETTER IN ACCOUNT TAB
const MANHATTAN_ORIGIN = { lat: 40.712778, lng: -74.006111 };

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getDistanceMiles(place: ActivityModel): number {
  const lat1 = toRadians(MANHATTAN_ORIGIN.lat);
  const lon1 = toRadians(MANHATTAN_ORIGIN.lng);
  const lat2 = toRadians(place.location.lat);
  const lon2 = toRadians(place.location.lng);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const earthRadiusMiles = 3958.8;

  return earthRadiusMiles * c;
}

function isWithinBudget(place: ActivityModel, budget: number) {
  return budget <= 0 || place.estimatedCost.max <= budget;
}

export function rankPlacesByPreferences(
  places: ActivityModel[],
  preferences: UserSearchPreferences,
) {
  const withinDistance = places.filter(
    (place) => getDistanceMiles(place) <= preferences.distance,
  );
  const scopedByDistance = withinDistance.length > 0 ? withinDistance : places;

  const withinBudget = scopedByDistance.filter((place) =>
    isWithinBudget(place, preferences.budget),
  );
  const scopedPlaces = withinBudget.length > 0 ? withinBudget : scopedByDistance;

  return [...scopedPlaces].sort((a, b) => {
    const distanceDelta = getDistanceMiles(a) - getDistanceMiles(b);
    if (distanceDelta !== 0) {
      return distanceDelta;
    }

    const priceDelta = b.estimatedCost.max - a.estimatedCost.max;
    if (priceDelta !== 0) {
      return priceDelta;
    }

    return a.name.localeCompare(b.name);
  });
}
