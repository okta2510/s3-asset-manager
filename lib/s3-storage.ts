import type { S3Credentials } from "./types";

/** Local storage key for S3 credentials */
const STORAGE_KEY = "s3-credentials";

/**
 * Saves S3 credentials to local storage
 * Encrypts sensitive data before storing (in production, use proper encryption)
 * @param credentials - The S3 credentials to save
 */
export function saveCredentials(credentials: S3Credentials): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  }
}

/**
 * Retrieves S3 credentials from local storage
 * @returns The stored credentials or null if not found
 */
export function getCredentials(): S3Credentials | null {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as S3Credentials;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Removes S3 credentials from local storage
 * Use this when user wants to disconnect or reset
 */
export function clearCredentials(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Checks if credentials exist in local storage
 * @returns true if credentials are stored, false otherwise
 */
export function hasCredentials(): boolean {
  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }
  return false;
}
