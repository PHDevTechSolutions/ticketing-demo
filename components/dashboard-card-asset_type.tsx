"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface AssetCardProps {
  chartData: { month: string; desktop: number }[];
  title: string;
  description: string;
}

export function AssetCard({ chartData, title, description }: AssetCardProps) {
  /**
   * 🔹 Normalize data
   * MONITOR / Monitor / monitor → Monitor
   */
  const normalizedData = useMemo(() => {
    const map = new Map<string, number>();

    chartData.forEach(({ month, desktop }) => {
      const normalizedKey =
        month.trim().toLowerCase().charAt(0).toUpperCase() +
        month.trim().toLowerCase().slice(1);

      map.set(normalizedKey, (map.get(normalizedKey) ?? 0) + desktop);
    });

    return Array.from(map.entries()).map(([month, desktop]) => ({
      month,
      desktop,
    }));
  }, [chartData]);

  /**
   * 🔹 Dynamic YAxis width
   * para hindi matabunan ang labels
   */
  const yAxisWidth = Math.min(
    Math.max(
      ...normalizedData.map((d) => d.month.length * 8),
      80
    ),
    180
  );

  const chartConfig = {
    desktop: {
      label: "Assets",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={normalizedData}
            layout="vertical"
            barSize={22}
            margin={{ left: 16, right: 16 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="month"
              width={yAxisWidth}
              tickLine={false}
              axisLine={false}
            />

            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
            />

            <Bar
              dataKey="desktop"
              fill="var(--color-desktop)"
              radius={[6, 6, 6, 6]}
            >
              {/* Value label sa dulo ng bar */}
              <LabelList
                dataKey="desktop"
                position="right"
                className="fill-foreground text-xs"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Showing total assets grouped by type
          <TrendingUp className="h-4 w-4" />
        </div>
      </CardFooter>
    </Card>
  );
}