"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { FileUp, FolderTree, History, LogOut, Plus, RefreshCw, Save, ScrollText, Tags } from "lucide-react";

type Status = "draft" | "pending_processing" | "pending_review" | "published" | "unlisted" | "rejected";
type Wallpaper = { id: string; title: string; status: Status; processingError: string | null };
type Detail = Wallpaper & {
  description: string | null;
  categoryId: string | null;
  tagIds: string[];
  source: { name: string; originalUrl: string; author: string | null } | null;
  license: { type: string; evidenceUrl: string | null; notes: string | null } | null;
  assets: Array<{ id: string; kind: string; storageKey: string }>;
};
type Category = { id: string; name: string; slug: string; sortOrder: number; enabled: boolean };
type Tag = { id: string; name: string; slug: string };
type CrawlTask = { id: string; provider: string; providerVersion: string; input: string | null; status: "running" | "completed" | "failed"; candidateCount: number; importedCount: number; duplicateCount: number; error: string | null; startedAt: string; finishedAt: string | null };
type CrawlRecord = { id: string; pageUrl: string; imageUrl: string; title: string; author: string | null; licenseType: string; status: "queued" | "imported" | "duplicate" | "failed"; wallpaperId: string | null; error: string | null; capturedAt: string };
type AuditLog = { id: string; wallpaperId: string; wallpaperTitle: string | null; actorName: string | null; action: string; fromStatus: string | null; toStatus: string | null; reason: string | null; createdAt: string };
type View = "wallpapers" | "taxonomy" | "crawl" | "audit";

