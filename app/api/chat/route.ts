import { NextRequest } from "next/server";
import OpenAI from "openai";
import {
  ChatRequestBody,
  CityComparisonInput,
  CityComparisonData,
  Mode,
  PriceBreakdown
} from "../../../lib/types";
import { buildSeaCowSystemPrompt, buildTripContext } from "../../../lib/prompts/seaCowPrompt";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const AMADEUS_BASE_URL =
  process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com";
const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;

let amadeusTokenCache:
  | {
    token: string;
    expiresAt: number;
  }
  | null = null;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { mode, trip, messages } = body;

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY is not configured on the server."
        }),
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: "At least one user message is required."
        }),
        { status: 400 }
      );
    }

    const systemPrompt = buildSeaCowSystemPrompt(mode);
    const tripContext = buildTripContext(trip);

    let liveDataContext = "";

    if (mode === "web-assisted") {
      liveDataContext = await getWebAssistedContext(trip);
    } else if (mode === "live-prices") {
      const comparisonData = await getLivePriceComparison(trip);
      liveDataContext = JSON.stringify(comparisonData);
    }

    const openAiMessages = [
      {
        role: "system" as const,
        content: systemPrompt
      },
      {
        role: "system" as const,
        content:
          "Trip context (origin, dates, theme, budget): " +
          (tripContext || "User has not provided a structured trip context.")
      },
      ...(liveDataContext
        ? [
            {
              role: "system" as const,
              content:
                mode === "live-prices"
                  ? "Structured live price data (JSON for each destination): " +
                    liveDataContext
                  : "Recent web-based estimated ranges and context: " +
                    liveDataContext
            }
          ]
        : []),
      ...messages.map((m) => ({
        role: m.role,
        content: m.content
      }))
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      temperature: 0.4,
      messages: openAiMessages
    });

    const assistantMessage = completion.choices[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({
        content: assistantMessage
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Hippo chat error:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while generating a response."
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function getWebAssistedContext(trip: CityComparisonInput): Promise<string> {
  const apiKey = process.env.WEB_SEARCH_API_KEY;
  const endpoint = process.env.WEB_SEARCH_API_ENDPOINT;

  if (!apiKey || !endpoint) {
    return "No web search API is currently configured. Use your general knowledge but clearly note that prices are approximate and not live.";
  }

  try {
    const url = new URL(endpoint);
    url.searchParams.set("origin", trip.origin);
    url.searchParams.set("cityA", trip.cityA);
    url.searchParams.set("cityB", trip.cityB);
    if (trip.startDate) url.searchParams.set("startDate", trip.startDate);
    if (trip.endDate) url.searchParams.set("endDate", trip.endDate);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      cache: "no-store"
    });

    if (!res.ok) {
      return "Web search API responded with an error. Fall back to general price ranges and clearly label estimates.";
    }

    const data = await res.json();
    return JSON.stringify(data);
  } catch {
    return "Web search API failed. Fall back to general price ranges and clearly label estimates.";
  }
}

async function getLivePriceComparison(
  trip: CityComparisonInput
): Promise<{ destinationA: CityComparisonData | null; destinationB: CityComparisonData | null }> {
  const [a, b] = await Promise.all([
    getLivePriceDataForDestination(trip, "A"),
    getLivePriceDataForDestination(trip, "B")
  ]);

  return {
    destinationA: a,
    destinationB: b
  };
}

async function getLivePriceDataForDestination(
  trip: CityComparisonInput,
  which: "A" | "B"
): Promise<CityComparisonData | null> {
  const city = which === "A" ? trip.cityA : trip.cityB;

  if (!city) return null;

  const baseBreakdown: PriceBreakdown = {
    currency: "USD",
    flightCost: null,
    hotelPerNight: null,
    transportPerDay: null,
    nights: null,
    days: null
  };

  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const ms = end.getTime() - start.getTime();
    const days = ms > 0 ? Math.round(ms / (1000 * 60 * 60 * 24)) : null;
    baseBreakdown.days = days;
    baseBreakdown.nights = days ? Math.max(days - 1, 1) : null;
  }

  let flightCost: number | null = null;
  let hotelPerNight: number | null = null;

  try {
    // Prefer Amadeus Flight Offers Search when Amadeus credentials are configured.
    if (AMADEUS_CLIENT_ID && AMADEUS_CLIENT_SECRET && trip.origin && trip.startDate) {
      const token = await getAmadeusAccessToken();

      if (token) {
        const originCode = await resolveToIataCode(trip.origin);
        const destinationCode = await resolveToIataCode(city);

        if (originCode && destinationCode) {
          const body: Record<string, unknown> = {
            currencyCode: "USD",
            originLocationCode: originCode,
            destinationLocationCode: destinationCode,
            departureDate: trip.startDate,
            adults: 1,
            max: 20
          };

          if (trip.endDate) {
            body.returnDate = trip.endDate;
          }

          const res = await fetch(`${AMADEUS_BASE_URL}/v2/shopping/flight-offers`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            cache: "no-store",
            body: JSON.stringify(body)
          });

          if (res.ok) {
            const data = (await res.json()) as {
              data?: { price?: { total?: string } }[];
            };

            if (Array.isArray(data.data) && data.data.length > 0) {
              let min = Number.POSITIVE_INFINITY;
              for (const offer of data.data) {
                const value = offer?.price?.total;
                if (typeof value === "string") {
                  const num = Number.parseFloat(value);
                  if (!Number.isNaN(num) && num < min) {
                    min = num;
                  }
                }
              }

              if (Number.isFinite(min)) {
                flightCost = min;
              }
            }
          }
        }
      }
    }
  } catch {
    // ignore and leave as null
  }

  return {
    destinationLabel: city,
    price: {
      ...baseBreakdown,
      flightCost,
      hotelPerNight,
      transportPerDay: null
    },
    popularActivities: [],
    insiderActivities: []
  };
}

