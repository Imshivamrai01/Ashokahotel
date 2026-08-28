"use client";

import { HelpCircle } from "lucide-react";

/** Tiny inline glossary tooltip for an unavoidable term. */
export default function HelpTip({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center align-middle text-base-content/40 hover:text-base-content cursor-help"
      title={text}
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </span>
  );
}
