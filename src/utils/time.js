export const APP_TIME_ZONE = "Asia/Kolkata";

export const formatIstDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    timeZone: APP_TIME_ZONE
  });

export const formatIstTime = (value) =>
  new Date(value).toLocaleTimeString("en-IN", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit"
  });

export const getIstDateInputValue = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
};
