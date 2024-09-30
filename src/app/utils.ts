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
