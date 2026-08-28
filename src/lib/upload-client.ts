import type { UploadType } from "@/lib/cloudinary";

export interface DirectUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format?: string;
  width?: number;
  height?: number;
}

/**
 * Upload a file straight from the browser to Cloudinary using a server-signed
 * request. Bypasses the Vercel serverless ~4.5 MB body limit (the file never
 * touches our function). Compression is baked in via the signed `transformation`
 * param, so the stored asset is already optimized.
 *
 * @param onProgress  optional 0–100 upload-progress callback
 */
export async function uploadToCloudinaryDirect(
  file: File,
  uploadType: UploadType,
  onProgress?: (pct: number) => void,
): Promise<DirectUploadResult> {
  // 1. Ask our server to sign the upload (tiny request, no file).
  const signRes = await fetch("/api/admin/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: uploadType }),
  });
  if (!signRes.ok) {
    const j = await signRes.json().catch(() => ({}));
    throw new Error(j.error ?? "Could not authorize upload");
  }
  const sign = await signRes.json();

  // 2. POST the file directly to Cloudinary with the signed params.
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sign.apiKey);
  fd.append("timestamp", String(sign.timestamp));
  fd.append("signature", sign.signature);
  fd.append("folder", sign.folder);
  fd.append("transformation", sign.transformation);

  const endpoint = `https://api.cloudinary.com/v1_1/${sign.cloudName}/${sign.resourceType}/upload`;

  return new Promise<DirectUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Upload failed"));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          url: json.secure_url as string,
          publicId: json.public_id as string,
          bytes: json.bytes as number,
          format: json.format as string | undefined,
          width: json.width as number | undefined,
          height: json.height as number | undefined,
        });
      } else {
        const err = json.error as { message?: string } | undefined;
        reject(new Error(err?.message ?? "Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(fd);
  });
}
