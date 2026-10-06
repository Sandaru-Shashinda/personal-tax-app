"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// The charting library is only downloaded on pages that draw a chart.
export const MonthlyChart = dynamic(() => import("./monthly-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
});