const labels: Record<Status, string> = { draft: "草稿", pending_processing: "处理中", pending_review: "待审核", published: "已发布", unlisted: "已下架", rejected: "已拒绝" };
const crawlTaskLabels: Record<CrawlTask["status"], string> = { running: "运行中", completed: "已完成", failed: "失败" };
const crawlRecordLabels: Record<CrawlRecord["status"], string> = { queued: "排队中", imported: "已导入", duplicate: "重复", failed: "失败" };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "请求失败。");
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function AdminDashboard({ administratorName }: { administratorName: string }) {
  const [view, setView] = useState<View>("wallpapers");
  const [items, setItems] = useState<Wallpaper[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [crawlTasks, setCrawlTasks] = useState<CrawlTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [crawlRecords, setCrawlRecords] = useState<CrawlRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceAuthor, setSourceAuthor] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [licenseNotes, setLicenseNotes] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [newCategorySort, setNewCategorySort] = useState("0");
  const [newTagName, setNewTagName] = useState("");
  const [newTagSlug, setNewTagSlug] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ wallpapers: Wallpaper[] }>("/api/admin/wallpapers");
      setItems(data.wallpapers);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法加载壁纸列表。");
    }
  }, []);

  const loadTaxonomy = useCallback(async () => {
    try {
      const [categoryData, tagData] = await Promise.all([
        api<{ categories: Category[] }>("/api/admin/categories"),
        api<{ tags: Tag[] }>("/api/admin/tags"),
      ]);
      setCategories(categoryData.categories);
      setTags(tagData.tags);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法加载分类和标签。");
    }
  }, []);

  const loadCrawlTasks = useCallback(async () => {
    try {
      const data = await api<{ tasks: CrawlTask[] }>("/api/admin/crawl-tasks");
      setCrawlTasks(data.tasks);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法加载采集任务。");
    }
  }, []);

  const selectTask = async (id: string) => {
    setSelectedTaskId(id);
    try {
      const data = await api<{ records: CrawlRecord[] }>(`/api/admin/crawl-tasks/${id}`);
      setCrawlRecords(data.records);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法读取采集记录。");
    }
  };

  const loadAuditLogs = useCallback(async () => {
    try {
      const data = await api<{ logs: AuditLog[] }>("/api/admin/audit-logs");
      setAuditLogs(data.logs);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法加载操作日志。");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTaxonomy(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTaxonomy]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCrawlTasks(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCrawlTasks]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAuditLogs(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAuditLogs]);

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
      setSelectedCategoryId(data.wallpaper.categoryId ?? "");
      setSelectedTagIds(data.wallpaper.tagIds ?? []);
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
      await api<void>(`/api/admin/wallpapers/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          description,
          source: sourceName && sourceUrl ? { name: sourceName, originalUrl: sourceUrl, author: sourceAuthor || undefined } : undefined,
          license: licenseType ? { type: licenseType, evidenceUrl: licenseUrl || undefined, notes: licenseNotes || undefined } : undefined,
          categoryId: selectedCategoryId || null,
          tagIds: selectedTagIds,
        }),
      });
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

  const remove = async () => {
    if (!selected) return;
    if (!window.confirm(`确定删除“${selected.title}”吗？该操作会同时清理 R2 对象，且无法恢复。`)) return;
    setBusy(true);
    try {
      await api<void>(`/api/admin/wallpapers/${selected.id}`, { method: "DELETE" });
      setSelected(null);
      await refresh();
      setMessage("壁纸已删除。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败。");
    } finally {
      setBusy(false);
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    setBusy(true);
    try {
      await api<void>("/api/admin/categories", { method: "POST", body: JSON.stringify({ name: newCategoryName, slug: newCategorySlug.trim() || toSlug(newCategoryName), sortOrder: Number.parseInt(newCategorySort, 10) || 0 }) });
      setNewCategoryName("");
      setNewCategorySlug("");
      setNewCategorySort("0");
      await loadTaxonomy();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建分类失败。");
    } finally {
      setBusy(false);
    }
  };

  const saveCategory = async (category: Category, patch: Partial<Category>) => {
    setBusy(true);
    try {
      await api<void>(`/api/admin/categories/${category.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      await loadTaxonomy();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存分类失败。");
    } finally {
      setBusy(false);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;
    setBusy(true);
    try {
      await api<void>("/api/admin/tags", { method: "POST", body: JSON.stringify({ name: newTagName, slug: newTagSlug.trim() || toSlug(newTagName) }) });
      setNewTagName("");
      setNewTagSlug("");
      await loadTaxonomy();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建标签失败。");
    } finally {
      setBusy(false);
    }
  };

  const saveTag = async (tag: Tag, patch: Partial<Tag>) => {
    setBusy(true);
    try {
      await api<void>(`/api/admin/tags/${tag.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      await loadTaxonomy();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存标签失败。");
    } finally {
      setBusy(false);
    }
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((current) => (current.includes(id) ? current.filter((tagId) => tagId !== id) : [...current, id]));
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-medium">壁纸管理</p>
            <p className="text-xs text-zinc-500">{administratorName}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" title="刷新" onClick={() => void refresh()} className="grid size-9 place-items-center border border-zinc-700 hover:bg-zinc-800"><RefreshCw size={16} /></button>
            <button type="button" title="退出登录" onClick={() => void fetch("/api/auth/sign-out", { method: "POST" }).then(() => window.location.assign("/sign-in"))} className="grid size-9 place-items-center border border-zinc-700 hover:bg-zinc-800"><LogOut size={16} /></button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 px-6 pb-3" aria-label="后台导航">
          <button type="button" onClick={() => setView("wallpapers")} className={`flex items-center gap-2 border px-4 py-2 text-sm ${view === "wallpapers" ? "border-lime-300 text-lime-300" : "border-transparent text-zinc-400 hover:text-white"}`}><FileUp size={15} />壁纸</button>
          <button type="button" onClick={() => setView("taxonomy")} className={`flex items-center gap-2 border px-4 py-2 text-sm ${view === "taxonomy" ? "border-lime-300 text-lime-300" : "border-transparent text-zinc-400 hover:text-white"}`}><Tags size={15} />分类与标签</button>
          <button type="button" onClick={() => setView("crawl")} className={`flex items-center gap-2 border px-4 py-2 text-sm ${view === "crawl" ? "border-lime-300 text-lime-300" : "border-transparent text-zinc-400 hover:text-white"}`}><History size={15} />采集记录</button>
          <button type="button" onClick={() => setView("audit")} className={`flex items-center gap-2 border px-4 py-2 text-sm ${view === "audit" ? "border-lime-300 text-lime-300" : "border-transparent text-zinc-400 hover:text-white"}`}><ScrollText size={15} />操作日志</button>
        </nav>
      </header>

      {message && <div className="mx-auto mt-4 max-w-7xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">{message}</div>}

      {view === "wallpapers" ? (
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
          <aside className="border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="flex gap-2">
              <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="新壁纸标题" className="min-w-0 flex-1 border border-zinc-700 bg-zinc-950 px-2 text-sm" />
              <button type="button" title="新建草稿" disabled={busy} onClick={() => void create()} className="grid size-9 place-items-center bg-lime-300 text-zinc-950 disabled:opacity-50"><Plus size={16} /></button>
            </div>
            <div className="mt-3 space-y-1">
              {items.map((item) => (
                <button key={item.id} type="button" onClick={() => void select(item.id)} className={`w-full border px-3 py-3 text-left ${selected?.id === item.id ? "border-lime-300 bg-zinc-800" : "border-transparent hover:bg-zinc-800"}`}>
                  <span className="block truncate text-sm">{item.title}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{labels[item.status]}</span>
                </button>
              ))}
              {!items.length && <p className="py-8 text-center text-sm text-zinc-500">暂无草稿</p>}
            </div>
          </aside>

          <section className="min-w-0">
            {!selected ? (
              <div className="border border-dashed border-zinc-700 p-10 text-sm text-zinc-500">新建或选择一个壁纸草稿。</div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <h1 className="text-xl font-semibold">{selected.title}</h1>
                    <p className="text-sm text-zinc-500">{labels[selected.status]}</p>
                  </div>
                  <div className="flex gap-2">
                    {selected.status === "pending_review" && <button type="button" disabled={busy} onClick={() => void review("published")} className="bg-lime-300 px-3 py-2 text-sm font-medium text-zinc-950">发布</button>}
                    {selected.status === "published" && <button type="button" disabled={busy} onClick={() => void review("unlisted")} className="border border-zinc-700 px-3 py-2 text-sm">下架</button>}
                    {["draft", "pending_processing", "pending_review"].includes(selected.status) && <button type="button" disabled={busy} onClick={() => void review("rejected")} className="border border-red-900 px-3 py-2 text-sm text-red-300">拒绝</button>}
                    {!["published", "unlisted"].includes(selected.status) && <button type="button" disabled={busy} onClick={() => void remove()} className="border border-red-900 px-3 py-2 text-sm text-red-300">删除</button>}
                  </div>
                </div>

                {selected.status === "draft" && (
                  <div className="grid gap-4 border border-zinc-800 p-5">
                    <label className="grid gap-2 text-sm">标题<input value={title} onChange={(event) => setTitle(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
                    <label className="grid gap-2 text-sm">描述<textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm">来源名称<input value={sourceName} onChange={(event) => setSourceName(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
                      <label className="grid gap-2 text-sm">原始页面 URL<input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
                      <label className="grid gap-2 text-sm">作者<input value={sourceAuthor} onChange={(event) => setSourceAuthor(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
                      <label className="grid gap-2 text-sm">授权类型<input value={licenseType} onChange={(event) => setLicenseType(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
                      <label className="grid gap-2 text-sm">授权证据 URL<input value={licenseUrl} onChange={(event) => setLicenseUrl(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
                      <label className="grid gap-2 text-sm">授权备注<input value={licenseNotes} onChange={(event) => setLicenseNotes(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2" /></label>
                      <label className="grid gap-2 text-sm">分类
                        <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} className="border border-zinc-700 bg-zinc-950 px-3 py-2">
                          <option value="">未分类</option>
                          {categories.filter((category) => category.enabled).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </select>
                      </label>
                    </div>
                    <fieldset className="grid gap-2 text-sm">
                      <legend className="text-zinc-500">标签</legend>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} className={`border px-3 py-1 text-xs ${selectedTagIds.includes(tag.id) ? "border-lime-300 bg-lime-300/10 text-lime-300" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>{tag.name}</button>
                        ))}
                        {!tags.length && <span className="text-zinc-600">还没有标签，请先到“分类与标签”创建。</span>}
                      </div>
                    </fieldset>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busy} onClick={() => void save()} className="flex items-center gap-2 border border-zinc-700 px-3 py-2 text-sm"><Save size={16} />保存</button>
                      <label className="flex cursor-pointer items-center gap-2 bg-lime-300 px-3 py-2 text-sm font-medium text-zinc-950"><FileUp size={16} />上传原图<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} /></label>
                    </div>
                  </div>
                )}

                {selected.processingError && <p className="border border-red-900 p-3 text-sm text-red-300">处理失败：{selected.processingError}</p>}

                <div className="border border-zinc-800 p-5">
                  <p className="text-sm font-medium">素材版本</p>
                  <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                    {selected.assets.map((asset) => <li key={asset.id} className="flex justify-between gap-4"><span>{asset.kind}</span><span className="truncate text-xs">{asset.storageKey}</span></li>)}
                    {!selected.assets.length && <li>尚未上传原图</li>}
                  </ul>
                  {selected.status === "pending_processing" && <button type="button" disabled={busy} onClick={() => void retryProcessing()} className="mt-4 border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500">重新处理</button>}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : view === "taxonomy" ? (
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-2">
          <section className="border border-zinc-800 p-5">
            <h2 className="flex items-center gap-2 text-base font-medium"><FolderTree size={16} />分类</h2>
            <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_80px_auto]">
              <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="名称" className="min-w-0 border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm" />
              <input value={newCategorySlug} onChange={(event) => setNewCategorySlug(event.target.value)} placeholder="slug（留空自动生成）" className="min-w-0 border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm" />
              <input value={newCategorySort} onChange={(event) => setNewCategorySort(event.target.value)} placeholder="排序" className="min-w-0 border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm" />
              <button type="button" disabled={busy} onClick={() => void createCategory()} className="flex items-center gap-1 bg-lime-300 px-3 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"><Plus size={15} />新增</button>
            </div>
            <ul className="mt-4 space-y-2">
              {categories.map((category) => (
                <CategoryRow key={category.id} category={category} busy={busy} onSave={(patch) => void saveCategory(category, patch)} />
              ))}
              {!categories.length && <p className="py-6 text-center text-sm text-zinc-500">暂无分类</p>}
            </ul>
          </section>

          <section className="border border-zinc-800 p-5">
            <h2 className="flex items-center gap-2 text-base font-medium"><Tags size={16} />标签</h2>
            <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input value={newTagName} onChange={(event) => setNewTagName(event.target.value)} placeholder="名称" className="min-w-0 border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm" />
              <input value={newTagSlug} onChange={(event) => setNewTagSlug(event.target.value)} placeholder="slug（留空自动生成）" className="min-w-0 border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm" />
              <button type="button" disabled={busy} onClick={() => void createTag()} className="flex items-center gap-1 bg-lime-300 px-3 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"><Plus size={15} />新增</button>
            </div>
            <ul className="mt-4 space-y-2">
              {tags.map((tag) => (
                <TagRow key={tag.id} tag={tag} busy={busy} onSave={(patch) => void saveTag(tag, patch)} />
              ))}
              {!tags.length && <p className="py-6 text-center text-sm text-zinc-500">暂无标签</p>}
            </ul>
          </section>
        </div>
      ) : view === "crawl" ? (
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[300px_1fr]">
          <aside className="border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="px-1 pb-2 text-sm font-medium">采集任务</p>
            <div className="space-y-1">
              {crawlTasks.map((task) => (
                <button key={task.id} type="button" onClick={() => void selectTask(task.id)} className={`w-full border px-3 py-3 text-left ${selectedTaskId === task.id ? "border-lime-300 bg-zinc-800" : "border-transparent hover:bg-zinc-800"}`}>
                  <span className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{task.provider}</span>
                    <span className={`shrink-0 text-xs ${task.status === "failed" ? "text-red-400" : task.status === "running" ? "text-lime-300" : "text-zinc-500"}`}>{crawlTaskLabels[task.status]}</span>
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500">候选 {task.candidateCount} · 导入 {task.importedCount} · 重复 {task.duplicateCount}</span>
                  <span className="mt-1 block text-xs text-zinc-600">{new Date(task.startedAt).toLocaleString()}</span>
                </button>
              ))}
              {!crawlTasks.length && <p className="py-8 text-center text-sm text-zinc-500">暂无采集任务</p>}
            </div>
          </aside>

          <section className="min-w-0">
            {!selectedTaskId ? (
              <div className="border border-dashed border-zinc-700 p-10 text-sm text-zinc-500">选择一个采集任务查看记录。</div>
            ) : (
              <div className="space-y-3">
                {crawlTasks.find((task) => task.id === selectedTaskId)?.error && <p className="border border-red-900 p-3 text-sm text-red-300">任务错误：{crawlTasks.find((task) => task.id === selectedTaskId)?.error}</p>}
                {crawlRecords.map((record) => (
                  <article key={record.id} className="border border-zinc-800 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="min-w-0 truncate text-sm font-medium">{record.title}</h3>
                      <span className={`shrink-0 text-xs ${record.status === "failed" ? "text-red-400" : record.status === "imported" ? "text-lime-300" : "text-zinc-500"}`}>{crawlRecordLabels[record.status]}</span>
                    </div>
                    <dl className="mt-2 grid gap-1 text-xs text-zinc-500">
                      <div className="min-w-0 truncate"><dt className="inline">来源：</dt><dd className="inline"><a href={record.pageUrl} target="_blank" rel="noreferrer" className="text-zinc-300 underline underline-offset-2">{record.pageUrl}</a></dd></div>
                      <div className="min-w-0 truncate"><dt className="inline">图片：</dt><dd className="inline">{record.imageUrl}</dd></div>
                      <div><dt className="inline">授权：</dt><dd className="inline">{record.licenseType}</dd></div>
                      {record.wallpaperId && <div className="min-w-0 truncate"><dt className="inline">关联草稿：</dt><dd className="inline">{record.wallpaperId}</dd></div>}
                      {record.error && <div className="text-red-400"><dt className="inline">错误：</dt><dd className="inline">{record.error}</dd></div>}
                    </dl>
                  </article>
                ))}
                {!crawlRecords.length && <p className="border border-dashed border-zinc-700 p-10 text-center text-sm text-zinc-500">该任务还没有采集记录。</p>}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <article key={log.id} className="border border-zinc-800 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="min-w-0 truncate text-sm font-medium">{log.wallpaperTitle ?? "已删除壁纸"}</h3>
                  <span className="shrink-0 text-xs text-zinc-500">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <dl className="mt-2 grid gap-1 text-xs text-zinc-500">
                  <div><dt className="inline">操作：</dt><dd className="inline text-zinc-300">{log.action}</dd></div>
                  <div><dt className="inline">操作者：</dt><dd className="inline">{log.actorName ?? "系统"}</dd></div>
                  {(log.fromStatus || log.toStatus) && <div><dt className="inline">状态：</dt><dd className="inline">{log.fromStatus ?? "—"} → {log.toStatus ?? "—"}</dd></div>}
                  {log.reason && <div className="min-w-0"><dt className="inline">原因：</dt><dd className="inline">{log.reason}</dd></div>}
                </dl>
              </article>
            ))}
            {!auditLogs.length && <p className="border border-dashed border-zinc-700 p-10 text-center text-sm text-zinc-500">暂无操作日志。</p>}
          </div>
        </div>
      )}
    </main>
  );
}

