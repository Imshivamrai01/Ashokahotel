import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export default cloudinary;

// ─── Upload Helpers ──────────────────────────────────────────────────────────

export type UploadType =
  | "item"
  | "item-video"
  | "category"
  | "branding-logo"
  | "branding-cover"
  | "branding-video";

export const FOLDER_MAP: Record<UploadType, string> = {
  item: "ashoka/menu/items",
  "item-video": "ashoka/menu/item-videos",
  category: "ashoka/menu/categories",
  "branding-logo": "ashoka/branding",
  "branding-cover": "ashoka/branding",
  "branding-video": "ashoka/branding/videos",
};

// Incoming-transformation STRINGS for signed client-direct uploads. Same
// compression as TRANSFORM_MAP, expressed as a single Cloudinary transformation
// string so it can be signed and sent as one form field. Baked into the stored
// asset on upload — every delivery is already compressed.
export const UPLOAD_TRANSFORM: Record<UploadType, string> = {
  item: "w_1200,c_limit,q_auto:good",
  "item-video": "h_720,c_limit,q_auto",
  category: "w_1200,c_limit,q_auto:good",
  "branding-logo": "w_512,c_limit,q_auto:good",
  "branding-cover": "w_1920,c_limit,q_auto:good",
  "branding-video": "h_1080,c_limit,q_auto",
};

export const UPLOAD_RESOURCE: Record<UploadType, "image" | "video"> = {
  item: "image",
  "item-video": "video",
  category: "image",
  "branding-logo": "image",
  "branding-cover": "image",
  "branding-video": "video",
};

// Ingest ceilings — generous, because everything is compressed on upload
// (see TRANSFORM_MAP). Files under these limits are accepted and shrunk by
// Cloudinary rather than rejected.
const MAX_SIZE_BYTES: Record<UploadType, number> = {
  item: 10 * 1024 * 1024, // 10 MB
  "item-video": 4 * 1024 * 1024, // 4 MB — per-item menu clip
  category: 10 * 1024 * 1024, // 10 MB
  "branding-logo": 10 * 1024 * 1024, // 10 MB
  "branding-cover": 15 * 1024 * 1024, // 15 MB
  "branding-video": 100 * 1024 * 1024, // 100 MB
};

// Incoming transformations applied to the STORED asset on upload, so the saved
// file (and every delivery) is already compressed. Dimension caps use
// crop:"limit" — only downscale, never upscale. Order matters: resize first,
// then quality/format.
const TRANSFORM_MAP: Record<UploadType, Record<string, unknown>[]> = {
  item: [
    { width: 1200, crop: "limit" },
    { quality: "auto:good", fetch_format: "auto" },
  ],
  // Per-item menu clip: cap to 720p + auto bitrate/codec.
  "item-video": [{ height: 720, crop: "limit" }, { quality: "auto" }],
  category: [
    { width: 1200, crop: "limit" },
    { quality: "auto:good", fetch_format: "auto" },
  ],
  "branding-logo": [
    { width: 512, crop: "limit" },
    { quality: "auto:good", fetch_format: "auto" },
  ],
  "branding-cover": [
    { width: 1920, crop: "limit" },
    { quality: "auto:good", fetch_format: "auto" },
  ],
  // Video: cap to 1080p height + auto bitrate/codec to keep files small.
  "branding-video": [
    { height: 1080, crop: "limit" },
    { quality: "auto" },
  ],
};

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes: number;
}

/**
 * Upload a file Buffer to Cloudinary.
 * Called from API routes — runs server-side only.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  uploadType: UploadType,
  publicIdPrefix?: string,
): Promise<UploadResult> {
  const maxBytes = MAX_SIZE_BYTES[uploadType];
  if (buffer.byteLength > maxBytes) {
    throw new Error(
      `File too large. Max ${Math.round(maxBytes / 1024)} KB for ${uploadType}.`,
    );
  }

  const folder = FOLDER_MAP[uploadType];
  const isVideo = uploadType === "branding-video";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicIdPrefix
          ? `${publicIdPrefix}_${Date.now()}`
          : undefined,
        resource_type: isVideo ? "video" : "image",
        transformation: TRANSFORM_MAP[uploadType],
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Upload failed"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      },
    );
    uploadStream.end(buffer);
  });
}

/**
 * Delete an asset from Cloudinary by public ID.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" = "image",
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Extract public ID from a Cloudinary URL for deletion.
 */
export function extractPublicId(cloudinaryUrl: string): string | null {
  try {
    const url = new URL(cloudinaryUrl);
    const parts = url.pathname.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;
    // Skip version segment (v1234567) if present
    const afterUpload = parts.slice(uploadIndex + 1);
    const pathWithoutVersion = afterUpload[0]?.match(/^v\d+$/)
      ? afterUpload.slice(1)
      : afterUpload;
    const withExtension = pathWithoutVersion.join("/");
    return withExtension.replace(/\.[^/.]+$/, ""); // remove extension
  } catch {
    return null;
  }
}
