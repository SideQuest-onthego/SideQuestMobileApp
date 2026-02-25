export type CurrencyCode = "USD";

export type TravelMode = "walk" | "transit" | "car" | "rail" | "driving";

export type ActivityType =
   | "activity"
   | "food"
   | "park"
   | "museum"
   | "restaurant"
   | "event"
   | "transport_node";

export type EstimatedCostType = "flat" | "per_person";

export type ItineraryRequestStatus =
   | "queued"
   | "processing"
   | "completed"
   | "failed";

export type ItineraryStatus = "completed" | "saved";

export type ItineraryStopKind = "activity" | "food" | "transport";

export interface LatLng {
   lat: number;
   lng: number;
}

export interface TimestampFields {
   createdAt: unknown;
   updatedAt: unknown;
}

export interface MoneyRange {
   currency: CurrencyCode;
   min: number;
   max: number;
}

export interface MoneyAmount {
   currency: CurrencyCode;
   amount: number;
}

export interface UserModel extends TimestampFields {
   // ABHIRAM GOES HERE
}

export interface ActivityModel extends TimestampFields {
   id: string;
   name: string;
   type: ActivityType;
   category: string;
   tags: string[];
   active: boolean;
   location: {
      address: string;
      city: string;
      state: string;
      country: string;
      lat: number;
      lng: number;
   };
   source: {
      provider: string;
      googlePlaceId?: string;
   };
   estimatedCost: {
      currency: CurrencyCode;
      type: EstimatedCostType;
      min: number;
      max: number;
   };
   typicalDurationMins: number;
   links?: {
      website?: string;
      imageUrl?: string;
   };
   rating?: number;
   reviewCount?: number;
   dietaryOptions?: string[];
   lastSyncedAt?: unknown;
}

export interface ItineraryRequestModel extends TimestampFields {
   userId: string;
   status: ItineraryRequestStatus;
   startDateTime: string;
   timeLimitHours: number;
   startLocation: {
      label: string;
      lat: number;
      lng: number;
   };
   budget: {
      currency: CurrencyCode;
      total: number;
   };
   party: {
      adults: number;
      kids: number;
   };
   travelMode: TravelMode;
   dietaryRestrictions: string[];
   preferences: {
      interests: string[];
      excludedTags: string[];
   };
}

export interface ItineraryModel extends TimestampFields {
   userId: string;
   requestId: string;
   status: ItineraryStatus;
   title: string;
   startsAt: string;
   endsAt: string;
   budget: {
      currency: CurrencyCode;
      targetTotal: number;
      estimatedTotal: number;
      remainingBudget: number;
   };
   totals: {
      totalDurationMins: number;
      totalTravelTimeMins: number;
   };
   region: {
      states: string[];
      cities: string[];
   };
   highlights: string[];
   warnings: string[];
}

export interface ItineraryStopModel extends TimestampFields {
   order: number;
   kind: ItineraryStopKind;
   startLocal: string;
   endLocal: string;
   activityId?: string;
   snapshot?: {
      name: string;
      type: string;
      category: string;
      address: string;
      city: string;
      state: string;
      lat: number;
      lng: number;
   };
   transport?: {
      mode: TravelMode;
      fromLabel: string;
      toLabel: string;
      durationMins: number;
   };
   cost: MoneyAmount;
   notes?: string;
}
