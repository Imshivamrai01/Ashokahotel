import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import PushSubscription from "@/lib/db/models/PushSubscription";

// POST /api/push-subscribe — save or update a push subscription
export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !session?.user ||
    !["admin", "captain", "inventory_manager"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscription } = await req.json();
  if (!subscription?.endpoint || !subscription?.keys) {
    return NextResponse.json(
      { error: "Invalid subscription" },
      { status: 400 },
    );
  }

  await connectDB();

  // Upsert by endpoint — one device = one record
  await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      userId: session.user.id,
      role: session.user.role,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    },
    { upsert: true, new: true },
  );

  return NextResponse.json({ success: true });
}

// DELETE /api/push-subscribe — remove subscription on logout/deny.
// Auth required + scoped to the caller's own subscription so an anonymous
// request can't wipe other staff's push registrations.
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { endpoint } = await req.json();
  if (endpoint) {
    await connectDB();
    await PushSubscription.deleteOne({ endpoint, userId: session.user.id });
  }
  return NextResponse.json({ success: true });
}
