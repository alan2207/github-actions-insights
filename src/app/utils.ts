import { useCallback, useRef } from "react";

export const calculateDuration = (startedAt: string, completedAt: string) => {
  const started = new Date(startedAt);
  const completed = new Date(completedAt);
  return completed.getTime() - started.getTime();
};

export const formatDuration = (duration: number) => {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}m ${seconds}s`;
};

export function useDebounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

export const downloadContent = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
