import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractErrorMessage(error: unknown): string | undefined {
  if (error && typeof error === "object") {
    const candidate = error as {
      data?: { error?: unknown };
      message?: unknown;
    };
    if (candidate.data && typeof candidate.data === "object") {
      const inner = candidate.data.error;
      if (typeof inner === "string" && inner.length > 0) return inner;
    }
    if (typeof candidate.message === "string" && candidate.message.length > 0) {
      return candidate.message;
    }
  }
  return undefined;
}
