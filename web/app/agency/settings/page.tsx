"use client";

import Link from "next/link";
import { ArrowLeft, Key, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgencySettingsPage() {
  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Link
        href="/agency"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Agency Dashboard
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Agency Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Manage subscription, team members, and workspace configuration.
          </p>
          <Button variant="outline" asChild>
            <Link href="/agency/branding">
              <Palette className="mr-2 h-4 w-4" />
              White-label branding
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/agency/team">Team members</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/agency/settings/api">
              <Key className="mr-2 h-4 w-4" />
              Enterprise API
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
