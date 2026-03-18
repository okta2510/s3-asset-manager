"use client";

import React from "react"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

/**
 * Props for the CreateBucketDialog component
 */
interface CreateBucketDialogProps {
  /** Callback when bucket is created successfully */
  onCreate: (bucketName: string) => Promise<void>;
  /** Whether creation is in progress */
  isCreating?: boolean;
}

/**
 * CreateBucketDialog Component
 * Modal dialog for creating new S3 buckets
 * Validates bucket name according to S3 naming rules
 */
export function CreateBucketDialog({
  onCreate,
  isCreating = false,
}: CreateBucketDialogProps) {
  // Dialog open state
  const [open, setOpen] = useState(false);
  // Bucket name input
  const [bucketName, setBucketName] = useState("");
  // Error message state
  const [error, setError] = useState("");

  /**
   * Validates bucket name according to S3 naming rules
   * @param name - Proposed bucket name
   * @returns Error message or empty string if valid
   */
  const validateBucketName = (name: string): string => {
    if (name.length < 3 || name.length > 63) {
      return "Bucket name must be between 3 and 63 characters";
    }
    if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(name)) {
      return "Bucket name must start and end with a letter or number";
    }
    if (/[A-Z]/.test(name)) {
      return "Bucket name must not contain uppercase letters";
    }
    if (/\.\./.test(name)) {
      return "Bucket name must not contain consecutive periods";
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) {
      return "Bucket name must not be formatted as an IP address";
    }
    return "";
  };

  /**
   * Handles bucket name input changes
   * Clears previous errors and validates on change
   */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setBucketName(value);
    setError("");
  };

  /**
   * Handles form submission
   * Validates bucket name and calls onCreate callback
   */
  const handleSubmit = async () => {
    const validationError = validateBucketName(bucketName);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await onCreate(bucketName);
      // Reset form and close dialog on success
      setBucketName("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bucket");
    }
  };

  /**
   * Resets form state when dialog is closed
   */
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setBucketName("");
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          New Bucket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Bucket</DialogTitle>
          <DialogDescription>
            Enter a name for your new S3 bucket. Bucket names must be globally unique.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bucketName">Bucket Name</Label>
            <Input
              id="bucketName"
              value={bucketName}
              onChange={handleNameChange}
              placeholder="my-bucket-name"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Must be 3-63 characters, lowercase letters, numbers, hyphens, and periods only.
            </p>
          </div>

          {/* Error display */}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!bucketName || isCreating}
          >
            {isCreating ? "Creating..." : "Create Bucket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
