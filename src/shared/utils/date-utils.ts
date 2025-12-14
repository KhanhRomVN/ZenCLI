/**
 * Date utilities for ZenCLI
 */

/**
 * Format a date to a readable string
 * @param date Date to format
 * @param format Format string or predefined format name
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | number | string,
  format: string | "short" | "medium" | "long" | "full" = "medium"
): string {
  const d =
    typeof date === "number"
      ? new Date(date)
      : typeof date === "string"
        ? new Date(date)
        : date;

  if (isNaN(d.getTime())) {
    return "Invalid date";
  }

  if (
    typeof format === "string" &&
    !["short", "medium", "long", "full"].includes(format)
  ) {
    // Custom format string
    return format
      .replace(/yyyy/g, d.getFullYear().toString())
      .replace(/yy/g, d.getFullYear().toString().slice(-2))
      .replace(/MM/g, (d.getMonth() + 1).toString().padStart(2, "0"))
      .replace(/M/g, (d.getMonth() + 1).toString())
      .replace(/dd/g, d.getDate().toString().padStart(2, "0"))
      .replace(/d/g, d.getDate().toString())
      .replace(/HH/g, d.getHours().toString().padStart(2, "0"))
      .replace(/H/g, d.getHours().toString())
      .replace(/hh/g, (d.getHours() % 12 || 12).toString().padStart(2, "0"))
      .replace(/h/g, (d.getHours() % 12 || 12).toString())
      .replace(/mm/g, d.getMinutes().toString().padStart(2, "0"))
      .replace(/m/g, d.getMinutes().toString())
      .replace(/ss/g, d.getSeconds().toString().padStart(2, "0"))
      .replace(/s/g, d.getSeconds().toString())
      .replace(/a/g, d.getHours() < 12 ? "AM" : "PM")
      .replace(/A/g, d.getHours() < 12 ? "am" : "pm");
  }

  // Predefined formats
  switch (format) {
    case "short":
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    case "medium":
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    case "long":
      return d.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    case "full":
      return d.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });
    default:
      return d.toLocaleString("vi-VN");
  }
}

/**
 * Format a time duration in a human-readable way
 * @param ms Duration in milliseconds
 * @returns Human-readable duration string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} ngày ${hours % 24} giờ`;
  } else if (hours > 0) {
    return `${hours} giờ ${minutes % 60} phút`;
  } else if (minutes > 0) {
    return `${minutes} phút ${seconds % 60} giây`;
  } else if (seconds > 0) {
    return `${seconds} giây`;
  } else {
    return `${ms} ms`;
  }
}

/**
 * Calculate relative time (e.g., "2 hours ago")
 * @param date Date to calculate relative time from
 * @returns Relative time string
 */
export function timeAgo(date: Date | number | string): string {
  const d =
    typeof date === "number"
      ? new Date(date)
      : typeof date === "string"
        ? new Date(date)
        : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) {
    return `${diffYear} năm trước`;
  } else if (diffMonth > 0) {
    return `${diffMonth} tháng trước`;
  } else if (diffWeek > 0) {
    return `${diffWeek} tuần trước`;
  } else if (diffDay > 0) {
    return `${diffDay} ngày trước`;
  } else if (diffHour > 0) {
    return `${diffHour} giờ trước`;
  } else if (diffMin > 0) {
    return `${diffMin} phút trước`;
  } else if (diffSec > 30) {
    return `${diffSec} giây trước`;
  } else {
    return "vừa xong";
  }
}

/**
 * Check if a date is today
 * @param date Date to check
 * @returns True if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is yesterday
 * @param date Date to check
 * @returns True if date is yesterday
 */
export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Check if a date is in the current week
 * @param date Date to check
 * @returns True if date is in current week
 */
export function isThisWeek(date: Date): boolean {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return date >= startOfWeek && date < endOfWeek;
}

/**
 * Check if a date is in the current month
 * @param date Date to check
 * @returns True if date is in current month
 */
