"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { FileUp, LogOut, Plus, RefreshCw, Save } from "lucide-react";

type Status = "draft" | "pending_processing" | "pending_review" | "published" | "unlisted" | "rejected";
type Wallpaper = { id: string; title: string; status: Status; processingError: string | null };
type Detail = Wallpaper & { description: string | null; source: { name: string; originalUrl: string; author: string | null } | null; license: { type: string; evidenceUrl: string | null; notes: string | null } | null; assets: Array<{ id: string; kind: string; storageKey: string }> };

const labels: Record<Status, string> = { draft: "草稿", pending_processing: "处理中", pending_review: "待审核", published: "已发布", unlisted: "已下架", rejected: "已拒绝" };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "请求失败。");
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export function AdminDashboard({ administratorName }: { administratorName: string }) {
  const [items, setItems] = useState<Wallpaper[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceAuthor, setSourceAuthor] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [licenseNotes, setLicenseNotes] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ wallpapers: Wallpaper[] }>("/api/admin/wallpapers");
      setItems(data.wallpapers);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法加载壁纸列表。");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const select = async (id: string) => {
    try {
      const data = await api<{ wallpaper: Detail }>(`/api/admin/wallpapers/${id}`);
      setSelected(data.wallpaper);
      setTitle(data.wallpaper.title);
      setDescription(data.wallpaper.description ?? "");
      setSourceName(data.wallpaper.source?.name ?? "");
      setSourceUrl(data.wallpaper.source?.originalUrl ?? "");
      setSourceAuthor(data.wallpaper.source?.author ?? "");
      setLicenseType(data.wallpaper.license?.type ?? "");
      setLicenseUrl(data.wallpaper.license?.evidenceUrl ?? "");
      setLicenseNotes(data.wallpaper.license?.notes ?? "");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法读取壁纸详情。");
    }
  };

  const create = async () => {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      const data = await api<{ id: string }>("/api/admin/wallpapers", { method: "POST", body: JSON.stringify({ title: newTitle }) });
      setNewTitle("");
      await refresh();
      await select(data.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建草稿失败。");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api<void>(`/api/admin/wallpapers/${selected.id}`, { method: "PATCH", body: JSON.stringify({ title, description, source: sourceName && sourceUrl ? { name: sourceName, originalUrl: sourceUrl, author: sourceAuthor || undefined } : undefined, license: licenseType ? { type: licenseType, evidenceUrl: licenseUrl || undefined, notes: licenseNotes || undefined } : undefined }) });
      await refresh();
      await select(selected.id);
      setMessage("草稿元数据已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setBusy(false);
    }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selected) return;
    setBusy(true);
    try {
      const uploadData = await api<{ key: string; uploadUrl: string }>(`/api/admin/wallpapers/${selected.id}/upload-url`, { method: "POST", body: JSON.stringify({ contentType: file.type, contentLength: file.size }) });
      const result = await fetch(uploadData.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!result.ok) throw new Error("R2 直传失败。");
      await api(`/api/admin/wallpapers/${selected.id}/confirm-upload`, { method: "POST", body: JSON.stringify({ key: uploadData.key }) });
      await api(`/api/admin/wallpapers/${selected.id}/queue-processing`, { method: "POST" });
      await refresh();
      await select(selected.id);
      setMessage(`已进入处理队列。运行 pnpm processor ${selected.id}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败。");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const retryProcessing = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api(`/api/admin/wallpapers/${selected.id}/queue-processing`, { method: "POST" });
      await refresh();
      await select(selected.id);
      setMessage(`已重新进入处理队列。运行 pnpm processor ${selected.id}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重新处理失败。");
    } finally {
      setBusy(false);
    }
  };

  const review = async (status: "published" | "unlisted" | "rejected") => {
    if (!selected) return;
    setBusy(true);
    try {
      await api(`/api/admin/wallpapers/${selected.id}/review`, { method: "POST", body: JSON.stringify({ status }) });
      await refresh();
      await select(selected.id);
      setMessage(`状态已更新为${labels[status]}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "审核失败。");
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-screen bg-zinc-950 text-zinc-100"><header className="border-b border-zinc-800"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"><div><p className="font-medium">壁纸管理</p><p className="text-xs text-zinc-500">{administratorName}</p></div><div className="flex gap-2"><button type="button" title="刷新" onClick={() => void refresh()} className="grid size-9 place-items-center border border-zinc-700 hover:bg-zinc-800"><RefreshCw size={16} /></button><button type="button" title="退出登录" onClick={() => void fetch("/api/auth/sign-out", { method: "POST" }).then(() => window.location.assign("/sign-in"))} className="grid size-9 place-items-center border border-zinc-700 hover:bg-zinc-800"><LogOut size={16} /></button></div></div></header><div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]"><aside className="border border-zinc-800 bg-zinc-900/50 p-3"><div className="flex gap-2"><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="新壁纸标题" className="min-w-0 flex-1 border border-zinc-700 bg-zinc-950 px-2 text-sm" /><button type="button" title="新建草稿" disabled={busy} onClick={() => void create()} className="grid size-9 place-items-center bg-lime-300 text-zinc-950 disabled:opacity-50"><Plus size={16} /></button></div><div className="mt-3 space-y-1">{items.map((item) => <button key={item.id} type="button" onClick={() => void select(item.id)} className={`w-full border px-3 py-3 text-left ${selected?.id === item.id ? "border-lime-300 bg-zinc-800" : "border-transparent hover:bg-zinc-800"}`}><span className="block truncate text-sm">{item.title}</span><span className="mt-1 block text-xs text-zinc-500">{labels[item.status]}</span></button>)}{!items.length && <p className="py-8 text-center text-sm text-zinc-500">暂无草稿</p>}</div></aside><section className="min-w-0">{message && <p className="mb-4 border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">{message}</p>}{!selected ? <div className="border border-dashed border-zinc-700 p-10 text-sm text-zinc-500">新建或选择一个壁纸草稿。</div> : <div className="space-y-5"><div className="flex items-center justify-between border-b border-zinc-800 pb-4"><div><h1 className="text-xl font-semibold">{selected.title}</h1><p className="text-sm text-zinc-500">{labels[selected.status]}</p></div><div className="flex gap-2">{selected.status === "pending_review" && <button type="button" disabled={busy} onClick={() => void review("published")} className="bg-lime-300 px-3 py-2 text-sm font-medium text-zinc-950">发布</button>}{selected.status === "published" && <button type="button" disabled={busy} onClick={() => void review("unlisted")} className="border border-zinc-700 px-3 py-2 text-sm">下架</button>}{["draft", "pending_processing", "pending_review"].includes(selected.status) && <button type="button" disabled={busy} onClick={() => void review("rejected")} className="border border-red-900 px-3 py-2 text-sm text-red-300">拒绝</button>}</div></div>{selected.status === "draft" && <div className="grid gap-4 border border-zinc-800 p-5"><label className="grid gap-2 text-sm">标题<input value={title} onChange={(event) => setTitle(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label><label className="grid gap-2 text-sm">描述<textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label><div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm">来源名称<input value={sourceName} onChange={(event) => setSourceName(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label><label className="grid gap-2 text-sm">原始页面 URL<input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label><label className="grid gap-2 text-sm">作者<input value={sourceAuthor} onChange={(event) => setSourceAuthor(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label><label className="grid gap-2 text-sm">授权类型<input value={licenseType} onChange={(event) => setLicenseType(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label><label className="grid gap-2 text-sm">授权证据 URL<input value={licenseUrl} onChange={(event) => setLicenseUrl(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label><label className="grid gap-2 text-sm">授权备注<input value={licenseNotes} onChange={(event) => setLicenseNotes(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label></div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void save()} className="flex items-center gap-2 border border-zinc-700 px-3 py-2 text-sm"><Save size={16} />保存</button><label className="flex cursor-pointer items-center gap-2 bg-lime-300 px-3 py-2 text-sm font-medium text-zinc-950"><FileUp size={16} />上传原图<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} /></label></div></div>}{selected.processingError && <p className="border border-red-900 p-3 text-sm text-red-300">处理失败：{selected.processingError}</p>}<div className="border border-zinc-800 p-5"><p className="text-sm font-medium">素材版本</p><ul className="mt-3 space-y-2 text-sm text-zinc-500">{selected.assets.map((asset) => <li key={asset.id} className="flex justify-between gap-4"><span>{asset.kind}</span><span className="truncate text-xs">{asset.storageKey}</span></li>)}{!selected.assets.length && <li>尚未上传原图</li>}</ul>{selected.status === "pending_processing" && <button type="button" disabled={busy} onClick={() => void retryProcessing()} className="mt-4 border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500">重新处理</button>}</div></div>}</section></div></main>;
}
