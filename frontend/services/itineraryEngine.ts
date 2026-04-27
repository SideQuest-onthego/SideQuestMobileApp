import type { ActivityModel } from "@/types/sidequest-models";
import type {
  ItineraryResult,
  ItineraryStopResult,
  ItineraryStopViewModel,
} from "@/types/itinerary";

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

function orderPlacesForItinerary(places: ActivityModel[]) {
  const remaining = [...places];
  const centroid = remaining.reduce(
    (acc, place) => ({
      lat: acc.lat + place.location.lat,
      lng: acc.lng + place.location.lng,
    }),
    { lat: 0, lng: 0 },
  );

  centroid.lat /= remaining.length;
  centroid.lng /= remaining.length;

  remaining.sort((a, b) => {
    const distA = Math.hypot(
      a.location.lat - centroid.lat,
      a.location.lng - centroid.lng,
    );
    const distB = Math.hypot(
      b.location.lat - centroid.lat,
      b.location.lng - centroid.lng,
    );
    return distA - distB;
  });

  const ordered: ActivityModel[] = [];
  let current = remaining.shift();

  while (current) {
    const currentPlace = current;
    ordered.push(currentPlace);

    if (remaining.length === 0) {
      break;
    }

    let nextIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const candidateDistance = getDistanceMiles(currentPlace, candidate);
      if (candidateDistance < bestDistance) {
        bestDistance = candidateDistance;
        nextIndex = index;
      }
    });

    const nextPlace = remaining.splice(nextIndex, 1)[0];
    if (!nextPlace) {
      break;
    }

    current = nextPlace;
  }

  return ordered;
}

export function generateItineraryResult(
  places: ActivityModel[],
): ItineraryResult | null {
  if (places.length < 5) {
    return null;
  }

  const ordered = orderPlacesForItinerary(places);
  let clock = 9 * 60;
  let totalActivityMinutes = 0;
  let totalTravelMinutes = 0;
  let totalEstimatedCost = 0;

  const stops: ItineraryStopResult[] = ordered.map((place, index) => {
    const durationMins = Math.max(
      45,
      Math.min(place.typicalDurationMins || 90, 180),
    );
    const travelDistanceMiles =
      index === 0 ? 0 : getDistanceMiles(ordered[index - 1], place);
    const travelTimeMins =
      index === 0
        ? 0
        : Math.max(10, Math.round((travelDistanceMiles / 18) * 60));

    clock += travelTimeMins;
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
