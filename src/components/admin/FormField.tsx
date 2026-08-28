import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  required,
  hint,
  error,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`form-control ${className}`}>
      <label className="label pb-1.5">
        <span className="label-text text-sm font-medium text-base-content/70">
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
          {hint && (
            <span className="font-normal text-base-content/40 ml-1">
              {hint}
            </span>
          )}
        </span>
      </label>
      {children}
      {error && (
        <span className="text-error text-xs mt-1.5 font-medium">{error}</span>
      )}
    </div>
  );
}

export const inputCls = (error?: boolean) =>
  `input input-bordered bg-base-100 rounded-xl focus:border-primary/50 transition-colors ${error ? "input-error" : ""}`;

export const selectCls = (error?: boolean) =>
  `select select-bordered bg-base-100 rounded-xl ${error ? "select-error" : ""}`;

export const textareaCls =
  "textarea textarea-bordered bg-base-100 rounded-xl resize-none focus:border-primary/50 transition-colors";
