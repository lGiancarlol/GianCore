import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
    ...opts,
  }).format(new Date(date));
}

export function truncate(str: string, len = 32) {
  return str.length > len ? str.slice(0, len) + "…" : str;
}

export function generateKey(): string {
  const seg = () => Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${seg()}-${seg()}-${seg()}-${seg()}`;
}
