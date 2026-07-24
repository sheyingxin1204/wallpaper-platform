"use client";

import { FormEvent, useState } from "react";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, rememberMe: true }) });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "登录失败。");
      }
      window.location.assign("/admin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败。");
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-zinc-950 px-6 text-zinc-100"><form onSubmit={submit} className="w-full max-w-sm border border-zinc-800 bg-zinc-900/50 p-6"><p className="text-sm text-zinc-500">Wallpaper Platform</p><h1 className="mt-2 text-xl font-semibold">管理员登录</h1><div className="mt-6 grid gap-4"><label className="grid gap-2 text-sm">邮箱<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-lime-300" /></label><label className="grid gap-2 text-sm">密码<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-lime-300" /></label>{error && <p className="text-sm text-red-300">{error}</p>}<button disabled={submitting} className="bg-lime-300 px-3 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50">{submitting ? "正在登录" : "登录"}</button></div></form></main>;
}
