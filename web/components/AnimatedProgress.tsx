"use client";

import { useEffect, useState } from "react";

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
}

export function AnimatedProgress({ value, max = 100, className }: AnimatedProgressProps) {
  const [width, setWidth] = useState(0);
  const percentage = Math.min(100, (value / max) * 100);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className={`h-2 overflow-hidden rounded-full bg-muted ${className || ""}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
