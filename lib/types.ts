export type Mode = "web-assisted" | "live-prices";

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  mode?: Mode;
}

export interface CityComparisonInput {
  origin: string;
  cityA: string;
  cityB: string;
  startDate: string;
  endDate: string;
  theme: string;
  budget: string;
}

export interface PriceBreakdown {
  currency: string;
  flightCost: number | null;
  hotelPerNight: number | null;
  transportPerDay: number | null;
  nights: number | null;
  days: number | null;
}

export type ActivityType = "popular" | "insider";

export interface Activity {
  name: string;
  type: ActivityType;
  description: string;
  roughCost: string;
  neighborhoodOrArea?: string;
}

export interface CityComparisonData {
  destinationLabel: string;
  price: PriceBreakdown;
  popularActivities: Activity[];
  insiderActivities: Activity[];
}

export interface ChatRequestBody {
  mode: Mode;
  trip: CityComparisonInput;
  messages: Message[];
}


