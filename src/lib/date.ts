function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toDate(input: string) {
  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function formatUtcDate(input: string) {
  const date = toDate(input);

  if (!date) {
    return "Invalid date";
  }

  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} UTC`;
}

export function formatUtcDateTime(input: string) {
  const date = toDate(input);

  if (!date) {
    return "Invalid date";
  }

  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())} UTC`;
}
