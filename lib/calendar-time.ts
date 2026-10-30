const IST_TIME_ZONE = "Asia/Kolkata";

interface DateTimeFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const istDateTimePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TIME_ZONE,
  calendar: "gregory",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const istCalendarDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: IST_TIME_ZONE,
  calendar: "gregory",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const getIstDateTimeFields = (date: Date): DateTimeFields | null => {
  const parts = istDateTimePartsFormatter.formatToParts(date);
  const getValue = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((part) => part.type === type)?.value;
    return value === undefined ? null : Number(value);
  };
  const year = getValue("year");
  const month = getValue("month");
  const day = getValue("day");
  const hour = getValue("hour");
  const minute = getValue("minute");

  if (
    year === null ||
    month === null ||
    day === null ||
    hour === null ||
    minute === null ||
    ![year, month, day, hour, minute].every(Number.isInteger)
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
    hour,
    minute,
  };
};

const fieldsAsUtcTimestamp = ({ year, month, day, hour, minute }: DateTimeFields) => {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, 0, 0);
  return date.getTime();
};

export const isoToIstDateTimeInput = (value: string): string => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const fields = getIstDateTimeFields(new Date(timestamp));
  if (!fields) return "";

  const pad = (number: number) => String(number).padStart(2, "0");
  return `${String(fields.year).padStart(4, "0")}-${pad(fields.month)}-${pad(fields.day)}T${pad(fields.hour)}:${pad(fields.minute)}`;
};

export const istDateTimeInputToIso = (value: string): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const fields: DateTimeFields = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
  };
  const intendedTimestamp = fieldsAsUtcTimestamp(fields);
  const normalizedDate = new Date(intendedTimestamp);
  if (
    normalizedDate.getUTCFullYear() !== fields.year ||
    normalizedDate.getUTCMonth() !== fields.month - 1 ||
    normalizedDate.getUTCDate() !== fields.day ||
    normalizedDate.getUTCHours() !== fields.hour ||
    normalizedDate.getUTCMinutes() !== fields.minute
  ) {
    return null;
  }

  let timestamp = intendedTimestamp;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const currentFields = getIstDateTimeFields(new Date(timestamp));
    if (!currentFields) return null;

    const adjustment = intendedTimestamp - fieldsAsUtcTimestamp(currentFields);
    timestamp += adjustment;
    if (adjustment === 0) break;
  }

  const roundTripFields = getIstDateTimeFields(new Date(timestamp));
  if (
    roundTripFields === null ||
    roundTripFields.year !== fields.year ||
    roundTripFields.month !== fields.month ||
    roundTripFields.day !== fields.day ||
    roundTripFields.hour !== fields.hour ||
    roundTripFields.minute !== fields.minute
  ) {
    return null;
  }

  return new Date(timestamp).toISOString();
};

export const formatIstCalendarDateTime = (value: string): string => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? istCalendarDateTimeFormatter.format(date) : "";
};
