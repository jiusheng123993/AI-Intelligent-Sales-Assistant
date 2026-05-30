/**
 * 话术库 Tab — A4 仅提供空态；A7 子任务将接入 CRUD。
 */
import { EmptyState } from '../components/EmptyState';

export function PhrasebookTab() {
  return (
    <EmptyState
      title="话术库为空"
      hint="A7 子任务将提供个人话术库的新增 / 编辑 / 删除 / 标签管理。"
    />
  );
}
