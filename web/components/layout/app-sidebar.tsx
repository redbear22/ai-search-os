"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  Home,
  Kanban,
  Layers,
  Settings2,
  Users,
} from "lucide-react";
import { UserNav } from "@/components/auth/user-nav";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/audit", label: "Audit", icon: ClipboardCheck, id: "nav-audit" },
  { href: "/gaps", label: "Gaps", icon: AlertTriangle, id: "nav-gaps" },
  { href: "/kpis", label: "KPIs", icon: BarChart3 },
  { href: "/action-plan", label: "Action Plan", icon: Kanban, id: "nav-action-plan" },
  { href: "/executive-summary", label: "Executive Summary", icon: FileText, id: "nav-executive-summary" },
  { href: "/check-in", label: "Monthly Check-in", icon: CalendarCheck, id: "nav-check-in" },
];

const adminNav = [
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, adminOnly: false },
];

const devNav =
  process.env.NODE_ENV === "development"
    ? [{ href: "/admin/env-check", label: "Env Check", icon: Settings2 }]
    : [];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const visibleAdminNav = adminNav.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-2 px-5 py-5">
        <Layers className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold">AI Search OS</p>
          <p className="text-xs text-muted-foreground">port 3000</p>
        </div>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {nav.map(({ href, label, icon: Icon, id }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              id={id}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}

        {(visibleAdminNav.length > 0 || devNav.length > 0) && (
          <>
            <Separator className="my-2" />
            {visibleAdminNav.length > 0 && (
              <>
                <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Admin
                </p>
                {visibleAdminNav.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
              </>
            )}
            {devNav.length > 0 && (
              <>
                <p className="mt-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Development
                </p>
              </>
            )}
            {devNav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="space-y-3 border-t p-4">
        <UserNav />
        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Integrations</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline">Clarity APIs</Badge>
            <Badge variant="outline">Mock CE data</Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
