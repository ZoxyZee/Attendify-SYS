export const IST_TIME_ZONE = "Asia/Kolkata";

export const nowUtc = () => new Date();

export const toDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error("Invalid timestamp.");
    error.status = 400;
    throw error;
  }
  return date;
};

export const getIstParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

export const istDateKey = (date = new Date()) => {
  const parts = getIstParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const istDayRange = (date = new Date()) => {
  const key = istDateKey(date);
  const start = new Date(`${key}T00:00:00+05:30`);
  const end = new Date(`${key}T23:59:59.999+05:30`);
  return { start, end };
};

export const istDateRange = (dateKey) => ({
  start: new Date(`${dateKey}T00:00:00+05:30`),
  end: new Date(`${dateKey}T23:59:59.999+05:30`)
});
