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

export interface PlaceInsights {
  summary: string;
  bestTimeToVisit: string;
  goodFor: string[];
  nearbySuggestions: string[];
  vibe: string[];
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const insightsCache = new Map<string, PlaceInsights>();

function asStringArray(value: unknown, max = 4): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, max);
}

function parseInsightsResponse(response: string): PlaceInsights | null {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    const parsed = JSON.parse(jsonStr);

    if (
      typeof parsed.summary !== "string" ||
      typeof parsed.bestTimeToVisit !== "string"
    ) {
      return null;
    }

    const goodFor = asStringArray(parsed.goodFor);
    const nearbySuggestions = asStringArray(parsed.nearbySuggestions, 3);
    const vibe = asStringArray(parsed.vibe);

    if (goodFor.length === 0 || nearbySuggestions.length === 0 || vibe.length === 0) {
      return null;
    }

    return {
      summary: parsed.summary.trim(),
      bestTimeToVisit: parsed.bestTimeToVisit.trim(),
      goodFor,
      nearbySuggestions,
      vibe,
    };
  } catch {
    return null;
  }
}

export async function fetchPlaceInsights(
  place: ActivityModel,
): Promise<PlaceInsights | null> {
  const cached = insightsCache.get(place.id);
  if (cached) return cached;

  if (!GEMINI_API_KEY) {
    console.log("Gemini API key not configured, skipping place insights");
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const tags = (place.tags ?? []).slice(0, 8).join(", ") || "(none)";
    const prompt = `You are a local travel expert. For the place below, provide concise, vivid insights a visitor would find useful.

Place: ${place.name}
Address: ${place.location.address}, ${place.location.city}, ${place.location.state}
Category: ${place.category || place.type}
Tags: ${tags}
Coordinates: ${place.location.lat}, ${place.location.lng}

Respond with a JSON object in this exact format (no markdown, just raw JSON):
{
  "summary": "1-2 sentence vivid description of what this place is and why someone would visit",
  "bestTimeToVisit": "Short phrase, e.g. 'Late morning - Early afternoon' or 'Weekday evenings'",
  "goodFor": ["3-4 short activity or audience phrases, each 1-3 words"],
  "nearbySuggestions": ["3 real specific nearby places (names only) a visitor could also check out"],
  "vibe": ["3 evocative single-word adjectives capturing the mood"]
}

Rules:
- Be specific to THIS place, not generic. Reference its actual character.
- No emojis. No double quotes inside string values. No trailing periods on short phrases.
- Keep every array entry short and scannable.
- "nearbySuggestions" must be real places that are genuinely close to the address above. Do not invent names.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = parseInsightsResponse(text);

    if (parsed) {
      insightsCache.set(place.id, parsed);
      return parsed;
    }

    console.log("Failed to parse Gemini place insights response");
    return null;
  } catch (error) {
    console.error("Gemini place insights error:", error);
    return null;
  }
}