function CategoryRow({ category, busy, onSave }: { category: Category; busy: boolean; onSave: (patch: Partial<Category>) => void }) {
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [enabled, setEnabled] = useState(category.enabled);

  return (
    <li className="grid items-center gap-2 border border-zinc-800 p-3 md:grid-cols-[1fr_1fr_72px_80px_auto]">
      <input value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" />
      <input value={slug} onChange={(event) => setSlug(event.target.value)} className="min-w-0 border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" />
      <input value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="min-w-0 border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" />
      <label className="flex items-center gap-2 text-xs text-zinc-500"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />启用</label>
      <button type="button" disabled={busy} onClick={() => onSave({ name: name.trim(), slug: slug.trim(), sortOrder: Number.parseInt(sortOrder, 10) || 0, enabled })} className="border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500">保存</button>
    </li>
  );
}

function TagRow({ tag, busy, onSave }: { tag: Tag; busy: boolean; onSave: (patch: Partial<Tag>) => void }) {
  const [name, setName] = useState(tag.name);
  const [slug, setSlug] = useState(tag.slug);

  return (
    <li className="grid items-center gap-2 border border-zinc-800 p-3 md:grid-cols-[1fr_1fr_auto]">
      <input value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" />
      <input value={slug} onChange={(event) => setSlug(event.target.value)} className="min-w-0 border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" />
      <button type="button" disabled={busy} onClick={() => onSave({ name: name.trim(), slug: slug.trim() })} className="border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500">保存</button>
    </li>
  );
}
