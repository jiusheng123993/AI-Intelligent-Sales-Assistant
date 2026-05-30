/**
 * 推荐 Tab — 展示 AI 流式推荐结果。
 */
import { useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import {
  attachSuggestionRuntimeListener,
  useSuggestionsStore,
} from '../stores/suggestions.store';

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

export function SuggestionsTab() {
  const status = useSuggestionsStore((s) => s.status);
  const text = useSuggestionsStore((s) => s.text);
  const error = useSuggestionsStore((s) => s.error);
  const clear = useSuggestionsStore((s) => s.clear);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    attachSuggestionRuntimeListener();
  }, []);

  if (status === 'idle') {
    return (
      <EmptyState
        title="暂无推荐"
        hint="在受支持站点（企微/WhatsApp Web）点击 ✨，或后续使用快捷键触发 AI 推荐。"
      />
    );
  }

  if (status === 'error') {
    return (
      <EmptyState
        title="推荐失败"
        hint={error ?? '生成推荐时发生异常'}
        action={
          <button type="button" onClick={clear} className="rounded bg-gray-100 px-3 py-1.5 text-xs">
            清空
          </button>
        }
      />
    );
  }

  return (
    <div className="p-4 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">AI 推荐</h2>
        <span className="text-xs text-gray-500">{status === 'streaming' ? '生成中…' : '已完成'}</span>
      </div>
      <div className="min-h-32 whitespace-pre-wrap rounded border border-gray-200 bg-white p-3 leading-6 text-gray-800">
        {text}
        {status === 'streaming' && <span className="animate-pulse text-brand">▍</span>}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!text}
          onClick={async () => {
            await copyText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="rounded bg-brand px-3 py-1.5 text-xs text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {copied ? '已复制' : '复制'}
        </button>
        <button type="button" onClick={clear} className="rounded bg-gray-100 px-3 py-1.5 text-xs">
          清空
        </button>
      </div>
    </div>
  );
}
