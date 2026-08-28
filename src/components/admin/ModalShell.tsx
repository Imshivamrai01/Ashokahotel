"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Plus, Pencil } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  mode?: "add" | "edit";
  maxWidth?: string;
  children: ReactNode;
}

export default function ModalShell({
  open,
  onClose,
  title,
  mode,
  maxWidth = "sm:max-w-md",
  children,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={cn("overflow-y-auto max-h-[90vh]", maxWidth)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            {mode === "add" && (
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                <Plus className="w-3.5 h-3.5 text-primary" />
              </span>
            )}
            {mode === "edit" && (
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-warning/10 border border-warning/20 shrink-0">
                <Pencil className="w-3.5 h-3.5 text-warning" />
              </span>
            )}
            {title}
          </DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

// ── Legacy shim so old callers still compile ─────────────────────────────────
// (remove once all CRUD pages are migrated)
export function _LegacyModalBackdrop({
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return <>{children}</>;
}
