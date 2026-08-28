"use client";

import { useRef, useState } from "react";
import { Upload, X, Video, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { uploadToCloudinaryDirect } from "@/lib/upload-client";
import type { UploadType } from "@/lib/cloudinary";

interface Props {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  uploadType?: UploadType;
  maxSizeMB?: number;
}

export default function VideoUploadField({
  value,
  onChange,
  label,
  hint,
  uploadType = "branding-video",
  maxSizeMB = 100,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (file: File) => {
    if (!file) return;
    // Client-side size guard — server compresses on upload.
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Video too large. Max ${maxSizeMB} MB allowed.`);
      return;
    }
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const { url } = await uploadToCloudinaryDirect(
        file,
        uploadType,
        setProgress,
      );
      onChange(url);
      toast.success("Video uploaded successfully");
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-base-content/70">
          {label}
        </span>
      )}

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
          ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-base-300/60 hover:border-primary/40 hover:bg-base-200/50"}
          ${uploading ? "pointer-events-none" : ""}
        `}
      >
        {value ? (
          /* Video preview */
          <div className="relative group h-44 bg-black">
            <video
              src={value}
              className="w-full h-full object-cover opacity-80"
              muted
              playsInline
              preload="metadata"
            />
            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <PlayCircle className="w-10 h-10 text-white/40" />
            </div>
            {/* Hover actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-base-100/90 text-xs font-medium hover:bg-white transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Replace
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-error/80 text-white text-xs font-medium hover:bg-error transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
            {/* Upload progress overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-base-100/80 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
                <div className="w-40 bg-base-300 rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-base-content/50">{progress}%</p>
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="h-32 flex flex-col items-center justify-center gap-2 px-4">
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <div className="w-40 bg-base-300 rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-base-content/50">
                  Uploading… {progress}%
                </p>
              </div>
            ) : (
              <>
                <div className="w-11 h-11 rounded-xl bg-base-200 flex items-center justify-center">
                  <Video className="w-5 h-5 text-base-content/30" />
                </div>
                <p className="text-xs text-base-content/40 text-center">
                  <span className="text-primary font-medium">
                    Click to upload
                  </span>{" "}
                  or drag & drop
                </p>
                {hint && (
                  <p className="text-[11px] text-base-content/30">{hint}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* URL fallback — shows current URL if it was set manually */}
      {value && (
        <p className="text-[10px] text-base-content/30 truncate px-1">
          {value}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/*"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}
