"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Mail, MapPin, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const EMAILS = {
  support: "support@aisearchrank.ai",
  legal: "legal@aisearchrank.ai",
  privacy: "privacy@aisearchrank.ai",
} as const;

const SUBJECTS = [
  { value: "support", label: "Product support", email: EMAILS.support },
  { value: "billing", label: "Billing & subscriptions", email: EMAILS.support },
  { value: "legal", label: "Legal inquiry", email: EMAILS.legal },
  { value: "privacy", label: "Privacy & data rights", email: EMAILS.privacy },
  { value: "enterprise", label: "Enterprise sales", email: EMAILS.support },
  { value: "other", label: "Other", email: EMAILS.support },
] as const;

const emptyForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject || !form.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    // Frontend-only: simulate submit until backend is wired
    setTimeout(() => {
      setSubmitting(false);
      setForm(emptyForm);
      toast.success("Message received! We'll respond within our stated timeframe.");
    }, 600);
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-4 animate-fade-in sm:space-y-8 sm:p-6 sm:py-8">
      <div className="text-center">
        <div className="mb-2 flex justify-center">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Contact Us</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          AI Search Rank · We&apos;re here to help
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle>Send a message</CardTitle>
            <CardDescription>
              Fill out the form below and our team will get back to you. For urgent issues, email us
              directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject</Label>
                <Select
                  value={form.subject}
                  onValueChange={(value) => setForm({ ...form, subject: value })}
                  required
                >
                  <SelectTrigger id="contact-subject">
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="How can we help?"
                  rows={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                {submitting ? "Sending…" : "Send message"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Response times
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Pro &amp; Enterprise:</strong> within 24 hours
                (business days)
              </p>
              <p>
                <strong className="text-foreground">Free plan:</strong> within 48 hours (business
                days)
              </p>
              <p className="text-xs">
                Enterprise customers with an SLA receive priority handling per their agreement.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-primary" />
                Email us directly
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-foreground">Support</p>
                <a
                  href={`mailto:${EMAILS.support}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {EMAILS.support}
                </a>
              </div>
              <div>
                <p className="font-medium text-foreground">Legal</p>
                <a
                  href={`mailto:${EMAILS.legal}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {EMAILS.legal}
                </a>
              </div>
              <div>
                <p className="font-medium text-foreground">Privacy</p>
                <a
                  href={`mailto:${EMAILS.privacy}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {EMAILS.privacy}
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                Business address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                AI Search Rank is headquartered in the United States. For written correspondence,
                email{" "}
                <a
                  href="mailto:legal@aisearchrank.ai"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  legal@aisearchrank.ai
                </a>{" "}
                to request a mailing address.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
              <p>
                See also our{" "}
                <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
              <p>
                Product help:{" "}
                <Link href="/help" className="text-primary underline-offset-4 hover:underline">
                  Help Center
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
