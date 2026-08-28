"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BrandingSchema } from "@/lib/validations";
import PageHeader from "@/components/PageHeader";
import { FormField, inputCls, textareaCls } from "@/components/admin/FormField";
import ImageUploadField from "@/components/admin/ImageUploadField";
import VideoUploadField from "@/components/admin/VideoUploadField";
import {
  Settings,
  Save,
  Store,
  Palette,
  Image as ImageIcon,
  Phone,
  Percent,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";

type BrandingInput = z.infer<typeof BrandingSchema>;

// Curated premium palettes — one-tap brand themes (primary + deep accent).
const COLOR_THEMES: { name: string; primary: string; accent: string }[] = [
  { name: "Royal Gold", primary: "#C9A96E", accent: "#1A1A2E" },
  { name: "Saffron", primary: "#E2571E", accent: "#241109" },
  { name: "Emerald", primary: "#128C7E", accent: "#06231F" },
  { name: "Bordeaux", primary: "#8E2D3F", accent: "#26090E" },
  { name: "Mocha", primary: "#A9744F", accent: "#1F1610" },
  { name: "Midnight Gold", primary: "#D4AF37", accent: "#0A0A0F" },
  { name: "Rosé", primary: "#D9587E", accent: "#2A0E18" },
  { name: "Ocean", primary: "#2C7DA0", accent: "#0A1E2A" },
];

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-base-200 border border-base-300/60 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-base-300/40 bg-base-300/20">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">{title}</h2>
          <p className="text-xs text-base-content/40">{description}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function BrandingPage() {
  const qc = useQueryClient();
  const { data: branding, isLoading } = useQuery<
    BrandingInput & { managerPinSet?: boolean }
  >({
    queryKey: ["admin-branding"],
    queryFn: () =>
      fetch("/api/admin/branding")
        .then((r) => r.json())
        .then((b) => ({
          ...b,
          // Ensure the rate input is never blank (blank → "not saved" bug).
          gstRatePercent: b?.gstRatePercent ?? 5,
        })),
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BrandingInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(BrandingSchema) as any,
    values: branding,
  });

  const watchedName = useWatch({ control, name: "hotelName" });
  const watchedTagline = useWatch({ control, name: "tagline" });
  const watchedPrimary = useWatch({ control, name: "primaryColor" });
  const watchedLogo = useWatch({ control, name: "logoUrl" });
  const watchedCoverImage = useWatch({ control, name: "coverImageUrl" });
  const watchedCoverVideo = useWatch({ control, name: "coverVideoUrl" });

  const saveMutation = useMutation({
    mutationFn: async (data: BrandingInput) => {
      const res = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Branding saved successfully!");
      qc.invalidateQueries({ queryKey: ["admin-branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-24">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );

  const isPending = isSubmitting || saveMutation.isPending;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Branding & Settings"
        subtitle="Business identity, colors and contact info"
        icon={Settings}
      />

      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
        <div className="flex flex-col gap-4">
          {/* Live Preview Card */}
          <div
            className="rounded-2xl border border-base-300/60 p-5 flex items-center gap-5 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${watchedPrimary ?? "#C9A96E"}22, ${watchedPrimary ?? "#C9A96E"}06)`,
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 shadow-lg"
              style={{ background: watchedPrimary ?? "#C9A96E", color: "#fff" }}
            >
              {(watchedName ?? "T").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-base">
                {watchedName || "Your Business Name"}
              </p>
              <p className="text-xs text-base-content/50 mt-0.5">
                {watchedTagline || "Your tagline appears here"}
              </p>
            </div>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-30">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Live Preview</span>
            </div>
          </div>

          {/* Identity */}
          <SectionCard
            icon={Store}
            title="Business Identity"
            description="Core info shown on menu and receipts"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Business Name"
                required
                error={
                  errors.hotelName
                    ? String(errors.hotelName.message)
                    : undefined
                }
                className="sm:col-span-2"
              >
                <input
                  {...register("hotelName")}
                  className={inputCls(!!errors.hotelName)}
                  placeholder="Ashoka Hotel"
                />
              </FormField>
              <FormField label="Tagline">
                <input
                  {...register("tagline")}
                  className={inputCls()}
                  placeholder="A Royal Experience"
                />
              </FormField>
              <ImageUploadField
                label="Business Logo"
                value={watchedLogo ?? ""}
                onChange={(url) =>
                  setValue("logoUrl", url, { shouldDirty: true })
                }
                uploadType="branding-logo"
                hint="Auto-compressed on upload · PNG or SVG preferred"
              />
            </div>
          </SectionCard>

          {/* Colors */}
          <SectionCard
            icon={Palette}
            title="Brand Colors"
            description="Applied throughout the guest-facing menu"
          >
            {/* Quick themes — one tap applies a premium palette */}
            <div className="mb-5">
              <p className="text-xs font-medium text-base-content/50 mb-2">
                Quick themes — tap to apply
              </p>
              <div className="flex flex-wrap gap-2">
                {COLOR_THEMES.map((t) => {
                  const active =
                    watchedPrimary?.toLowerCase() === t.primary.toLowerCase();
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => {
                        setValue("primaryColor", t.primary, {
                          shouldDirty: true,
                        });
                        setValue("accentColor", t.accent, {
                          shouldDirty: true,
                        });
                      }}
                      className={`group flex items-center gap-2 rounded-full border pl-1.5 pr-3 py-1 transition-colors ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-base-300 hover:border-primary/60 hover:bg-base-300/40"
                      }`}
                      title={`${t.primary} · ${t.accent}`}
                    >
                      <span className="flex -space-x-1.5">
                        <span
                          className="w-5 h-5 rounded-full border border-base-100 shadow-sm"
                          style={{ backgroundColor: t.primary }}
                        />
                        <span
                          className="w-5 h-5 rounded-full border border-base-100 shadow-sm"
                          style={{ backgroundColor: t.accent }}
                        />
                      </span>
                      <span className="text-xs font-medium">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Primary Color"
                error={errors.primaryColor ? "Use a 6-digit hex like #C9A96E" : undefined}
              >
                <div className="flex gap-2.5 items-center">
                  <input
                    {...register("primaryColor")}
                    type="color"
                    className="w-11 h-11 rounded-xl cursor-pointer bg-base-100 border border-base-300 p-1 shrink-0"
                  />
                  <input
                    {...register("primaryColor")}
                    className={inputCls() + " flex-1 font-mono"}
                    placeholder="#C9A96E"
                  />
                </div>
              </FormField>
              <FormField
                label="Accent Color"
                error={errors.accentColor ? "Use a 6-digit hex like #1A1A2E" : undefined}
              >
                <div className="flex gap-2.5 items-center">
                  <input
                    {...register("accentColor")}
                    type="color"
                    className="w-11 h-11 rounded-xl cursor-pointer bg-base-100 border border-base-300 p-1 shrink-0"
                  />
                  <input
                    {...register("accentColor")}
                    className={inputCls() + " flex-1 font-mono"}
                    placeholder="#1A1A2E"
                  />
                </div>
              </FormField>
            </div>
          </SectionCard>

          {/* Media */}
          <SectionCard
            icon={ImageIcon}
            title="Cover Media"
            description="Hero image and/or video shown on the menu landing screen"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <ImageUploadField
                  label="Cover Image"
                  value={watchedCoverImage ?? ""}
                  onChange={(url) =>
                    setValue("coverImageUrl", url, { shouldDirty: true })
                  }
                  uploadType="branding-cover"
                  hint="Auto-compressed on upload · Landscape 16:9 recommended"
                />
                <p className="text-[11px] text-base-content/40 px-1">
                  Shown as a static fallback if no video is set, or on older
                  devices.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <VideoUploadField
                  label="Cover Video"
                  value={watchedCoverVideo ?? ""}
                  onChange={(url) =>
                    setValue("coverVideoUrl", url, { shouldDirty: true })
                  }
                  hint="Auto-compressed on upload · MP4 recommended · Plays muted on loop"
                />
                <p className="text-[11px] text-base-content/40 px-1">
                  Autoplays muted & looped on the menu cover. Takes priority
                  over the image.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Contact */}
          <SectionCard
            icon={Phone}
            title="Contact Details"
            description="Displayed on receipts and used for WhatsApp room orders"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="WhatsApp Number"
                hint="10-digit mobile number (India +91)"
                required
                error={
                  errors.whatsappNumber
                    ? String(errors.whatsappNumber.message)
                    : undefined
                }
                className="sm:col-span-2"
              >
                <div className="flex rounded-xl overflow-hidden border border-base-300 bg-base-100 focus-within:border-primary">
                  <span className="bg-base-200 px-3 py-2 text-xs font-bold text-base-content/60 flex items-center border-r border-base-300">
                    🇮🇳 +91
                  </span>
                  <input
                    {...register("whatsappNumber")}
                    className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
                    placeholder="9876543210"
                  />
                </div>
              </FormField>

              <FormField label="Phone / Mobile Number" hint="Calling number">
                <div className="flex rounded-xl overflow-hidden border border-base-300 bg-base-100 focus-within:border-primary">
                  <span className="bg-base-200 px-3 py-2 text-xs font-bold text-base-content/60 flex items-center border-r border-base-300">
                    🇮🇳 +91
                  </span>
                  <input
                    {...register("phone")}
                    className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
                    placeholder="9876543210"
                  />
                </div>
              </FormField>
              <FormField label="Email">
                <input
                  {...register("email")}
                  type="email"
                  className={inputCls()}
                />
              </FormField>
              <FormField label="Address" className="sm:col-span-2">
                <textarea
                  {...register("address")}
                  className={textareaCls}
                  rows={2}
                />
              </FormField>
            </div>
          </SectionCard>

          {/* Tax / GST */}
          <SectionCard
            icon={Percent}
            title="Tax / GST"
            description="Adds one GST rate to the whole bill (CGST + SGST)"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="GSTIN">
                <input
                  {...register("gstNumber")}
                  className={inputCls()}
                  placeholder="22AAAAA0000A1Z5"
                />
              </FormField>
              <FormField label="GST rate % (whole bill)">
                <input
                  {...register("gstRatePercent", {
                    setValueAs: (v) =>
                      v === "" || v === null || v === undefined ? 5 : Number(v),
                  })}
                  type="number"
                  step="0.5"
                  min={0}
                  max={100}
                  className={inputCls()}
                  placeholder="5"
                />
              </FormField>
              <div className="flex flex-col gap-2 justify-center">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    {...register("gstEnabled")}
                  />
                  Charge GST on bills
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    {...register("pricesIncludeTax")}
                  />
                  Menu prices already include GST
                </label>
              </div>
            </div>
          </SectionCard>

          {/* Discounts */}
          <SectionCard
            icon={Percent}
            title="Bill Discounts"
            description="Limits + manager PIN for cashier / admin discounts"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Max discount % (hard cap)">
                <input
                  {...register("maxDiscountPercent", {
                    setValueAs: (v) =>
                      v === "" || v === null || v === undefined ? 20 : Number(v),
                  })}
                  type="number"
                  min={0}
                  max={100}
                  step="1"
                  className={inputCls()}
                  placeholder="20"
                />
              </FormField>
              <FormField label="Manager PIN needed above %">
                <input
                  {...register("discountApprovalThresholdPercent", {
                    setValueAs: (v) =>
                      v === "" || v === null || v === undefined ? 10 : Number(v),
                  })}
                  type="number"
                  min={0}
                  max={100}
                  step="1"
                  className={inputCls()}
                  placeholder="10"
                />
              </FormField>
              <FormField
                label={
                  branding?.managerPinSet
                    ? "Change manager PIN (a PIN is set)"
                    : "Set manager PIN (4–6 digits)"
                }
                error={
                  errors.managerPin ? "PIN must be 4–6 digits" : undefined
                }
              >
                <input
                  {...register("managerPin")}
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  className={inputCls()}
                  placeholder={branding?.managerPinSet ? "••••" : "e.g. 1234"}
                />
              </FormField>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    {...register("discountRequiresReason")}
                  />
                  Require a reason for every discount
                </label>
              </div>
            </div>
          </SectionCard>

          {/* Sticky footer */}
          <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-base-100/80 backdrop-blur-md border-t border-base-300/40 flex items-center justify-between">
            <p className="text-xs text-base-content/40">
              {isDirty ? "You have unsaved changes" : "All changes saved"}
            </p>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary rounded-xl gap-2 min-w-36"
            >
              {isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
