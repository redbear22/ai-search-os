"use client";

import { Button } from "@/components/ui/button";
import { FileSearch, Rocket, AlertCircle, BarChart3 } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: "search" | "rocket" | "alert" | "chart";
}

const icons = {
  search: FileSearch,
  rocket: Rocket,
  alert: AlertCircle,
  chart: BarChart3,
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon = "search",
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 p-12 text-center animate-fade-in">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
