import type { ActivityModel } from "@/types/sidequest-models";

export type ItineraryStopResult = {
  order: number;
  placeId: string;
  startTime: string;
  endTime: string;
  travelTimeMinsFromPrevious: number;
  travelDistanceMilesFromPrevious: number;
  durationMins: number;
  notes?: string;
};

export type ItineraryResult = {
  id: string;
  createdAt: string;
  title: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  totalStops: number;
  totalActivityMinutes: number;
  totalTravelMinutes: number;
  totalEstimatedCost: number;
  stops: ItineraryStopResult[];
};

export type ItineraryStopViewModel = {
  stop: ItineraryStopResult;
  place: ActivityModel;
};
