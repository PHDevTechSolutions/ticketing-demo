"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface StatusCardProps {
  counts: Record<string, number>;
  userId?: string;
}

const statusMeta: Record<
  string,
  { title: string; description: string }
> = {
  resolved: {
    title: "Resolved",
    description:
      "Tickets that have been successfully addressed and closed.",
  },
  ongoing: {
    title: "Ongoing",
    description:
      "Tickets currently being worked on or under investigation.",
  },
  pending: {
    title: "Pending",
    description:
      "Tickets awaiting additional information or action before processing.",
  },
  scheduled: {
    title: "Scheduled",
    description:
      "Tickets planned for future resolution or follow-up.",
  },
};

const statusColors: Record<string, { badge: string; glow: string }> = {
  resolved: { badge: "bg-blue-500/20 text-blue-400 border-blue-500/50", glow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]" },
  ongoing: { badge: "bg-orange-500/20 text-orange-400 border-orange-500/50", glow: "shadow-[0_0_15px_rgba(249,115,22,0.3)]" },
  pending: { badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", glow: "shadow-[0_0_15px_rgba(234,179,8,0.3)]" },
  scheduled: { badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50", glow: "shadow-[0_0_15px_rgba(6,182,212,0.3)]" },
};

export function StatusCard({ counts }: StatusCardProps) {
  // Calculate grand total of all tickets by summing all counts
  const grandTotal = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* TOTAL TICKETS CARD */}
      <Card className="flex flex-col justify-between md:col-span-4 hover:border-[rgba(139,92,246,0.4)]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white/90 gradient-text">Total Tickets</CardTitle>
          <CardDescription className="text-white/50">
            Total number of tickets regardless of status.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex items-center justify-between font-semibold">
          <span className="text-white/70">{grandTotal === 0 ? "No tickets" : `Total ${grandTotal} tickets`}</span>

          <Badge variant="neon" className="h-8 min-w-[2.5rem] rounded-full px-3 font-mono tabular-nums text-base">
            {grandTotal}
          </Badge>
        </CardContent>
      </Card>

      {/* PER STATUS CARDS */}
      {Object.keys(statusMeta).map((status) => {
        const meta = statusMeta[status];
        const total = counts[status] ?? 0;
        const colors = statusColors[status];

        return (
          <Card
            key={status}
            className={`flex flex-col justify-between md:col-span-1 hover:border-[rgba(139,92,246,0.3)] transition-all duration-300 ${total > 0 ? colors.glow : ''}`}
          >
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white/90">{meta.title}</CardTitle>
              <CardDescription className="text-white/50 text-xs">{meta.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex items-center justify-between font-semibold">
              <span className="text-white/60 text-sm">{total === 0 ? "No tickets" : `Total ${total}`}</span>

              <Badge className={`h-8 min-w-[2.5rem] rounded-full px-3 font-mono tabular-nums border ${colors.badge}`}>
                {total}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
