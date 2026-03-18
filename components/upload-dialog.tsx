"use client";

import React from "react"

import { useState, useRef } from "react";
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
import { Upload, X } from "lucide-react";

/**
 * Props for the UploadDialog component
 */
interface UploadDialogProps {
  /** Current prefix/folder path where files will be uploaded */
  currentPrefix: string;
  /** Callback when files are uploaded successfully */
  onUpload: (uploads: { file: File; key: string }[]) => Promise<void>;
  /** Whether upload is in progress */
  isUploading?: boolean;
}

/**
 * UploadDialog Component
 * Modal dialog for uploading files to S3
 * Allows users to select a file and optionally customize the object key
 */
export function UploadDialog({
  currentPrefix,
  onUpload,
  isUploading = false,
}: UploadDialogProps) {
  // Dialog open state
  const [open, setOpen] = useState(false);
  // Selected files for upload
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // Custom key name (defaults to file name)
  const [customKey, setCustomKey] = useState("");
  // Error message state
  const [error, setError] = useState("");
  // Reference to hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles file selection from input
   * Sets the selected file and generates default key name
   * @param e - Change event from file input
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      // Preserve custom naming only for single-file uploads.
      setCustomKey(files.length === 1 ? files[0].name : "");
      setError("");
    }
  };

  /**
   * Handles the upload submission
   * Validates file and key, then calls onUpload callback
   */
  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one file to upload");
      return;
    }

    if (selectedFiles.length === 1 && !customKey.trim()) {
      setError("Please enter a file name/key");
      return;
    }

    try {
      const uploads = selectedFiles.map((file, index) => ({
        file,
        key:
          currentPrefix +
          (selectedFiles.length === 1 && index === 0
            ? customKey.trim()
            : file.name),
      }));

      await onUpload(uploads);
      // Reset form and close dialog on success
      setSelectedFiles([]);
      setCustomKey("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  /**
   * Resets form state when dialog is closed
   */
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedFiles([]);
      setCustomKey("");
      setError("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /**
   * Clears the selected file
   */
  const handleClearFile = () => {
    setSelectedFiles([]);
    setCustomKey("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Select one or more files to upload to the current folder.
            {currentPrefix && (
              <span className="mt-1 block text-xs">
                Uploading to: <code className="text-primary">{currentPrefix}</code>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* File input area */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="file">File</Label>
            {selectedFiles.length > 0 ? (
              <div className="rounded-md border border-input bg-background px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    {selectedFiles.length} {selectedFiles.length === 1 ? "file" : "files"} selected
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleClearFile}
                    className="h-6 w-6"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear selection</span>
                  </Button>
                </div>
                <div className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1">
                  {selectedFiles.map((file) => (
                    <p key={`${file.name}-${file.size}-${file.lastModified}`} className="truncate text-sm text-muted-foreground">
                      {file.name}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              // File drop zone / input
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 px-4 py-8 transition-colors hover:border-muted-foreground/50"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select one or more files
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              id="file"
              type="file"
              multiple={true}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Custom key/name input — only shown for single-file uploads */}
          {selectedFiles.length <= 1 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="key">File Name (Key)</Label>
              <Input
                id="key"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="Enter file name"
                disabled={selectedFiles.length === 0}
              />
              <p className="text-xs text-muted-foreground">
                The name the file will have in S3. You can include folders using slashes (e.g., images/photo.jpg)
              </p>
            </div>
          )}

          {selectedFiles.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Each file will be uploaded using its original name into the current folder.
            </p>
          )}

          {/* Error display */}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={selectedFiles.length === 0 || isUploading}
          >
            {isUploading ? "Uploading..." : `Upload${selectedFiles.length > 1 ? ` ${selectedFiles.length} Files` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
