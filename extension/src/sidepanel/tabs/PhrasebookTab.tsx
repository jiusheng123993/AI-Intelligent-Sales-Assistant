/**
 * 话术库 Tab — 本地优先 CRUD。
 */
import { useEffect, useState, type FormEvent } from 'react';
import { usePhrasebookStore } from '../stores/phrasebook.store';
import type { Phrase } from '@shared/phrasebook/types';

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function parseTags(v: string): string[] {
  return v
    .split(/[，,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function PhrasebookTab() {
  const load = usePhrasebookStore((s) => s.load);
  const create = usePhrasebookStore((s) => s.create);
  const remove = usePhrasebookStore((s) => s.remove);
  const setQuery = usePhrasebookStore((s) => s.setQuery);
  const setActiveTag = usePhrasebookStore((s) => s.setActiveTag);
  const filtered = usePhrasebookStore((s) => s.filtered());
  const tags = usePhrasebookStore((s) => s.tags());
  const query = usePhrasebookStore((s) => s.query);
  const activeTag = usePhrasebookStore((s) => s.activeTag);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagText, setTagText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await create({ title, content, tags: parseTags(tagText) });
      setTitle('');
      setContent('');
      setTagText('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onCopy(p: Phrase): Promise<void> {
    await copyText(p.content);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 1000);
  }

  return (
    <div className="p-4 text-sm">
      <h2 className="text-base font-semibold text-gray-800">个人话术库</h2>

      <form
        aria-label="新增话术表单"
        onSubmit={onSubmit}
        className="mt-3 rounded border border-gray-200 bg-white p-3"
      >
        <input
          aria-label="话术标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（1-30字）"
          className="w-full rounded border border-gray-300 px-2 py-1.5 outline-none focus:border-brand"
        />
        <textarea
          aria-label="话术内容"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="话术内容（1-500字）"
          className="mt-2 min-h-20 w-full rounded border border-gray-300 px-2 py-1.5 outline-none focus:border-brand"
        />
        <input
          aria-label="话术标签"
          value={tagText}
          onChange={(e) => setTagText(e.target.value)}
          placeholder="标签，用逗号分隔，最多5个"
          className="mt-2 w-full rounded border border-gray-300 px-2 py-1.5 outline-none focus:border-brand"
        />
        {error && <div className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">{error}</div>}
        <button type="submit" className="mt-2 rounded bg-brand px-3 py-1.5 text-xs text-white">
          新增话术
        </button>
      </form>

      <div className="mt-3 flex gap-2">
        <input
          aria-label="搜索话术"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索标题或内容"
          className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1.5 outline-none focus:border-brand"
        />
        <select
          aria-label="标签筛选"
          value={activeTag ?? ''}
          onChange={(e) => setActiveTag(e.target.value || null)}
          className="rounded border border-gray-300 px-2 py-1.5"
        >
          <option value="">全部标签</option>
          {tags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 text-center text-sm text-gray-500">话术库为空</div>
      ) : (
        <div className="mt-3 space-y-2">
          {filtered.map((p) => (
            <article key={p.id} className="rounded border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-gray-800">{p.title}</h3>
                <button type="button" onClick={() => remove(p.id)} className="text-xs text-red-500">
                  删除
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-gray-700">{p.content}</p>
              {p.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <span key={t} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{t}</span>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => onCopy(p)}
                className="mt-2 rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
              >
                {copiedId === p.id ? '已复制' : '复制'}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
