"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { UploadType } from "@/lib/cloudinary";
import { uploadToCloudinaryDirect } from "@/lib/upload-client";

interface Props {
  value?: string;
  onChange: (url: string) => void;
  uploadType: UploadType;
  label?: string;
  accept?: string;
  hint?: string;
}

export default function ImageUploadField({
  value,
  onChange,
  uploadType,
  label,
  accept = "image/*",
  hint,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadToCloudinaryDirect(file, uploadType);
      onChange(url);
      toast.success("Uploaded successfully");
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-uploaded
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

      {/* Drop zone / preview */}
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
          ${uploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        {value ? (
          /* Image preview */
          <div className="relative group h-36">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="w-9 h-9 rounded-xl bg-base-100/90 flex items-center justify-center hover:bg-white transition-colors"
              >
                <Upload className="w-4 h-4 text-base-content" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="w-9 h-9 rounded-xl bg-error/80 flex items-center justify-center hover:bg-error transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-base-100/70 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="h-28 flex flex-col items-center justify-center gap-2 px-4">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-base-content/30" />
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

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}
