/**
 * S3 Credentials interface
 * Stores the configuration needed to connect to an S3-compatible storage service
 */
export interface S3Credentials {
  /** The S3-compatible endpoint URL (e.g., https://s3.amazonaws.com or custom endpoint) */
  endpoint: string;
  /** AWS region or custom region for the S3 service */
  region: string;
  /** Access key ID for authentication */
  accessKeyId: string;
  /** Secret access key for authentication */
  secretAccessKey: string;
  /** Currently selected bucket name */
  bucket?: string;
}

/**
 * S3 Object interface
 * Represents a single file/object stored in S3
 */
export interface S3Object {
  /** The unique key (path) of the object in the bucket */
  key: string;
  /** Last modification date of the object */
  lastModified: Date;
  /** Size of the object in bytes */
  size: number;
  /** ETag hash of the object content */
  etag?: string;
  /** Storage class of the object (STANDARD, GLACIER, etc.) */
  storageClass?: string;
  previewUrl?: string
}

/**
 * Paginated response interface
 * Used for listing objects with pagination support
 */
export interface PaginatedResponse {
  /** Array of S3 objects in the current page */
  objects: S3Object[];
  /** Token for fetching the next page, undefined if no more pages */
  nextContinuationToken?: string;
  /** Whether there are more objects to fetch */
  isTruncated: boolean;
  /** Current prefix/folder being viewed */
  prefix?: string;
}

/**
 * Bucket interface
 * Represents an S3 bucket
 */
export interface Bucket {
  /** Name of the bucket */
  name: string;
  /** Creation date of the bucket */
  creationDate?: Date;
}
