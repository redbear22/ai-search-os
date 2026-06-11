"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  ClipboardList,
  AlertTriangle,
  Calendar,
  Menu,
  FileText,
  Activity,
  Brain,
  Cpu,
  Eye,
  GitCompare,
  Shield,
  Bot,
  Gauge,
  BarChart3,
  Settings,
  HelpCircle,
  FolderKanban,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClientSwitcher } from "@/components/workspace/ClientSwitcher";

const mobileNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Audit", href: "/audit", icon: ClipboardList },
  { name: "Gaps", href: "/gaps", icon: AlertTriangle },
  { name: "Plan", href: "/action-plan", icon: Calendar },
] as const;

type MoreNavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const moreNavItems: MoreNavItem[] = [
  { name: "Agency", href: "/agency", icon: Building2 },
  { name: "Executive Summary", href: "/executive-summary", icon: FileText },
  { name: "Monthly Check-in", href: "/check-in", icon: Activity },
  { name: "Tasks", href: "/tasks", icon: FolderKanban },
  { name: "Help", href: "/help", icon: HelpCircle },
  { name: "Citation Intel", href: "/citation-intelligence", icon: Brain },
  { name: "Agent Readiness", href: "/agent-readiness", icon: Cpu },
  { name: "Zero-Click", href: "/zero-click-visibility", icon: Eye },
  { name: "AI Comparison", href: "/ai-comparison", icon: GitCompare },
  { name: "Entity Trust", href: "/entity-trust", icon: Shield, adminOnly: true },
  { name: "Agentic Optimizer", href: "/agentic-optimizer", icon: Bot, adminOnly: true },
  { name: "Google I/O", href: "/google-io-readiness", icon: Gauge, adminOnly: true },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3, adminOnly: true },
  { name: "Admin", href: "/admin/users", icon: Settings, adminOnly: true },
];

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const filteredMoreItems = moreNavItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background sm:hidden">
      <div className="border-b px-3 py-2">
        <ClientSwitcher className="w-full max-w-none" compact />
      </div>
      <div className="flex justify-around p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[4rem] flex-col items-center gap-1 rounded-lg p-2",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.name}</span>
            </Link>
          );
        })}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-auto min-w-[4rem] flex-col items-center gap-1 p-2"
            >
              <Menu className="h-5 w-5" />
              <span className="text-xs">More</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-xl pb-8">
            <SheetHeader className="text-left">
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2 p-4 pt-2">
              {filteredMoreItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
                      isActive
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="leading-tight">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
