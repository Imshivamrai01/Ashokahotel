"use client";

import { forwardRef, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { motion, AnimatePresence } from "framer-motion";
import { Printer, X } from "lucide-react";
import { format } from "date-fns";
import type { IOrder } from "@/types";

export interface ReceiptData {
  tableLabel: string;
  kots: IOrder[];
}

export interface TableReceiptContentProps {
  data: ReceiptData;
  hotelName?: string;
  gstNumber?: string;
  logoUrl?: string;
  discountOverride?: number;
  taxOverride?: number;
  totalOverride?: number;
  paymentMethodOverride?: string;
  isSettledOverride?: boolean;
  customerName?: string;
  customerPhone?: string;
}

/** Printable combined receipt for a whole table (all KOTs). 80mm thermal style. */
export const TableReceiptContent = forwardRef<HTMLDivElement, TableReceiptContentProps>(function TableReceiptContent(
  {
    data,
    hotelName = "Ashoka Hotel",
    gstNumber,
    logoUrl,
    discountOverride,
    taxOverride,
    totalOverride,
    paymentMethodOverride,
    isSettledOverride,
    customerName,
    customerPhone,
  },
  ref,
) {
  const safeKots = data?.kots ?? [];
  const tableLabel = data?.tableLabel ?? "Table";
  const items = safeKots.flatMap((k) =>
    (k.items ?? []).filter((i) => i.itemStatus !== "cancelled"),
  );
  const subtotal = safeKots.reduce((s, k) => s + (k.subtotal ?? 0), 0);
  const discount =
    discountOverride !== undefined
      ? discountOverride
      : safeKots.reduce((s, k) => s + (k.discountAmount ?? 0), 0);
  const tax =
    taxOverride !== undefined
      ? taxOverride
      : safeKots.reduce((s, k) => s + (k.tax ?? 0), 0);
  const total =
    totalOverride !== undefined
      ? totalOverride
      : safeKots.reduce((s, k) => s + (k.total ?? 0), 0);
  const isSettled =
    isSettledOverride !== undefined
      ? isSettledOverride
      : safeKots.length > 0 &&
        safeKots.every((k) => ["paid", "cleared"].includes(k.status));
  const paymentMethod =
    paymentMethodOverride || safeKots.find((k) => k.paymentMethod)?.paymentMethod;
  const custName =
    customerName || safeKots.find((k) => k.customerName)?.customerName;
  const custPhone =
    customerPhone || safeKots.find((k) => k.customerPhone)?.customerPhone;

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "12px",
        lineHeight: 1.4,
        padding: "8mm",
        maxWidth: "80mm",
        color: "#000",
        background: "#fff",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={hotelName}
            style={{
              display: "block",
              maxWidth: "40mm",
              maxHeight: "18mm",
              margin: "0 auto 4px",
              objectFit: "contain",
              filter: "grayscale(1) contrast(1.1)",
            }}
          />
        )}
        <div style={{ fontSize: 16, fontWeight: "bold", letterSpacing: 1 }}>
          {hotelName.toUpperCase()}
        </div>
        <div style={{ fontSize: 12, fontWeight: "bold", marginTop: 2 }}>
          {isSettled ? "TAX INVOICE" : "TABLE BILL / ESTIMATE"}
        </div>
        <div style={{ fontSize: 10, fontWeight: "bold", color: isSettled ? "#000" : "#555" }}>
          {isSettled ? "[ STATUS: PAID ✅ ]" : "[ STATUS: PENDING ]"}
        </div>
        {gstNumber && <div style={{ fontSize: 10 }}>GSTIN: {gstNumber}</div>}
        <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
      </div>

      <table style={{ width: "100%", fontSize: 11 }}>
        <tbody>
          <tr>
            <td>Table:</td>
            <td style={{ textAlign: "right" }}>{tableLabel}</td>
          </tr>
          <tr>
            <td>Date:</td>
            <td style={{ textAlign: "right" }}>
              {format(new Date(), "dd MMM yyyy  HH:mm")}
            </td>
          </tr>
          {safeKots.some((k) => k.kotNumber) && (
            <tr>
              <td>KOTs:</td>
              <td style={{ textAlign: "right" }}>
                {safeKots
                  .map((k) => k.kotNumber)
                  .filter(Boolean)
                  .join(", ")}
              </td>
            </tr>
          )}
          {custName && (
            <tr>
              <td>Customer:</td>
              <td style={{ textAlign: "right" }}>{custName}</td>
            </tr>
          )}
          {custPhone && (
            <tr>
              <td>Phone:</td>
              <td style={{ textAlign: "right" }}>{custPhone}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />

      <table style={{ width: "100%", fontSize: 11 }}>
        <thead>
          <tr>
            <td style={{ fontWeight: "bold" }}>QTY</td>
            <td style={{ fontWeight: "bold" }}>ITEM</td>
            <td style={{ fontWeight: "bold", textAlign: "right" }}>AMT</td>
          </tr>
          <tr>
            <td colSpan={3}>
              <div style={{ borderTop: "1px solid #000" }} />
            </td>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              <td style={{ verticalAlign: "top", paddingRight: 4 }}>
                {item.quantity}
              </td>
              <td style={{ verticalAlign: "top" }}>
                {item.name}
                {item.variationName && ` (${item.variationName})`}
                {item.isNC && " (NC)"}
              </td>
              <td style={{ textAlign: "right", verticalAlign: "top" }}>
                {item.isNC
                  ? "FREE"
                  : `₹${(item.price * item.quantity).toFixed(0)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />

      <table style={{ width: "100%", fontSize: 11 }}>
        <tbody>
          <tr>
            <td>Subtotal</td>
            <td style={{ textAlign: "right" }}>₹{subtotal.toFixed(2)}</td>
          </tr>
          {discount > 0 && (
            <tr>
              <td>Discount</td>
              <td style={{ textAlign: "right" }}>− ₹{discount.toFixed(2)}</td>
            </tr>
          )}
          {tax > 0 && (
            <>
              <tr>
                <td>CGST</td>
                <td style={{ textAlign: "right" }}>₹{(tax / 2).toFixed(2)}</td>
              </tr>
              <tr>
                <td>SGST</td>
                <td style={{ textAlign: "right" }}>₹{(tax / 2).toFixed(2)}</td>
              </tr>
            </>
          )}
          <tr>
            <td style={{ fontWeight: "bold", fontSize: 13 }}>TOTAL</td>
            <td style={{ textAlign: "right", fontWeight: "bold", fontSize: 13 }}>
              ₹{total.toFixed(2)}
            </td>
          </tr>
          {isSettled && paymentMethod && (
            <tr>
              <td style={{ fontSize: 11, fontWeight: "bold" }}>PAYMENT MODE</td>
              <td style={{ textAlign: "right", fontSize: 11, fontWeight: "bold" }}>
                {paymentMethod.replace("_", " ").toUpperCase()}
              </td>
            </tr>
          )}
          {!isSettled && (
            <tr>
              <td style={{ fontSize: 10, color: "#666" }}>PAYMENT STATUS</td>
              <td style={{ textAlign: "right", fontSize: 10, color: "#666", fontWeight: "bold" }}>
                PENDING
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />
      <div style={{ textAlign: "center", fontSize: 10, marginTop: 4 }}>
        Thank you for dining with us!
      </div>
    </div>
  );
});

/**
 * "Print Bill" button + preview modal for a customer Tax Invoice (one order or a
 * whole table). This is the customer bill (GST CGST/SGST) — NOT the kitchen KOT.
 */
export function BillPrintButton({
  data,
  hotelName,
  gstNumber,
  logoUrl,
  label = "Bill",
  className = "bg-sky-500 hover:bg-sky-400 text-black font-extrabold shadow border-none rounded-xl",
}: {
  data: ReceiptData;
  hotelName?: string;
  gstNumber?: string;
  logoUrl?: string;
  label?: string;
  className?: string;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bill-${data?.tableLabel ?? "Table"}`,
    pageStyle: `@page { size: 80mm auto; margin: 0; } @media print { body { margin: 0; } }`,
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`btn btn-sm gap-1.5 transition-all ${className}`}
        title="Print customer bill"
      >
        <Printer className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </button>

      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <TableReceiptContent
          ref={printRef}
          data={data}
          hotelName={hotelName}
          gstNumber={gstNumber}
          logoUrl={logoUrl}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                <h3 className="font-bold flex items-center gap-2">
                  <Printer className="w-4 h-4 text-success" /> Customer Bill
                </h3>
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => setOpen(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh] flex justify-center bg-white p-4">
                <TableReceiptContent
                  data={data}
                  hotelName={hotelName}
                  gstNumber={gstNumber}
                  logoUrl={logoUrl}
                />
              </div>
              <div className="flex gap-2 p-3 border-t border-base-300 bg-base-200/50">
                <button
                  className="btn btn-ghost btn-sm flex-1"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success btn-sm flex-1 gap-2"
                  onClick={() => {
                    handlePrint();
                    setOpen(false);
                  }}
                >
                  <Printer className="w-4 h-4" /> Print Bill
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
