import { type ClassValue, clsx } from "clsx";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return formatInTimeZone(d, "Asia/Kolkata", "dd MMM yyyy");
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return formatInTimeZone(d, "Asia/Kolkata", "hh:mm a");
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return formatInTimeZone(d, "Asia/Kolkata", "dd MMM yyyy, hh:mm a");
}

export function formatDateTO(timestamp: string | Date) {
  return formatInTimeZone(new Date(timestamp), "Asia/Kolkata", "hh:mm:ss a");
}

export function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+91[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

export function calculateDeliveryFee(distance: number): number {
  const baseFee = 20; // Base delivery fee
  const perKmFee = 5; // Additional fee per km
  return baseFee + Math.ceil(distance) * perKmFee;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function generateOrderNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `TK${timestamp}${random}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  if (count === 1) return singular;
  return plural || singular + "s";
}

export function convertSeconds(seconds: number): string {
  if (seconds <= 0) return "0 seconds";

  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds
      ? `${minutes} minutes ${remainingSeconds} seconds`
      : `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    if (remainingSeconds && remainingMinutes) {
      return `${hours} hours ${remainingMinutes} minutes ${remainingSeconds} seconds`;
    }

    if (remainingMinutes) {
      return `${hours} hours ${remainingMinutes} minutes`;
    }

    return `${hours} hours`;
  }

  const days = Math.floor(hours / 24);
  return `${days} days`;
}

export function getLocalDateString(
  date = new Date(),
  timeZone = "Asia/Kolkata",
) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

export function DateRange(startDate?: string, endDate?: string) {
  const start = startDate ? new Date(`${startDate}T00:00:00+05:30`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999+05:30`) : null;

  return {
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null,
  };
}

// Convert decimal hours to H:M format
export function formatHoursToHM(hours: number | null): string {
  if (hours === null || hours === undefined) return "";

  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// Convert H:M format to decimal hours
export function parseHMToHours(hm: string): number | null {
  if (!hm || !hm.includes(":")) return null;

  const [h, m] = hm.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  return Math.round((h + m / 60) * 100) / 100; // Round to 2 decimal places
}

// Validate H:M format
export function isValidHMFormat(value: string): boolean {
  const hmRegex = /^\d{1,2}:\d{2}$/;
  if (!hmRegex.test(value)) return false;

  const [h, m] = value.split(":").map(Number);
  return h >= 0 && h <= 24 && m >= 0 && m <= 59;
}

export const bgColorRadom = () => {
  const colors = [
    "bg-purple-500",
    "bg-red-300",
    "bg-yellow-600",
    "bg-sky-500",
    "bg-pink-300",
    "bg-green-400",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-orange-400",
    "bg-teal-400",
    "bg-cyan-500",
    "bg-lime-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-fuchsia-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-stone-500",
    "bg-neutral-500",
    "bg-slate-500",
  ];
  const indexRadom = Math.floor(Math.random() * colors.length);
  return colors[indexRadom];
};
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Copy failed", err);
    return false;
  }
};
/**
 * Sanitizes and validates action URL path
 * - Removes protocol + domain if pasted
 * - Ensures it starts with "/"
 * - Prevents query abuse
 */
export function sanitizeActionPath(input: string): {
  value: string;
  isValid: boolean;
  error?: string;
} {
  if (!input) {
    return { value: "", isValid: false };
  }

  let value = input.trim();

  // ❌ If full URL pasted → extract pathname
  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const url = new URL(value);
      value = url.pathname;
    }
  } catch {
    return {
      value: "",
      isValid: false,
      error: "Invalid URL format",
    };
  }

  // ✅ Ensure leading slash
  if (!value.startsWith("/")) {
    value = "/" + value;
  }

  // ❌ Block spaces
  if (/\s/.test(value)) {
    return {
      value,
      isValid: false,
      error: "Path must not contain spaces",
    };
  }

  // ❌ Block protocol leftovers
  if (value.includes("://")) {
    return {
      value: "",
      isValid: false,
      error: "Only end path is allowed",
    };
  }

  // ❌ Block domain-like input
  if (value.includes(".")) {
    return {
      value: "",
      isValid: false,
      error: "Domain names are not allowed",
    };
  }

  return {
    value,
    isValid: true,
  };
}
export function sanitizeMsg91Text(message?: string): string {
  if (!message) return "";

  return message
    .replace(/\n+/g, " ") // remove new lines
    .replace(/\s+/g, " ") // normalize spaces
    .trim();
}

export function getCurrentTime() {
  return new Date();
}
