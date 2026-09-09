"use client";

import { useRef, useState, Fragment } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, X } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import type { IOrder } from "@/types";

interface Props {
  order: IOrder;
  hotelName?: string;
  gstNumber?: string;
}

function BillContent({
  order,
  hotelName = "Ashoka Hotel",
  gstNumber,
}: Props) {
  return (
    <div
      style={{
        fontFamily:
          "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, monospace, sans-serif",
        fontSize: "12.5px",
        fontWeight: 700,
        lineHeight: "1.35",
        padding: "6mm 8mm",
        maxWidth: "80mm",
        color: "#000000",
        background: "#ffffff",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div
          style={{ fontSize: "16px", fontWeight: 900, letterSpacing: "1px", color: "#000000" }}
        >
          {hotelName.toUpperCase()}
        </div>
        <div style={{ fontSize: "12px", fontWeight: 900, marginTop: "2px", color: "#000000" }}>
          Kitchen Order Ticket
        </div>
        {gstNumber && (
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#000000" }}>
            GSTIN: {gstNumber}
          </div>
        )}
        <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }} />
      </div>

      {/* KOT meta */}
      <table style={{ width: "100%", fontSize: "12px", fontWeight: 700, color: "#000000", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: 900, padding: "1px 0" }}>KOT #:</td>
            <td style={{ textAlign: "right", fontWeight: 900, fontSize: "13px", padding: "1px 0" }}>
              {order.kotNumber}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "1px 0" }}>Date:</td>
            <td style={{ textAlign: "right", padding: "1px 0" }}>
              {format(new Date(order.createdAt), "dd MMM yyyy  HH:mm")}
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: 800, padding: "1px 0" }}>Table:</td>
            <td style={{ textAlign: "right", fontWeight: 900, padding: "1px 0" }}>
              {order.tableLabel}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "1px 0" }}>Captain:</td>
            <td style={{ textAlign: "right", fontWeight: 800, padding: "1px 0" }}>
              {order.captainName}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }} />

      {/* Items */}
      <table style={{ width: "100%", fontSize: "12px", color: "#000000", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ fontWeight: 900 }}>
            <td style={{ fontWeight: 900, width: "16%", paddingBottom: 2 }}>QTY</td>
            <td style={{ fontWeight: 900, paddingBottom: 2 }}>ITEM</td>
            <td style={{ fontWeight: 900, textAlign: "right", width: "24%", paddingBottom: 2 }}>
              AMT
            </td>
          </tr>
          <tr>
            <td colSpan={3}>
              <div style={{ borderTop: "2px solid #000000", margin: "2px 0 4px" }} />
            </td>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <Fragment key={item._id ? String(item._id) : `item-${idx}`}>
              <tr style={{ fontWeight: 700 }}>
                <td style={{ verticalAlign: "top", paddingRight: "4px", fontWeight: 900, fontSize: "13px", paddingTop: 2, paddingBottom: 2 }}>
                  {item.quantity}
                </td>
                <td style={{ verticalAlign: "top", fontWeight: 800, fontSize: "12.5px", paddingTop: 2, paddingBottom: 2 }}>
                  {item.name}
                  {item.variationName && ` (${item.variationName})`}
                  {item.isNC && " (NC)"}
                  {item.addons && item.addons.length > 0 && (
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#000000", marginTop: 1 }}>
                      + {item.addons.map((a) => a.name).join(", ")}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: "right", verticalAlign: "top", fontWeight: 900, fontSize: "13px", paddingTop: 2, paddingBottom: 2, whiteSpace: "nowrap" }}>
                  {item.isNC
                    ? "FREE"
                    : `₹${(item.price * item.quantity).toFixed(0)}`}
                </td>
              </tr>
              {item.notes && (
                <tr>
                  <td />
                  <td
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#000000",
                      fontStyle: "italic",
                      paddingLeft: "4px",
                    }}
                  >
                    * {item.notes}
                  </td>
                  <td />
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }} />

      {/* Totals */}
      <table style={{ width: "100%", fontSize: "12px", fontWeight: 700, color: "#000000", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ padding: "1px 0" }}>Subtotal</td>
            <td style={{ textAlign: "right", fontWeight: 800, padding: "1px 0" }}>
              ₹{order.subtotal.toFixed(2)}
            </td>
          </tr>
          {order.tax != null && order.tax > 0 && (
            <>
              <tr>
                <td style={{ padding: "1px 0" }}>CGST</td>
                <td style={{ textAlign: "right", fontWeight: 800, padding: "1px 0" }}>
                  ₹{(order.tax / 2).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0" }}>SGST</td>
                <td style={{ textAlign: "right", fontWeight: 800, padding: "1px 0" }}>
                  ₹{(order.tax / 2).toFixed(2)}
                </td>
              </tr>
            </>
          )}
          <tr>
            <td style={{ fontWeight: 900, fontSize: "15px", paddingTop: 4, paddingBottom: 4, borderTop: "1.5px solid #000000" }}>
              TOTAL
            </td>
            <td
              style={{
                textAlign: "right",
                fontWeight: 900,
                fontSize: "15px",
                paddingTop: 4,
                paddingBottom: 4,
                borderTop: "1.5px solid #000000",
              }}
            >
              ₹{order.total.toFixed(2)}
            </td>
          </tr>
          {order.paymentMethod && (
            <tr>
              <td style={{ fontSize: "11.5px", fontWeight: 900, paddingTop: 2 }}>Payment</td>
              <td style={{ textAlign: "right", fontSize: "11.5px", fontWeight: 900, paddingTop: 2 }}>
                {order.paymentMethod.replace("_", " ").toUpperCase()}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Special instructions */}
      {order.specialInstructions && (
        <>
          <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }} />
          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#000000" }}>
            <strong>Special:</strong> {order.specialInstructions}
          </div>
        </>
      )}

      <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }} />

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: "11px", fontWeight: 800, marginTop: "4px", color: "#000000" }}>
        <div>Thank you for dining with us!</div>
        <div
          style={{
            marginTop: "8px",
            borderTop: "1.5px dashed #000000",
            paddingTop: "4px",
          }}
        >
          ✂ - - - - - - - - - - - - - - - -
        </div>
      </div>
    </div>
  );
}

