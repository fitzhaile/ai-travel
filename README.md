## Hippo AI 🦛

Hippo is an AI travel guide and recommendation web app that helps you choose between two destinations based on cost, vibes, and overall “bang for your buck”. It mimics a ChatGPT-style chat interface and uses the `gpt-5.1` model behind the scenes.

### Features

- **Chat-style interface**: Conversation flow similar to ChatGPT, with Hippo as your assistant.
- **Shareable chats**: Generate unique URLs to share your conversations with others.
- **Structured city comparison**:
  - Plane, hotel, and local transportation costs.
  - Trip themes (nightlife, nature, culture, relaxing, balanced).
  - Two sets of activities: well-known vs. insider/local-ish.
- **Three pricing modes** (selectable via dropdown above the chat):
  - `AI estimate`: uses GPT's general knowledge and rough ranges, clearly labeled as approximate.
  - `Web-assisted`: can use an external web-search API to ground recent price ranges.
  - `Live prices`: can call flight and hotel APIs for more realistic live-ish numbers.

### Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS for styling
- OpenAI Node SDK with `gpt-5.1`
- SQLite (local dev) / PostgreSQL (production) for storing shared chats

### Getting Started

1. **Install dependencies**

```bash
cd hippo-ai
npm install
```

2. **Configure environment variables**

Create a `.env.local` file in `hippo-ai/` with at least:

```bash
OPENAI_API_KEY=your-openai-api-key-here
```

**That's it for local development!** The app will automatically use SQLite (a file-based database) locally. No database server needed. The database file (`hippo-chats.db`) will be created automatically when you first share a chat.

If you want to use PostgreSQL locally instead, add:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
```

Optional, for web-assisted mode:

```bash
WEB_SEARCH_API_KEY=your-web-search-api-key-here
WEB_SEARCH_API_ENDPOINT=https://your-web-search-endpoint.example.com/search
```

Optional, for live prices mode (Amadeus API):

```bash
AMADEUS_CLIENT_ID=your-amadeus-client-id
AMADEUS_CLIENT_SECRET=your-amadeus-client-secret
AMADEUS_BASE_URL=https://test.api.amadeus.com
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

#### Deploying to Render

1. **Create a PostgreSQL database**:
   - In Render Dashboard, go to **New → PostgreSQL**
   - Copy the **Internal Database URL** (starts with `postgresql://`)

2. **Create a Web Service**:
   - Go to **New → Web Service**
   - Connect your GitHub repository
   - Configure:
     - **Environment**: Node
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`

3. **Set Environment Variables**:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `DATABASE_URL`: The PostgreSQL Internal Database URL from step 1
   - `NEXT_PUBLIC_BASE_URL`: Your Render app URL (e.g., `https://your-app.onrender.com`)
   - Optional: `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `WEB_SEARCH_API_KEY`, etc.

4. **Deploy**: Render will build and deploy your app automatically.

#### Other Platforms (Vercel, etc.)

- Set the same environment variables (`OPENAI_API_KEY`, `DATABASE_URL`, optional travel APIs).
- Use the default Next.js build command: `npm run build`.
- Ensure your PostgreSQL database is accessible from your deployment platform.
- Ensure that your chosen travel / search APIs support server-side use from your deployment region.


