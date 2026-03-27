import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const TIMEZONES = [
  { value: "Pacific/Midway", label: "Pacific/Midway (GMT -11)" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (GMT -10)" },
  { value: "America/Anchorage", label: "America/Anchorage (GMT -9)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (GMT -8)" },
  { value: "America/Denver", label: "America/Denver (GMT -7)" },
  { value: "America/Chicago", label: "America/Chicago (GMT -6)" },
  { value: "America/New_York", label: "America/New_York (GMT -5)" },
  { value: "America/Caracas", label: "America/Caracas (GMT -4)" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo (GMT -3)" },
  { value: "Atlantic/South_Georgia", label: "Atlantic/South_Georgia (GMT -2)" },
  { value: "Atlantic/Azores", label: "Atlantic/Azores (GMT -1)" },
  { value: "UTC", label: "UTC (GMT +0)" },
  { value: "Europe/London", label: "Europe/London (GMT +0/+1)" },
  { value: "Europe/Paris", label: "Europe/Paris (GMT +1)" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul (GMT +3)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GMT +4)" },
  { value: "Asia/Karachi", label: "Asia/Karachi (GMT +5)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (GMT +5:30)" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka (GMT +6)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (GMT +7)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (GMT +8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (GMT +9)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (GMT +10/+11)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (GMT +12/+13)" },
  { value: "Africa/Casablanca", label: "Africa/Casablanca (GMT +0/+1)" },
  { value: "Africa/Cairo", label: "Africa/Cairo (GMT +2)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (GMT +3)" },
];

export function formatDateTime(dateStr: string, timezone: string = "UTC"): string {
  try {
    const date = new Date(dateStr);
    const zonedDate = toZonedTime(date, timezone);
    return format(zonedDate, "yyyy-MM-dd HH:mm:ss");
  } catch {
    return new Date(dateStr).toLocaleString();
  }
}

export function getCurrentTime(timezone: string = "UTC"): string {
  try {
    const zonedDate = toZonedTime(new Date(), timezone);
    return format(zonedDate, "yyyy-MM-dd HH:mm:ss");
  } catch {
    return new Date().toLocaleString();
  }
}
