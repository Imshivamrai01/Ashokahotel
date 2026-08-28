import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import CaptainCall from "@/lib/db/models/CaptainCall";
import Location from "@/lib/db/models/Location";
import PushSubscription from "@/lib/db/models/PushSubscription";
import { auth } from "@/lib/auth";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_MAILTO ?? "mailto:admin@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// Best-effort per-IP throttle for the PUBLIC call endpoint. In-memory, so it's
// per warm serverless instance (not global) — a basic spam/DoS speed bump, not
// a hard guarantee. The per-location "one pending call" guard below is the
// stronger dedup; this caps abuse from a single client hammering many codes.
const RL_WINDOW_MS = 60_000;
const RL_MAX = 6;
const callTimes = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (callTimes.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  if (recent.length >= RL_MAX) {
    callTimes.set(ip, recent);
    return true;
  }
  recent.push(now);
  callTimes.set(ip, recent);
  if (callTimes.size > 5000) {
    for (const [k, v] of callTimes) {
      if (v.every((t) => now - t > RL_WINDOW_MS)) callTimes.delete(k);
    }
  }
  return false;
}

// POST /api/captain-call — called from guest menu (no auth required)
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests — please wait a moment." },
      { status: 429 },
    );
  }

  let locationCode: string | undefined;
  try {
    ({ locationCode } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectDB();

  // ── Generic call (no locationCode) ──────────────────────────────────────
  if (!locationCode) {
    const GENERIC_ID = "generic-guest-call";
    const existing = await CaptainCall.findOne({
      tableId: GENERIC_ID,
      status: "pending",
    });
    if (existing) {
      return NextResponse.json({ success: true, alreadyCalled: true });
    }

    await CaptainCall.create({
      tableId: GENERIC_ID,
      tableLabel: "A guest",
      locationCode: "none",
      isGeneric: true,
      status: "pending",
    });

    try {
      const subs = await PushSubscription.find({
        role: { $in: ["captain", "admin"] },
      }).lean();
      const payload = JSON.stringify({
        title: "🔔 Guest Needs Attention!",
        body: "A guest is requesting assistance",
        tag: "captain-call-generic",
        data: { tableLabel: "A guest" },
      });
      await Promise.allSettled(
        subs.map((sub) =>
          webpush
            .sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
              },
              payload,
            )
            .catch(async (err: { statusCode?: number }) => {
              if (err?.statusCode === 410 || err?.statusCode === 404) {
                await PushSubscription.deleteOne({ endpoint: sub.endpoint });
              }
            }),
        ),
      );
    } catch {
      /* Push failures must not break call creation */
    }

    return NextResponse.json({ success: true });
  }

  // ── Location-specific call ───────────────────────────────────────────────
  const location = await Location.findOne({
    code: locationCode,
    isActive: true,
  }).lean();
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Prevent spamming — only one pending call per location at a time
  const existing = await CaptainCall.findOne({
    tableId: location._id.toString(),
    status: "pending",
  });
  if (existing) {
    return NextResponse.json({ success: true, alreadyCalled: true });
  }

  await CaptainCall.create({
    tableId: location._id.toString(),
    tableLabel: location.label,
    locationCode,
    status: "pending",
  });

  // Fan-out Web Push to all captain/admin subscriptions (fire-and-forget)
  try {
    const subs = await PushSubscription.find({
      role: { $in: ["captain", "admin"] },
    }).lean();

    const payload = JSON.stringify({
      title: "🔔 Table Calling!",
      body: `${location.label} needs your attention`,
      tag: `captain-call-${location._id}`,
      data: { tableLabel: location.label },
    });

    await Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            },
            payload,
          )
          .catch(async (err: { statusCode?: number }) => {
            // Remove stale subscriptions (410 Gone / 404 Not Found)
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              await PushSubscription.deleteOne({ endpoint: sub.endpoint });
            }
          }),
      ),
    );
  } catch {
    // Push failures must never break the call creation
  }

  return NextResponse.json({ success: true });
}

// GET /api/captain-call — captain polls for pending calls
export async function GET() {
  const session = await auth();
  if (!session?.user || !["admin", "captain"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const calls = await CaptainCall.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json(calls);
}
