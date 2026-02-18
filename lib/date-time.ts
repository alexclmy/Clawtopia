const shortDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

export function formatShortDateTime(iso: string) {
  return shortDateTimeFormatter.format(new Date(iso));
}

export function formatTimeOrDash(iso: string | null) {
  if (!iso) {
    return "--";
  }

  return timeFormatter.format(new Date(iso));
}

export function formatDateTimeOrNever(iso: string | null) {
  if (!iso) {
    return "never";
  }

  return dateTimeFormatter.format(new Date(iso));
}
