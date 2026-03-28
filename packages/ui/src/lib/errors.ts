import type { ApiError } from "@/types";

/**
 * Type guard — narrows an unknown error to ApiError.
 * Use this before accessing error.error.code or error.error.message.
 */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ApiError).error?.code === "string"
  );
}

/**
 * Extracts a human-readable message from any error shape.
 * Handles: ApiError, Error, unknown.
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

/**
 * Maps ApiError codes to user-friendly messages.
 * Use when you want more specific copy than the raw backend message.
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (!isApiError(error)) return getErrorMessage(error);

  switch (error.error.code) {
    case "NOT_FOUND":
      return "Not found on the Stellar network. Check the hash or address and try again.";
    case "UPSTREAM_ERROR":
      return "Stellar network is temporarily unreachable — please try again in a moment.";
    case "BAD_REQUEST":
      return error.error.message;
    default:
      return "Something went wrong. Please try again.";
  }
}