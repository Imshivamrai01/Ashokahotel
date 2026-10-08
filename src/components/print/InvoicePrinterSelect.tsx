"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { toast } from "sonner";

interface StationPrinter {
  id: string;
  name: string;
  transport: "usb" | "tcp" | "bt";
  address: string;
  usable: boolean;
}

interface StationData {
  printers: StationPrinter[];
  billPrinterId: string;
  agentOnline: boolean;
}

const TRANSPORT_LABEL = { usb: "USB", tcp: "WiFi/LAN", bt: "Bluetooth" } as const;

async function fetchStation(): Promise<StationData> {
  const res = await fetch("/api/orders/printers", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load printers");
  return res.json();
}

/**
 * Picks which connected thermal printer prints customer invoices. KOTs always go
 * to every working printer; this only decides where the bill comes out.
 */
export default function InvoicePrinterSelect({ className = "" }: { className?: string }) {
  const qc = useQueryClient();
  const { data, isError } = useQuery<StationData>({
    queryKey: ["print-station"],
    queryFn: fetchStation,
    refetchInterval: 20_000,
  });

  const save = useMutation({
    mutationFn: async (billPrinterId: string) => {
      const res = await fetch("/api/orders/printers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billPrinterId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not save");
      return billPrinterId;
    },
    onSuccess: (id) => {
      const name = data?.printers.find((p) => p.id === id)?.name;
      toast.success(name ? `Invoices will print on ${name}` : "Invoice printer set to automatic");
      qc.invalidateQueries({ queryKey: ["print-station"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const printers = data?.printers ?? [];
  const usableCount = printers.filter((p) => p.usable).length;
  const hint = isError
    ? "Could not load printers"
    : !data
      ? "Loading printers…"
      : !data.agentOnline
        ? "Printer app is not running on the PC"
        : `${usableCount} printer${usableCount === 1 ? "" : "s"} connected · KOT prints on all`;

  return (
    <label
      className={`flex items-center gap-2 text-xs ${className}`}
      title={hint}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full shrink-0 ${
          data?.agentOnline ? "bg-emerald-500" : "bg-red-500"
        }`}
        aria-hidden
      />
      <Printer className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden />
      <span className="font-bold whitespace-nowrap">Invoice printer</span>
      <select
        className="rounded-lg border border-slate-300 bg-white text-slate-900 px-2 py-1.5 text-xs font-semibold max-w-[220px] cursor-pointer disabled:opacity-60"
        value={data?.billPrinterId ?? ""}
        disabled={!data || save.isPending}
        onChange={(e) => save.mutate(e.target.value)}
        aria-label="Invoice printer"
      >
        <option value="">Automatic (first printer)</option>
        {data?.billPrinterId && !printers.some((p) => p.id === data.billPrinterId) && (
          <option value={data.billPrinterId}>Selected printer (not connected)</option>
        )}
        {printers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {TRANSPORT_LABEL[p.transport]}
            {p.usable ? "" : " (offline)"}
          </option>
        ))}
      </select>
    </label>
  );
}
