export function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  if (isNaN(then)) return isoTimestamp;

  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24)   return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days === 1)   return "yesterday";
  if (days < 30)    return `${days} days ago`;
  if (days < 365)   return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? "" : "s"} ago`;
}
