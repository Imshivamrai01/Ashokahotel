import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import cloudinary, {
  FOLDER_MAP,
  UPLOAD_TRANSFORM,
  UPLOAD_RESOURCE,
  type UploadType,
} from "@/lib/cloudinary";

export const runtime = "nodejs";

/**
 * Returns signed parameters so the browser can upload a file DIRECTLY to
 * Cloudinary, bypassing the Vercel serverless ~4.5 MB request-body limit.
 * Only the signature (tiny) passes through our function — never the file.
 * The api_secret stays server-side.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { type?: string };
  const uploadType: UploadType =
    body.type && body.type in FOLDER_MAP
      ? (body.type as UploadType)
      : "item";

  const timestamp = Math.round(Date.now() / 1000);
  const folder = FOLDER_MAP[uploadType];
  const transformation = UPLOAD_TRANSFORM[uploadType];

  // Sign exactly the params the client will send (excluding file, api_key,
  // resource_type, cloud_name). Keys must match the client form fields.
  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp, transformation },
    process.env.CLOUDINARY_API_SECRET!,
  );

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    transformation,
    resourceType: UPLOAD_RESOURCE[uploadType],
  });
}
