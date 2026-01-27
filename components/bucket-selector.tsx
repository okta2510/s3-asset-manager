"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Bucket } from "@/lib/types";

/**
 * Props for the BucketSelector component
 */
interface BucketSelectorProps {
  /** List of available buckets to select from */
  buckets: Bucket[];
  /** Currently selected bucket name */
  selectedBucket: string | undefined;
  /** Callback when a bucket is selected */
  onSelect: (bucketName: string) => void;
  /** Whether the selector is in loading state */
  isLoading?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * BucketSelector Component
 * Renders a dropdown to select an S3 bucket from the available list
 * Uses shadcn Select component for consistent styling
 */
export function BucketSelector({
  buckets,
  selectedBucket,
  onSelect,
  isLoading = false,
  disabled = false,
}: BucketSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="bucket-select"
        className="text-sm font-medium text-foreground"
      >
        Select Bucket
      </label>
      <Select
        value={selectedBucket}
        onValueChange={onSelect}
        disabled={disabled || isLoading || buckets.length === 0}
      >
        <SelectTrigger id="bucket-select" className="w-full max-w-xs">
          <SelectValue
            placeholder={
              isLoading
                ? "Loading buckets..."
                : buckets.length === 0
                  ? "No buckets available"
                  : "Choose a bucket"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {buckets.map((bucket) => (
            <SelectItem key={bucket.name} value={bucket.name}>
              {bucket.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Show bucket count for reference */}
      {buckets.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {buckets.length} bucket{buckets.length !== 1 ? "s" : ""} available
        </p>
      )}
    </div>
  );
}
