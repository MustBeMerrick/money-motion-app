"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/logo";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // a server component tree is behind the gate, so refresh rather than
        // client-navigate to a page the proxy would have redirected
        router.replace("/");
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Sign in failed");
    } catch {
      setError("Sign in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={submit} className="card w-full max-w-xs">
        <div className="mb-6 flex justify-center">
          <Wordmark width={170} />
        </div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-ink-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
        {error && <p className="mt-2 text-xs text-neg">{error}</p>}
        <button type="submit" disabled={pending || !password} className="btn btn-primary mt-4 w-full justify-center">
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
