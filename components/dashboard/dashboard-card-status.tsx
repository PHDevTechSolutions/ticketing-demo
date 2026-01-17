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

export function StatusCard({ counts }: StatusCardProps) {
  // Calculate grand total of all tickets by summing all counts
  const grandTotal = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* TOTAL TICKETS CARD */}
      <Card className="flex flex-col justify-between md:col-span-4">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Total Tickets</CardTitle>
          <CardDescription>
            Total number of tickets regardless of status.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex items-center justify-between font-semibold">
          <span>{grandTotal === 0 ? "No tickets" : `Total ${grandTotal} tickets`}</span>

          <Badge className="h-8 min-w-[2rem] rounded-full px-2 font-mono tabular-nums">
            {grandTotal}
          </Badge>
        </CardContent>

        <Separator />
      </Card>

      {/* PER STATUS CARDS */}
      {Object.keys(statusMeta).map((status) => {
        const meta = statusMeta[status];
        const total = counts[status] ?? 0;

        return (
          <Card
            key={status}
            className="flex flex-col justify-between md:col-span-1"
          >
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{meta.title}</CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex items-center justify-between font-semibold">
              <span>{total === 0 ? "No tickets" : `Total ${total} tickets`}</span>

              <Badge className="h-8 min-w-[2rem] rounded-full px-2 font-mono tabular-nums">
                {total}
              </Badge>
            </CardContent>

            <Separator />
          </Card>
        );
      })}
    </div>
  );
}