async function getAmadeusAccessToken(): Promise<string | null> {
  if (!AMADEUS_CLIENT_ID || !AMADEUS_CLIENT_SECRET) return null;

  const now = Date.now();
  if (amadeusTokenCache && now < amadeusTokenCache.expiresAt - 60_000) {
    return amadeusTokenCache.token;
  }

  try {
    const res = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      cache: "no-store",
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: AMADEUS_CLIENT_ID,
        client_secret: AMADEUS_CLIENT_SECRET
      }).toString()
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!data.access_token || typeof data.expires_in !== "number") {
      return null;
    }

    const expiresAt = now + data.expires_in * 1000;
    amadeusTokenCache = {
      token: data.access_token,
      expiresAt
    };

    return data.access_token;
  } catch {
    return null;
  }
}

async function resolveToIataCode(location: string): Promise<string | null> {
  const trimmed = location.trim();
  if (!trimmed) return null;

  // If the user already provided a 3-letter code, accept it directly.
  if (/^[A-Za-z]{3}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (!AMADEUS_CLIENT_ID || !AMADEUS_CLIENT_SECRET) return null;

  const token = await getAmadeusAccessToken();
  if (!token) return null;

  try {
    const params = new URLSearchParams({
      subType: "AIRPORT,CITY",
      keyword: trimmed,
      "page[limit]": "5",
      sort: "analytics.travelers.score"
    });

    const res = await fetch(`${AMADEUS_BASE_URL}/v1/reference-data/locations?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      data?: { iataCode?: string; address?: { cityCode?: string } }[];
    };

    if (!Array.isArray(data.data) || data.data.length === 0) {
      return null;
    }

    // Prefer airport IATA code when available, otherwise fall back to city code.
    for (const item of data.data) {
      if (item.iataCode) {
        return item.iataCode.toUpperCase();
      }
      if (item.address?.cityCode) {
        return item.address.cityCode.toUpperCase();
      }
    }

    return null;
  } catch {
    return null;
  }
}


