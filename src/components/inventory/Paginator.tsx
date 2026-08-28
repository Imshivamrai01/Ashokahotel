"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/** Simple pager: shows "X–Y of N" + prev/next. */
export default function Paginator({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm border-t border-base-300/60">
      <span className="text-base-content/50">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          className="btn btn-ghost btn-xs btn-circle"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-base-content/60 px-1">
          {page} / {pages}
        </span>
        <button
          className="btn btn-ghost btn-xs btn-circle"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
