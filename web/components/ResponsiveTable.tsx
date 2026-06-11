"use client";

import type { ReactNode } from "react";
import { Table } from "@/components/ui/table";

export function ResponsiveTable({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 w-full overflow-x-auto sm:mx-0">
      <div className="min-w-[640px] px-4 sm:min-w-full sm:px-0">
        <Table>{children}</Table>
      </div>
    </div>
  );
}
