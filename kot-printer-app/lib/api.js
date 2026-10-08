// Thin client for the Ashoka Hotel print-queue API.
// Server URL + token are baked in (see ../config.js) — hidden from the UI.
const { SERVER_URL, AGENT_TOKEN } = require("../config");

const BASE = SERVER_URL.replace(/\/+$/, ""); // strip trailing slash

function authHeaders() {
  return {
    Authorization: `Bearer ${AGENT_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/**
 * Fetch unprinted KOTs. Returns an array (possibly empty).
 * Throws on network error or non-2xx so the caller can show a red status.
 */
async function fetchQueue() {
  const res = await fetch(`${BASE}/api/orders/print-queue`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`print-queue HTTP ${res.status}`);
  return res.json();
}

/** Mark a KOT as printed. Throws on non-2xx. */
async function markPrinted(orderId) {
  const res = await fetch(`${BASE}/api/orders/${orderId}/mark-printed`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`mark-printed HTTP ${res.status}`);
  return res.json();
}

/** Fetch bills the cashier asked to print. Returns { branding, queue }. */
async function fetchBillQueue() {
  const res = await fetch(`${BASE}/api/orders/bill-queue`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`bill-queue HTTP ${res.status}`);
  return res.json();
}

/** Mark a bill as printed. Throws on non-2xx. */
async function markBillPrinted(orderId) {
  const res = await fetch(`${BASE}/api/orders/${orderId}/mark-bill-printed`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`mark-bill-printed HTTP ${res.status}`);
  return res.json();
}

/** Fetch menu items for Offline POS */
async function fetchMenu() {
  const res = await fetch(`${BASE}/api/orders/sync`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`sync GET HTTP ${res.status}`);
  return res.json();
}

/** Sync offline orders */
async function syncOfflineOrders(orders) {
  const res = await fetch(`${BASE}/api/orders/sync`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ orders }),
  });
  if (!res.ok) throw new Error(`sync POST HTTP ${res.status}`);
  return res.json();
}

/**
 * Tell the server which printers this PC can see. Returns { billPrinterId } —
 * the printer staff picked for invoices in the admin / reception panel.
 */
async function reportPrinters(printers) {
  const res = await fetch(`${BASE}/api/orders/printers`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ printers }),
  });
  if (!res.ok) throw new Error(`printers HTTP ${res.status}`);
  return res.json();
}

module.exports = {
  reportPrinters,
  fetchQueue,
  markPrinted,
  fetchBillQueue,
  markBillPrinted,
  fetchMenu,
  syncOfflineOrders,
  BASE,
};
