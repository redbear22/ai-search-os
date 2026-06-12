"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth");
  const isMarketingPage = pathname === "/" || pathname === "/pricing";
  const isClientPortal = pathname.startsWith("/portal/");

  if (isAuthPage || isMarketingPage || isClientPortal) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="animate-fade-in flex-1 overflow-y-auto bg-background pb-20 sm:pb-0">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
