"use client";

import { Badge } from "@/components/ui/badge";

const colorMap = {
  success: "bg-green-500",
  failure: "bg-red-500",
  cancelled: "bg-yellow-500",
  skipped: "bg-gray-500",
  in_progress: "bg-blue-500",
};

export const StatusBadge = ({ status }: { status: string | null }) => {
  if (!status) return null;
  const statusKey = status as keyof typeof colorMap;
  return (
    <Badge className={`${colorMap[statusKey] || "bg-gray-500"} text-white`}>
      {status}
    </Badge>
  );
};
