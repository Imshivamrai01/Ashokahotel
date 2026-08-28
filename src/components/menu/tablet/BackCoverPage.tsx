"use client";

import Image from "next/image";
import { Phone, MessageCircle } from "lucide-react";
import type { IBranding, ILocation } from "@/types";

interface Props {
  branding: IBranding | null;
  location: ILocation | null;
  width: number;
  height: number;
}

function formatDisplayNumber(raw?: string): string {
  if (!raw) return "";
  const cleaned = raw.trim();
  const digits = cleaned.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (cleaned.startsWith("+91")) {
    const after = cleaned.slice(3).trim();
    if (after.length === 10) {
      return `+91 ${after.slice(0, 5)} ${after.slice(5)}`;
    }
    return cleaned;
  }
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  return `+91 ${cleaned}`;
}

function getTelHref(raw?: string): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return `tel:+${digits}`;
}

function getWhatsAppHref(raw?: string): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}`;
}

export default function BackCoverPage({
  branding,
  location,
  width,
  height,
}: Props) {
  const qrUrl = location
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
        `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/menu?type=${location.type}&location=${location.code}`,
      )}`
    : null;

  const phoneValue = branding?.phone || branding?.callNumber;
  const whatsappValue = branding?.whatsappNumber;

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden p-6 select-none"
      style={{
        width,
        height,
        background:
          "linear-gradient(160deg, #FFFDF9 0%, #FAF6F0 50%, #F5EFEB 100%)",
      }}
    >
      {/* Decorative Inset Frame */}
      <div className="absolute inset-4 rounded-2xl border border-amber-800/15 pointer-events-none" />
      <div className="absolute inset-5 rounded-xl border border-amber-800/10 pointer-events-none" />

      <div className="relative z-10 text-center px-8 flex flex-col items-center gap-4">
        <div className="w-16 h-0.5 bg-amber-500/40" />

        <div className="p-1.5 rounded-full bg-white border-2 border-amber-400 shadow-md">
          <Image
            src={branding?.logoUrl || "/tajlogo.png"}
            alt="logo"
            width={70}
            height={70}
            className="rounded-full object-cover"
          />
        </div>

        <div>
          <h2 className="font-playfair text-slate-900 text-2xl font-black tracking-widest uppercase">
            {branding?.restaurantName ?? "Ashoka Hotel"}
          </h2>
          {branding?.tagline && (
            <p className="text-amber-800 text-xs tracking-widest font-semibold italic mt-1">
              {branding.tagline}
            </p>
          )}
        </div>

        {/* Contact info */}
        <div className="flex flex-col gap-2.5 text-xs font-bold text-slate-800 w-full max-w-xs">
          {phoneValue && (
            <a
              href={getTelHref(phoneValue)}
              className="inline-flex items-center gap-2.5 justify-center bg-white border border-slate-200 hover:border-amber-400 px-4 py-2.5 rounded-full shadow-xs transition-all hover:scale-[1.02] active:scale-95"
            >
              <Phone className="w-4 h-4 text-amber-600" />
              <span className="text-slate-800 font-bold tracking-wide">
                {formatDisplayNumber(phoneValue)}
              </span>
            </a>
          )}

          {whatsappValue && (
            <a
              href={getWhatsAppHref(whatsappValue)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 justify-center bg-emerald-50 border border-emerald-200 hover:border-emerald-400 text-emerald-800 px-4 py-2.5 rounded-full shadow-xs transition-all hover:scale-[1.02] active:scale-95"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span className="font-bold tracking-wide">
                {formatDisplayNumber(whatsappValue)}
              </span>
            </a>
          )}
        </div>

        {/* QR Code */}
        {qrUrl && (
          <div className="flex flex-col items-center gap-1.5 mt-2">
            <div className="p-2 bg-white rounded-2xl border-2 border-amber-300 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR Code"
                width={95}
                height={95}
                className="rounded-lg"
              />
            </div>
            <p className="text-slate-500 font-bold text-[11px] tracking-wider uppercase">
              Scan to open digital menu
            </p>
          </div>
        )}

        <div className="w-16 h-0.5 bg-amber-500/40 mt-1" />
      </div>

      <div className="absolute top-6 left-6 text-amber-700/20 text-2xl select-none">✦</div>
      <div className="absolute bottom-6 right-6 text-amber-700/20 text-2xl select-none">✦</div>
    </div>
  );
}
