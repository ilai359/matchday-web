export function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatFullDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  // Compare calendar dates (midnight to midnight), not a rolling window -
  // so anything from earlier today just says "Today" instead of counting
  // out the exact hour, and a 9pm article read at 7am the next day says
  // "Yesterday" rather than "10h ago".
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfThatDay.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}