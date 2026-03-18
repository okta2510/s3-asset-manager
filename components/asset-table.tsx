"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { S3Object } from "@/lib/types";
import {
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  Download,
  Folder,
  File,
  Trash2,
} from "lucide-react";

/**
 * Props for the AssetTable component
 */
interface AssetTableProps {
  /** Array of S3 objects to display */
  objects: (S3Object & { isFolder?: boolean })[];
  /** Current path prefix for breadcrumb navigation */
  currentPrefix: string;
  /** Callback when user navigates into a folder */
  onNavigate: (prefix: string) => void;
  /** Callback when user requests to delete an object */
  onDelete: (key: string) => void;
  /** Callback when user requests to download an object */
  onDownload: (key: string) => void;
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Pagination state */
  pagination: {
    hasMore: boolean;
    continuationToken?: string;
    onLoadMore: () => void;
    onPrevious: () => void;
    onPerPage: (page: number) => void;
    canGoPrevious: boolean;
    currentPage: number;
    perPage: number;
  };
}

/**
 * Formats file size from bytes to human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Formats date to a readable string
 * @param date - Date object or string
 * @returns Formatted date string
 */
function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Extracts the file name from a full S3 key
 * @param key - Full S3 object key
 * @param prefix - Current prefix to remove
 * @returns Just the file/folder name
 */
function getDisplayName(key: string, prefix: string): string {
  const name = key.replace(prefix, "");
  // Remove trailing slash for folders
  return name.endsWith("/") ? name.slice(0, -1) : name;
}

/**
 * AssetTable Component
 * Displays S3 objects in a table format with actions
 * Supports folder navigation, pagination, download, and delete operations
 */
export function AssetTable({
  objects,
  currentPrefix,
  onNavigate,
  onDelete,
  onDownload,
  isLoading = false,
  pagination,
}: AssetTableProps) {
  /**
   * Handles clicking on a folder to navigate into it
   * @param key - The folder's S3 key
   */
  const handleFolderClick = (key: string) => {
    onNavigate(key);
  };

  /**
   * Generates breadcrumb segments from current prefix
   * @returns Array of breadcrumb items with label and path
   */
  const getBreadcrumbs = () => {
    const parts = currentPrefix.split("/").filter(Boolean);
    const breadcrumbs = [{ label: "Root", path: "" }];

    let currentPath = "";
    for (const part of parts) {
      currentPath += `${part}/`;
      breadcrumbs.push({ label: part, path: currentPath });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.path} className="flex items-center gap-1">
            {index > 0 && <span className="text-muted-foreground">/</span>}
            <button
              type="button"
              onClick={() => onNavigate(crumb.path)}
              className={`hover:text-primary ${
                index === breadcrumbs.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </nav>

      {/* Main table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-32">Size</TableHead>
              <TableHead className="w-48">Last Modified</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading state
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="ml-2">Loading assets...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : objects.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <p className="text-muted-foreground">
                    No objects found in this location
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              // Object rows
              objects.map((obj) => (
                <TableRow key={obj.key}>
                  {/* Type icon */}
                  <TableCell>
                    {obj.isFolder ? (
                      <Folder className="h-5 w-5 text-amber-500" />
                    ) : (
                      <File className="h-5 w-5 text-muted-foreground" />
                    )}
                  </TableCell>

                  {/* Name (clickable for folders) */}
                  <TableCell>
                    {obj.isFolder ? (
                      <button
                        type="button"
                        onClick={() => handleFolderClick(obj.key)}
                        className="text-left font-medium hover:text-primary hover:underline"
                      >
                        {getDisplayName(obj.key, currentPrefix)}
                      </button>
                    ) : (
                      <div>
                        {obj.previewUrl ? (
                          <a href={obj.previewUrl} target="_blank">
                          <img
                            src={obj.previewUrl}
                            alt={obj.key}
                            style={{ width: 100, height: 100, objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          </a>
                        ) : (
                          ''
                        )}
                        {obj.previewUrl && (
                          <div className="flex items-center gap-2">
                            <a
                              className="block max-w-[240px] truncate text-sm text-primary underline"
                              target="_blank"
                              rel="noreferrer"
                              href={`${obj.previewUrl}`}
                            >
                              {`${obj.previewUrl}`}
                            </a>
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              className="h-7 px-2 cursor-pointer text-[12px]"
                              onClick={() => {
                              navigator.clipboard.writeText(`${obj.previewUrl}`);
                              const toast = document.createElement("div");
                              toast.className =
                                "fixed bottom-4 right-4 z-50 rounded-md bg-background border shadow-lg px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-2";
                              toast.textContent = "URL copied to clipboard!";
                              document.body.appendChild(toast);
                              setTimeout(() => {
                                toast.classList.add("animate-out", "fade-out", "slide-out-to-bottom-2");
                                toast.addEventListener("animationend", () => toast.remove());
                              }, 2000);
                              }}
                            >
                              Copy URL
                            </Button>
                          </div>
                        )}
                        <span className="font-medium text-[12px] text-gray-500">
                          {getDisplayName(obj.key, currentPrefix)}
                        </span>
                      </div>
                    )}
                  </TableCell>

                  {/* Size */}
                  <TableCell className="text-muted-foreground">
                    {formatFileSize(obj.size)}
                  </TableCell>

                  {/* Last Modified */}
                  <TableCell className="text-muted-foreground">
                    {formatDate(obj.lastModified)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Download button (only for files) */}
                      {!obj.isFolder && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="cursor-pointer"
                          onClick={() => onDownload(obj.key)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Download</span>
                        </Button>
                      )}

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(obj.key)}
                        title="Delete"
                        className="text-destructive hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {pagination.currentPage}
          {objects.length > 0 && ` • ${objects.length} items`}
           <select
            value={pagination.perPage}
            onChange={(e) => {
              const newPerPage = Number(e.target.value);
              pagination.onPerPage(newPerPage); // updates perPage state
              // Refetch with new per-page value
              // fetchObjects(currentPrefix, undefined, false, newPerPage);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={pagination.onPrevious}
            disabled={!pagination.canGoPrevious || isLoading}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={pagination.onLoadMore}
            disabled={!pagination.hasMore || isLoading}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
