/**
 * 复用空状态展示组件。
 */
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-500"
    >
      <div className="text-base font-medium text-gray-700">{title}</div>
      {hint && <div className="text-xs text-gray-500">{hint}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
