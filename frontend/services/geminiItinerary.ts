import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ActivityModel } from "@/types/sidequest-models";

// Polyfill for AbortSignal.any (not available in React Native)
if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any !== "function") {
  (AbortSignal as typeof AbortSignal & { any: (signals: AbortSignal[]) => AbortSignal }).any = function (
    signals: AbortSignal[]
  ): AbortSignal {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
      signal.addEventListener("abort", () => controller.abort(signal.reason), {
        once: true,
      });
    }
    return controller.signal;
  };
}

export interface ItineraryStop {
  place: ActivityModel;
  order: number;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface GeneratedItinerary {
  stops: ItineraryStop[];
  totalDurationMins: number;
  totalEstimatedCost: number;
  summary?: string;
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

function formatPlaceForPrompt(place: ActivityModel, index: number): string {
  const cost =
    place.estimatedCost.min === place.estimatedCost.max
      ? `$${place.estimatedCost.max}`
      : `$${place.estimatedCost.min}-$${place.estimatedCost.max}`;

  return `${index + 1}. ${place.name}
   - Category: ${place.category || place.type}
   - Location: ${place.location.address}, ${place.location.city}
   - Coordinates: ${place.location.lat}, ${place.location.lng}
   - Estimated Cost: ${cost}
   - Typical Duration: ${place.typicalDurationMins || 60} minutes`;
}

function parseGeminiResponse(
  response: string,
  places: ActivityModel[]
): GeneratedItinerary | null {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    const parsed = JSON.parse(jsonStr);

    if (!parsed.stops || !Array.isArray(parsed.stops)) {
      return null;
    }

    const placeMap = new Map(places.map((p) => [p.id, p]));

    const stops: ItineraryStop[] = parsed.stops
      .map((stop: { placeId: string; order: number; startTime: string; endTime: string; notes?: string }) => {
        const place = placeMap.get(stop.placeId);
        if (!place) return null;

        return {
          place,
          order: stop.order,
          startTime: stop.startTime,
          endTime: stop.endTime,
          notes: stop.notes,
        };
      })
      .filter(Boolean) as ItineraryStop[];

    if (stops.length === 0) return null;

    return {
      stops,
      totalDurationMins: parsed.totalDurationMins || calculateTotalDuration(stops),
      totalEstimatedCost: parsed.totalEstimatedCost || calculateTotalCost(stops),
      summary: parsed.summary,
    };
  } catch {
    return null;
  }
}

function calculateTotalDuration(stops: ItineraryStop[]): number {
  return stops.reduce((total, stop) => {
    return total + (stop.place.typicalDurationMins || 60);
  }, 0);
}

function calculateTotalCost(stops: ItineraryStop[]): number {
  return stops.reduce((total, stop) => {
    const avg =
      (stop.place.estimatedCost.min + stop.place.estimatedCost.max) / 2;
    return total + avg;
  }, 0);
}

export async function generateItineraryWithGemini(
  places: ActivityModel[],
  startTime: string = "10:00 AM"
): Promise<GeneratedItinerary> {
  if (!GEMINI_API_KEY) {
    console.log("Gemini API key not configured, using fallback");
    return generateFallbackItinerary(places, startTime);
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const placesDescription = places.map(formatPlaceForPrompt).join("\n\n");

    const prompt = `You are a travel itinerary planner. Given the following places the user wants to visit, create an optimized day itinerary starting at ${startTime}.

Consider:
1. Geographic proximity - minimize travel time between stops
2. Logical ordering - restaurants around meal times, activities in between
3. Typical visit duration for each place
4. A comfortable pace with reasonable breaks

Places to include:
${placesDescription}

Respond with a JSON object in this exact format (no markdown, just raw JSON):
{
  "stops": [
    {
      "placeId": "the exact id from the place",
      "order": 1,
      "startTime": "10:00 AM",
      "endTime": "11:30 AM",
      "notes": "Optional brief note about this stop"
    }
  ],
  "totalDurationMins": 300,
  "totalEstimatedCost": 85,
  "summary": "A brief one-sentence summary of the day plan"
}

Place IDs for reference:
${places.map((p) => `- ${p.name}: "${p.id}"`).join("\n")}

Important: Use the exact place IDs provided. Include all places in the itinerary.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const parsed = parseGeminiResponse(response, places);
    if (parsed && parsed.stops.length > 0) {
      return parsed;
    }

    console.log("Failed to parse Gemini response, using fallback");
    return generateFallbackItinerary(places, startTime);
  } catch (error) {
    console.error("Gemini API error:", error);
    return generateFallbackItinerary(places, startTime);
  }
}

export function generateFallbackItinerary(
  places: ActivityModel[],
  startTime: string = "10:00 AM"
): GeneratedItinerary {
  const timeToMinutes = (time: string): number => {
    const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 600;
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + mins;
  };

  const minutesToTime = (mins: number): string => {
    const hours24 = Math.floor(mins / 60) % 24;
    const minutes = mins % 60;
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  let currentMins = timeToMinutes(startTime);
  const stops: ItineraryStop[] = [];

  places.forEach((place, index) => {
    const duration = place.typicalDurationMins || 60;
    const start = minutesToTime(currentMins);
    currentMins += duration;
    const end = minutesToTime(currentMins);

    stops.push({
      place,
      order: index + 1,
      startTime: start,
      endTime: end,
    });

    currentMins += 30;
  });

  return {
    stops,
    totalDurationMins: calculateTotalDuration(stops),
    totalEstimatedCost: calculateTotalCost(stops),
  };
}
