"use client";

import { useSession } from "next-auth/react";
import { Sparkles, TrendingUp, Zap, Shield } from "lucide-react";

export function HeroSection() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-background p-4 sm:p-6 md:p-8">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative z-10">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your AI visibility command center. Track, analyze, and improve how AI sees your brand.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-full bg-background/50 px-3 py-1 text-sm backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI-powered insights</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-background/50 px-3 py-1 text-sm backdrop-blur-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span>Real-time gaps</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-background/50 px-3 py-1 text-sm backdrop-blur-sm">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span>Auto-generated fixes</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-background/50 px-3 py-1 text-sm backdrop-blur-sm">
            <Shield className="h-4 w-4 text-blue-500" />
            <span>Enterprise grade</span>
          </div>
        </div>
      </div>
    </div>
  );
}
