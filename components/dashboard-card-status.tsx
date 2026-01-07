"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface StatusCardProps {
  counts: Record<string, number>;
  userId?: string;
}

const statusMeta: Record<
  string,
  { title: string; description: string; link: string; linkLabel: string }
> = {
  spare: {
    title: "Spare",
    description:
      "Available IT equipments and devices that are ready for deployment or replacement.",
    link: "/asset/inventory",
    linkLabel: "View Spare",
  },
  deployed: {
    title: "Deployed",
    description:
      "IT equipments and devices currently assigned and actively used by users or departments.",
    link: "/asset/inventory",
    linkLabel: "View Deployed",
  },
  missing: {
    title: "Missing",
    description:
      "IT equipments and devices that are unaccounted for and require investigation or reporting.",
    link: "/asset/inventory",
    linkLabel: "View Missing",
  },
  dispose: {
    title: "Disposed",
    description:
      "IT equipments and devices that are marked for disposal, recycling, or decommissioning.",
    link: "/asset/disposal",
    linkLabel: "View Dispose",
  },
};

export function StatusCard({ counts, userId }: StatusCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {Object.keys(statusMeta).map((status) => {
        const meta = statusMeta[status];
        const total = counts[status] ?? 0;

        return (
          <Card key={status} className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {meta.title}
              </CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex items-center justify-between font-semibold">
              <span>
                {total === 0 ? "No items" : `Total ${total} items`}
              </span>

              <Badge className="h-8 min-w-[2rem] rounded-full px-2 font-mono tabular-nums">
                {total}
              </Badge>
            </CardContent>

            <Separator />

            <CardFooter className="flex justify-end">
              <Button variant="outline" asChild>
                <a href={`${meta.link}?id=${encodeURIComponent(userId ?? "")}`}>
                  {meta.linkLabel}
                </a>
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}