/**
 * 通用加载占位。
 */
export interface LoadingStateProps {
  text?: string;
}

export function LoadingState({ text = '加载中…' }: LoadingStateProps) {
  return (
    <div role="status" className="p-6 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}