export function isThisMonth(date: Date): boolean {
  const now = new Date();
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

/**
 * Get the start of day for a date
 * @param date Date to get start of day for
 * @returns Start of day date
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of day for a date
 * @param date Date to get end of day for
 * @returns End of day date
 */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get the start of week for a date
 * @param date Date to get start of week for
 * @param startDay Day that the week starts on (0 = Sunday, 1 = Monday)
 * @returns Start of week date
 */
export function startOfWeek(date: Date, startDay: number = 0): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day < startDay ? 7 - startDay + day : day - startDay;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of week for a date
 * @param date Date to get end of week for
 * @param startDay Day that the week starts on (0 = Sunday, 1 = Monday)
 * @returns End of week date
 */
export function endOfWeek(date: Date, startDay: number = 0): Date {
  const start = startOfWeek(date, startDay);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setMilliseconds(-1);
  return end;
}

/**
 * Get the start of month for a date
 * @param date Date to get start of month for
 * @returns Start of month date
 */
export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of month for a date
 * @param date Date to get end of month for
 * @returns End of month date
 */
export function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Add days to a date
 * @param date Base date
 * @param days Number of days to add (can be negative)
 * @returns New date
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Add months to a date
 * @param date Base date
 * @param months Number of months to add (can be negative)
 * @returns New date
 */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Add years to a date
 * @param date Base date
 * @param years Number of years to add (can be negative)
 * @returns New date
 */
export function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

/**
 * Get the difference between two dates in days
 * @param date1 First date
 * @param date2 Second date
 * @returns Difference in days
 */
export function diffInDays(date1: Date, date2: Date): number {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get the difference between two dates in hours
 * @param date1 First date
 * @param date2 Second date
 * @returns Difference in hours
 */
export function diffInHours(date1: Date, date2: Date): number {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * Get the difference between two dates in minutes
 * @param date1 First date
 * @param date2 Second date
 * @returns Difference in minutes
 */
export function diffInMinutes(date1: Date, date2: Date): number {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Check if a year is a leap year
 * @param year Year to check
 * @returns True if leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get the number of days in a month
 * @param year Year
 * @param month Month (0-11)
 * @returns Number of days in month
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Parse a date string with multiple formats
 * @param dateString Date string to parse
 * @param formats Array of format strings to try
 * @returns Parsed date or null
 */
export function parseDate(
  dateString: string,
  formats: string[] = [
    "yyyy-MM-dd",
    "dd/MM/yyyy",
    "MM/dd/yyyy",
    "yyyy/MM/dd",
    "dd-MM-yyyy",
    "MM-dd-yyyy",
  ]
): Date | null {
  for (const format of formats) {
    const date = parseDateWithFormat(dateString, format);
    if (date && !isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

/**
 * Parse a date string with a specific format
 * @param dateString Date string to parse
 * @param format Format string
 * @returns Parsed date or null
 */
function parseDateWithFormat(dateString: string, format: string): Date | null {
  const formatParts = format.match(
    /(yyyy|yy|MM|M|dd|d|HH|H|hh|h|mm|m|ss|s|a|A)/g
  );
  if (!formatParts) return null;

  const dateParts: Record<string, number> = {};
  let remainingString = dateString;

  for (const part of formatParts) {
    const index = format.indexOf(part);
    if (index === -1) continue;

    let value: string;
    if (part.length === 2) {
      value = remainingString.slice(index, index + 2);
    } else {
      // For single character format, find until next format character or end
      const nextIndex = format.indexOf(part, index + 1);
      const endIndex = nextIndex === -1 ? remainingString.length : nextIndex;
      value = remainingString.slice(index, endIndex);
    }

    switch (part) {
      case "yyyy":
      case "yy":
        dateParts.year = parseInt(value, 10);
        if (part === "yy" && dateParts.year < 100) {
          // Handle two-digit years
          dateParts.year += dateParts.year < 50 ? 2000 : 1900;
        }
        break;
      case "MM":
      case "M":
        dateParts.month = parseInt(value, 10) - 1;
        break;
      case "dd":
      case "d":
        dateParts.day = parseInt(value, 10);
        break;
      case "HH":
      case "H":
      case "hh":
      case "h":
        dateParts.hour = parseInt(value, 10);
        if (
          (part === "hh" || part === "h") &&
          remainingString.toLowerCase().includes("pm")
        ) {
          dateParts.hour += 12;
        }
        break;
      case "mm":
      case "m":
        dateParts.minute = parseInt(value, 10);
        break;
      case "ss":
      case "s":
        dateParts.second = parseInt(value, 10);
        break;
    }
  }

  if (dateParts.year === undefined) dateParts.year = new Date().getFullYear();
  if (dateParts.month === undefined) dateParts.month = 0;
  if (dateParts.day === undefined) dateParts.day = 1;
  if (dateParts.hour === undefined) dateParts.hour = 0;
  if (dateParts.minute === undefined) dateParts.minute = 0;
  if (dateParts.second === undefined) dateParts.second = 0;

  return new Date(
    dateParts.year,
    dateParts.month,
    dateParts.day,
    dateParts.hour,
    dateParts.minute,
    dateParts.second
  );
}

/**
 * Format a date as ISO string without milliseconds
 * @param date Date to format
 * @returns ISO string without milliseconds
 */
export function toISOStringWithoutMs(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Get the current timestamp in milliseconds
 * @returns Current timestamp
 */
export function now(): number {
  return Date.now();
}

/**
 * Get the current timestamp in seconds
 * @returns Current timestamp in seconds
 */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a date from year, month, and day
 * @param year Year
 * @param month Month (1-12)
 * @param day Day (1-31)
 * @returns Date object
 */
export function createDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

/**
 * Check if two dates are on the same day
 * @param date1 First date
 * @param date2 Second date
 * @returns True if same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

/**
 * Check if two dates are in the same month
 * @param date1 First date
 * @param date2 Second date
 * @returns True if same month
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

/**
 * Check if two dates are in the same year
 * @param date1 First date
 * @param date2 Second date
 * @returns True if same year
 */
export function isSameYear(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear();
}

/**
 * Get the age from a birth date
 * @param birthDate Birth date
 * @returns Age in years
 */
export function getAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Get the week number of a date
 * @param date Date to get week number for
 * @returns Week number (1-53)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return weekNo;
}

/**
 * Get the quarter of a date
 * @param date Date to get quarter for
 * @returns Quarter number (1-4)
 */
export function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

/**
 * Get the fiscal year start and end dates
 * @param year Fiscal year
 * @param startMonth Starting month (1-12)
 * @returns Object with start and end dates
 */
export function getFiscalYear(
  year: number,
  startMonth: number = 4
): {
  start: Date;
  end: Date;
} {
  const start = new Date(year, startMonth - 1, 1);
  const end = new Date(year + 1, startMonth - 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