// Make BillContent importable for preview use
export { BillContent };

export default function KOTBillPrint({ order, hotelName, gstNumber }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `KOT-${order.kotNumber}`,
    pageStyle: `
      @page { size: 80mm auto; margin: 0; }
      @media print { body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } * { color: #000000 !important; } }
    `,
  });

  return (
    <>
      <button
        onClick={() => setPreviewOpen(true)}
        className="btn btn-ghost btn-sm gap-1.5"
        title="Print KOT / Bill"
      >
        <Printer className="w-4 h-4" />
        Print
      </button>

      {/* Hidden print content */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={printRef}>
          <BillContent order={order} hotelName={hotelName} gstNumber={gstNumber} />
        </div>
      </div>

      {/* Print Preview Modal */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 260 }}
              className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                <h3 className="font-bold flex items-center gap-2">
                  <Printer className="w-4 h-4 text-success" />
                  Receipt Preview
                </h3>
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => setPreviewOpen(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview content */}
              <div
                ref={contentRef}
                className="overflow-y-auto max-h-[60vh] flex justify-center bg-white p-4"
              >
                <BillContent order={order} hotelName={hotelName} gstNumber={gstNumber} />
              </div>

              {/* Actions */}
              <div className="flex gap-2 p-3 border-t border-base-300 bg-base-200/50">
                <button
                  className="btn btn-ghost btn-sm flex-1"
                  onClick={() => setPreviewOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success btn-sm flex-1 gap-2"
                  onClick={() => {
                    handlePrint();
                    setPreviewOpen(false);
                  }}
                >
                  <Printer className="w-4 h-4" />
                  Print Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
