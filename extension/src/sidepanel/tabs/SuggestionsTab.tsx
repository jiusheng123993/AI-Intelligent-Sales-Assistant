/**
 * 推荐 Tab — A4 仅提供空态；A6 子任务将接入 SSE 流式推荐。
 */
import { EmptyState } from '../components/EmptyState';

export function SuggestionsTab() {
  return (
    <EmptyState
      title="暂无推荐"
      hint="在受支持站点（企微/WhatsApp Web）选中对话或按 Ctrl+Shift+L 触发 AI 推荐。"
    />
  );
}
