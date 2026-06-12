"use client";

import { useState } from "react";
import Link from "next/link";

type FreeAuditResponse = {
  success?: boolean;
  error?: string;
  audit?: {
    url: string;
    domain: string;
    score: number;
    gaps: string[];
  };
  message?: string;
};

export default function FreeAuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FreeAuditResponse | null>(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/audit/free", {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json()) as FreeAuditResponse;

      if (!res.ok) {
        setError(data.error ?? "Unable to run free audit");
        return;
      }

      setResult(data);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-3xl font-bold">Free AI Visibility Audit</h1>
        <p className="mb-8 text-gray-600">
          One free audit per IP address every 24 hours. No account required.
        </p>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-lg border p-3"
          />
          <button
            type="button"
            onClick={() => void runAudit()}
            disabled={loading || !url.trim()}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Running…" : "Run Free Audit"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
            {error.includes("already used") && (
              <p className="mt-2">
                <Link href="/pricing" className="font-medium text-indigo-600 underline">
                  View plans
                </Link>{" "}
                to run unlimited audits.
              </p>
            )}
          </div>
        )}

        {result?.audit && (
          <div className="space-y-4 rounded-lg border bg-gray-50 p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-semibold">{result.audit.domain}</h2>
              <span className="text-2xl font-bold text-indigo-600">
                {result.audit.score}/100
              </span>
            </div>
            <p className="text-sm text-gray-600">{result.message}</p>
            <ul className="space-y-2 text-sm">
              {result.audit.gaps.map((gap) => (
                <li key={gap} className="flex gap-2">
                  <span className="text-amber-500">•</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/auth/signin"
              className="inline-block text-sm font-medium text-indigo-600 hover:underline"
            >
              Create an account to save results →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
