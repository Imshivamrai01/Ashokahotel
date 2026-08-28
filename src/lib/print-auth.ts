import { auth } from "@/lib/auth";
import { createHash, timingSafeEqual } from "crypto";
import type { UserRole } from "@/types";

// Constant-time secret compare. Hash both sides to a fixed length so
// timingSafeEqual never throws on length mismatch and no prefix/length timing
// leaks through the `===` short-circuit.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Authorization for KOT print endpoints. Accepts EITHER:
 *
 *   1. `Authorization: Bearer <PRINT_AGENT_SECRET>` — the local Electron/Node
 *      print agent, which has no browser session, OR
 *   2. a logged-in next-auth session whose role is in `allowedRoles` — for
 *      manual/browser-triggered prints (kitchen reprint button, etc.).
 *
 * Set `PRINT_AGENT_SECRET` in the environment. If it is unset, only the
 * session path works (the agent is effectively disabled — fail closed).
 */
export async function authorizePrintAgent(
  req: Request,
  allowedRoles: UserRole[],
): Promise<{ ok: true } | { ok: false; status: number }> {
  const secret = process.env.PRINT_AGENT_SECRET;
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";

  // Agent path — constant-time compare. Fails closed if the secret is unset.
  if (secret && token && safeEqual(token, secret)) {
    return { ok: true };
  }

  // Session path — browser-triggered print by an allowed role.
  const session = await auth();
  if (session?.user && allowedRoles.includes(session.user.role)) {
    return { ok: true };
  }

  return { ok: false, status: 401 };
}
