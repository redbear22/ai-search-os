"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EnvCheckRefreshButton() {
  const router = useRouter();

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
      <RefreshCw className="mr-2 h-4 w-4" />
      Refresh
    </Button>
  );
}
