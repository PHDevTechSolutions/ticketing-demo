"use client";

import React from "react";

interface StatusCardProps {
  counts: Record<string, number>;
  userId?: string;
}

const statusMeta: Record<
  string,
  { title: string; description: string; color: string; dot: string; border: string; bar: string }
> = {
  resolved: {
    title: "RESOLVED",
    description: "Tickets successfully closed",
    color: "text-[#3b82f6]",
    dot: "bg-[#3b82f6]",
    border: "border-[#3b82f6]/30",
    bar: "bg-[#3b82f6]",
  },
  ongoing: {
    title: "ONGOING",
    description: "Currently being worked on",
    color: "text-[#f97316]",
    dot: "bg-[#f97316]",
    border: "border-[#f97316]/30",
    bar: "bg-[#f97316]",
  },
  pending: {
    title: "PENDING",
    description: "Awaiting action or info",
    color: "text-[#eab308]",
    dot: "bg-[#eab308]",
    border: "border-[#eab308]/30",
    bar: "bg-[#eab308]",
  },
  scheduled: {
    title: "SCHEDULED",
    description: "Planned for future resolution",
    color: "text-[#06b6d4]",
    dot: "bg-[#06b6d4]",
    border: "border-[#06b6d4]/30",
    bar: "bg-[#06b6d4]",
  },
};

export function StatusCard({ counts }: StatusCardProps) {
  const grandTotal = Object.values(counts).reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-0 border">
      {/* Total tickets banner */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-[#f97316]" />
          <div>
            <p className="text-[9px] font-mono text-[#f97316]/60 uppercase tracking-[0.2em]">
              system · all statuses
            </p>
            <p className="text-xs font-mono font-bold text-[#e5e5d0]/80 mt-0.5 uppercase tracking-widest">
              Total Tickets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-[#6b6b4a]/60">
            {grandTotal === 0 ? "no records" : `${grandTotal} records`}
          </span>
          <span className="font-mono text-2xl font-bold text-[#f97316] tabular-nums">
            {grandTotal}
          </span>
        </div>
      </div>

      {/* Per-status grid */}
      <div className="grid grid-cols-2 md:grid-cols-4">
        {Object.keys(statusMeta).map((status, idx) => {
          const meta = statusMeta[status];
          const total = counts[status] ?? 0;
          const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
          const isLast = idx === Object.keys(statusMeta).length - 1;

          return (
            <div
              key={status}
              className={`flex flex-col gap-3 px-5 py-4 ${
                !isLast ? "border-r" : ""
              } border-t`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 ${meta.dot}`} />
                  <span className={`text-[9px] font-mono uppercase tracking-[0.2em] font-bold ${meta.color}`}>
                    {meta.title}
                  </span>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 border ${meta.border} ${meta.color} bg-transparent`}>
                  {pct}%
                </span>
              </div>

              {/* Count */}
              <div className="flex items-end justify-between">
                <span className={`text-3xl font-mono font-bold tabular-nums ${meta.color}`}>
                  {total}
                </span>
                <span className="text-[9px] font-mono text-[#6b6b4a]/50 leading-tight text-right max-w-[80px]">
                  {meta.description}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-px w-full bg-[#2a2a1a]">
                <div
                  className={`h-px transition-all duration-700 ${meta.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
