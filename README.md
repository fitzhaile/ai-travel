## Hippo AI 🦛

Hippo is an AI travel guide and recommendation web app that helps you choose between two destinations based on cost, vibes, and overall “bang for your buck”. It mimics a ChatGPT-style chat interface and uses the `gpt-5.1` model behind the scenes.

### Features

- **Chat-style interface**: Conversation flow similar to ChatGPT, with Hippo as your assistant.
- **Structured city comparison**:
  - Plane, hotel, and local transportation costs.
  - Trip themes (nightlife, nature, culture, relaxing, balanced).
  - Two sets of activities: well-known vs. insider/local-ish.
- **Three pricing modes** (selectable via dropdown above the chat):
  - `AI estimate`: uses GPT’s general knowledge and rough ranges, clearly labeled as approximate.
  - `Web-assisted`: can use an external web-search API to ground recent price ranges.
  - `Live prices`: can call flight and hotel APIs for more realistic live-ish numbers.

### Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS for styling
- OpenAI Node SDK with `gpt-5.1`

### Getting Started

1. **Install dependencies**

```bash
cd sea-cow-app
npm install
```

2. **Configure environment variables**

Create a `.env.local` file in `sea-cow-app/` with at least:

```bash
OPENAI_API_KEY=your-openai-api-key-here
```

Optional, for web-assisted mode:

```bash
WEB_SEARCH_API_KEY=your-web-search-api-key-here
WEB_SEARCH_API_ENDPOINT=https://your-web-search-endpoint.example.com/search
```

Optional, for live prices mode:

```bash
FLIGHT_API_BASE_URL=https://your-flight-api.example.com
FLIGHT_API_KEY=your-flight-api-key-here

HOTEL_API_BASE_URL=https://your-hotel-api.example.com
HOTEL_API_KEY=your-hotel-api-key-here
```

3. **Run the dev server**

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### How Modes Work

- **AI estimate**: Only the model is used. The backend does not call any external APIs. All prices are approximate and should be treated as ballpark ranges.
- **Web-assisted**: If `WEB_SEARCH_API_*` env vars are set, the backend calls your web search endpoint with origin/destinations/dates and passes the JSON summary into GPT as extra context. If not configured, Hippo falls back to estimates and clearly labels them as such.
- **Live prices**: If flight and hotel API env vars are set, the backend:
  - Calls the flight API with origin, destination, and dates.
  - Calls the hotel API with destination and dates.
  - Packs the resulting min/average prices into a structured JSON object.
  - Gives that JSON to GPT with instructions to treat it as primary live data.

### Deployment Notes

- The app is designed to work well on platforms like Vercel:
  - Set the same environment variables (`OPENAI_API_KEY`, optional travel APIs).
  - Use the default Next.js build command: `npm run build`.
- Ensure that your chosen travel / search APIs support server-side use from your deployment region.


