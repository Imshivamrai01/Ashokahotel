"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AdminFormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function AdminFormField({
  label,
  required,
  hint,
  error,
  children,
  className,
}: AdminFormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className={cn(error && "text-destructive")}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {hint && (
          <span className="font-normal text-muted-foreground ml-1 text-xs">
            {hint}
          </span>
        )}
      </Label>
      {children}
      {error && <p className="text-destructive text-xs font-medium">{error}</p>}
    </div>
  );
}
