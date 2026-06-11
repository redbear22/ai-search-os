"use client";

import { signOut, useSession } from "next-auth/react";
import { LogIn, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserNav() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="rounded-md border p-3 text-xs text-muted-foreground">Loading account…</div>
    );
  }

  if (!session?.user) {
    return (
      <Button asChild variant="outline" size="sm" className="w-full">
        <Link href="/auth/signin">
          <LogIn className="mr-2 h-4 w-4" />
          Sign in
        </Link>
      </Button>
    );
  }

  const initials =
    session.user.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    session.user.email?.slice(0, 2).toUpperCase() ||
    "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md border bg-muted/40 p-2 text-left transition-colors hover:bg-muted"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "User"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session.user.name ?? "Signed in"}</p>
            <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{session.user.name ?? "User"}</p>
            <p className="text-xs text-muted-foreground">{session.user.email}</p>
            <p className="text-xs capitalize text-muted-foreground">
              Role: {(session.user.role ?? "pending").toLowerCase()}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/auth/signin">
            <UserRound className="mr-2 h-4 w-4" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
