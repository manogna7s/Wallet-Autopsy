# Wallet Autopsy

Don't trust an address. Investigate it.

Explainable wallet and contract reputation. The data layer fetches real Ethereum activity from Alchemy. Gemini and the risk engine are not connected yet.

## Run

Create a root `.env` from `.env.example` and set `ALCHEMY_API_KEY`. Never put that key in the client.

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

- API: http://localhost:3002/api/health
- App: http://localhost:5173 (Vite proxies `/api` to the server)

```bash
npm run test:server
```

`GET /api/investigate/:address?chain=ethereum` returns normalized transfers and detectable ERC-20 approvals. Empty wallets return an empty activity payload, not fabricated history.

## Stack

React, Vite, Tailwind CSS, React Router, Recharts, React Flow, Lucide React, Express, Axios.
