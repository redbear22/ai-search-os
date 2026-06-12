"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Shield,
  Brain,
  Bot,
  TrendingUp,
  Eye,
  Cpu,
  Gauge,
  Radar,
  GitCompare,
  AlertTriangle,
  Calendar,
  FileText,
  Activity,
  BarChart3,
  Settings,
  Crown,
  HelpCircle,
  FolderKanban,
  Building2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgencyRole } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import { ClientSwitcher } from "@/components/workspace/ClientSwitcher";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  id?: string;
  adminOnly?: boolean;
  agencyRoles?: AgencyRole[];
};

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: TrendingUp },
  { name: "Agency", href: "/agency", icon: Building2, id: "nav-agency" },
  {
    name: "Team",
    href: "/agency/team",
    icon: Users,
    id: "nav-agency-team",
    agencyRoles: ["AGENCY_OWNER", "AGENCY_ADMIN"],
  },
  { name: "Audit", href: "/audit", icon: Radar, id: "nav-audit" },
  { name: "Gaps", href: "/gaps", icon: AlertTriangle, id: "nav-gaps" },
  { name: "Action Plan", href: "/action-plan", icon: Calendar, id: "nav-action-plan" },
  { name: "Tasks", href: "/tasks", icon: FolderKanban, id: "nav-tasks" },
  {
    name: "Executive Summary",
    href: "/executive-summary",
    icon: FileText,
    id: "nav-executive-summary",
  },
  { name: "Monthly Check-in", href: "/check-in", icon: Activity, id: "nav-check-in" },
  { name: "Help", href: "/help", icon: HelpCircle, id: "nav-help" },
  {
    name: "Citation Intel",
    href: "/citation-intelligence",
    icon: Brain,
    id: "nav-citation-intelligence",
  },
  {
    name: "Agent Readiness",
    href: "/agent-readiness",
    icon: Cpu,
    id: "nav-agent-readiness",
  },
  {
    name: "Zero-Click",
    href: "/zero-click-visibility",
    icon: Eye,
    id: "nav-zero-click",
  },
  {
    name: "AI Comparison",
    href: "/ai-comparison",
    icon: GitCompare,
    id: "nav-ai-comparison",
  },
  { name: "Entity Trust", href: "/entity-trust", icon: Shield, id: "nav-entity-trust" },
  {
    name: "Agentic Optimizer",
    href: "/agentic-optimizer",
    icon: Bot,
    adminOnly: true,
  },
  {
    name: "Google I/O",
    href: "/google-io-readiness",
    icon: Gauge,
    adminOnly: true,
  },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3, adminOnly: true },
  { name: "Admin", href: "/admin/users", icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const agencyRole = session?.user?.agencyRole;

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.agencyRoles && (!agencyRole || !item.agencyRoles.includes(agencyRole))) {
      return false;
    }
    return true;
  });

  return (
    <aside className="hidden w-64 flex-col border-r bg-background lg:flex">
      <div className="space-y-3 border-b px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Crown className="h-5 w-5 text-amber-500" />
          <span>AI Search OS</span>
        </Link>
        <ClientSwitcher className="w-full max-w-none" compact />
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              id={item.id}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-primary/10 to-transparent text-primary font-medium before:absolute before:left-0 before:top-1/2 before:h-6 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
