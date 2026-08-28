// Baked-in connection config. Set ONCE at build time — never shown in the UI,
// never typed by the restaurant operator.
//
// Why a token at all: /api/orders/print-queue returns live order data (tables,
// items, totals). A fully open endpoint would leak every order to anyone. So
// the agent still authenticates — but the secret is embedded here instead of
// being a per-device setup step. From the operator's side it is invisible.
//
// To set the token: either paste it into AGENT_TOKEN below before `npm run dist`,
// or set the KOT_AGENT_TOKEN env var at build time. It must match
// PRINT_AGENT_SECRET in the server (Vercel) environment.
module.exports = {
  SERVER_URL: "https://taj-saas-delta.vercel.app",
  AGENT_TOKEN: "taj",
};
