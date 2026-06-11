import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { ApproveUserButton } from "@/components/admin/approve-user-button";
import { ResetOnboardingButton } from "@/components/admin/reset-onboarding-button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function roleBadgeVariant(role: UserRole): "default" | "secondary" | "outline" {
  switch (role) {
    case "ADMIN":
      return "default";
    case "APPROVED":
      return "secondary";
    default:
      return "outline";
  }
}

export default async function AdminUsersPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-4xl space-y-2 p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Forbidden</h1>
        <p className="text-sm text-muted-foreground">
          You need admin access to manage users.
        </p>
      </div>
    );
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Review pending sign-ups and approve access for team members.
          </p>
        </div>
        <ResetOnboardingButton />
      </div>

      <div className="rounded-md border">
        <ResponsiveTable>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.role === "PENDING" ? (
                      <ApproveUserButton email={user.email} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </ResponsiveTable>
      </div>
    </div>
  );
}
