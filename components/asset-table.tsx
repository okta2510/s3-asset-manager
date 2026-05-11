"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ChevronRight,
  Download,
  Folder,
  File,
  Trash2,
  Pencil,
  Check,
  X,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
} from "lucide-react";

type SortField = "name" | "size" | "lastModified" | "type";
type SortDir = "asc" | "desc";
type ViewMode = "list" | "grid";
type SortOption = "name-asc" | "name-desc" | "size" | "type" | "last-modified";

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
  /** Callback when user renames an object */
  onRename?: (oldKey: string, newKey: string) => Promise<void>;
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
  onRename,
  isLoading = false,
  pagination,
}: AssetTableProps) {
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(
    null
  );
  const sortOption: SortOption = (() => {
    if (sortField === "name") return sortDir === "asc" ? "name-asc" : "name-desc";
    if (sortField === "size") return "size";
    if (sortField === "type") return "type";
    if (sortField === "lastModified") return "last-modified";
    return "name-asc";
  })();

  const filteredObjects = searchQuery.trim()
    ? objects.filter((obj) =>
        getDisplayName(obj.key, currentPrefix)
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      )
    : objects;

  /**
   * Applies the active sort to the filtered list.
   * Folders are always grouped before files.
   */
  const sortedObjects = [...filteredObjects].sort((a, b) => {
    // Folders always first, regardless of sort direction
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;

    let cmp = 0;
    if (sortField === "name") {
      cmp = getDisplayName(a.key, currentPrefix).localeCompare(
        getDisplayName(b.key, currentPrefix)
      );
    } else if (sortField === "size") {
      cmp = a.size - b.size;
    } else if (sortField === "lastModified") {
      const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      cmp = aTime - bTime;
    } else if (sortField === "type") {
      const aExt = a.key.split(".").pop()?.toLowerCase() ?? "";
      const bExt = b.key.split(".").pop()?.toLowerCase() ?? "";
      cmp = aExt.localeCompare(bExt);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const visibleObjects = sortedObjects.filter(
    (obj) => obj.isFolder || Boolean(obj.lastModified) || obj.size > 0
  );

  /** Toggles sort: if already on this field, flip direction; otherwise set field + asc */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  /** Returns the icon to display next to a column header */
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 inline" />
      : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  };

  const handleSortOptionChange = (option: SortOption) => {
    if (option === "name-asc") {
      setSortField("name");
      setSortDir("asc");
      return;
    }
    if (option === "name-desc") {
      setSortField("name");
      setSortDir("desc");
      return;
    }
    if (option === "size") {
      setSortField("size");
      setSortDir("asc");
      return;
    }
    if (option === "type") {
      setSortField("type");
      setSortDir("asc");
      return;
    }
    setSortField("lastModified");
    setSortDir("asc");
  };

  const isNestedInteractiveElement = (target: EventTarget | null) =>
    target instanceof Element &&
    !!target.closest("button, a, input, select, textarea, label");

  const showToast = (message: string, isError = false) => {
    const toast = document.createElement("div");
    const baseClass =
      "fixed bottom-4 right-4 z-50 rounded-md border shadow-lg px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-2";
    const variantClass = isError
      ? "bg-destructive text-destructive-foreground"
      : "bg-background";
    toast.className = `${baseClass} ${variantClass}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("animate-out", "fade-out", "slide-out-to-bottom-2");
      toast.addEventListener("animationend", () => toast.remove());
    }, 2000);
  };

  const handleGridCardOpen = (obj: (typeof objects)[number]) => {
    if (renamingKey !== null) return;
    if (obj.isFolder) {
      onNavigate(obj.key);
      return;
    }
    if (obj.previewUrl) {
      setPreviewImage({
        url: obj.previewUrl,
        name: getDisplayName(obj.key, currentPrefix),
      });
      return;
    }
    onDownload(obj.key);
  };

  const handleRenameStart = (obj: (typeof objects)[number]) => {
    setRenamingKey(obj.key);
    setRenameValue(getDisplayName(obj.key, currentPrefix));
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const handleRenameConfirm = async (obj: (typeof objects)[number]) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === getDisplayName(obj.key, currentPrefix)) {
      setRenamingKey(null);
      return;
    }
    const newKey = obj.isFolder
      ? currentPrefix + trimmed.replace(/\/$/, "") + "/"
      : currentPrefix + trimmed;
    setIsSubmittingRename(true);
    try {
      await onRename?.(obj.key, newKey);
      setRenamingKey(null);
    } catch {
      // keep input open so user can retry or cancel
    } finally {
      setIsSubmittingRename(false);
    }
  };

  const handleRenameCancel = () => {
    setRenamingKey(null);
    setRenameValue("");
  };

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
      {/* Search + view toggle bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by file name…"
            className="pl-8 h-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={sortOption}
          onChange={(e) => handleSortOptionChange(e.target.value as SortOption)}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          aria-label="Sort assets"
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="size">Size</option>
          <option value="type">File type</option>
          <option value="last-modified">Last modified</option>
        </select>

        {/* View mode toggle */}
        <div className="flex items-center rounded-md border shrink-0">
          <Button
            type="button"
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            className="h-9 w-9 rounded-r-none"
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <LayoutList className="h-4 w-4" />
            <span className="sr-only">List view</span>
          </Button>
          <Button
            type="button"
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            className="h-9 w-9 rounded-l-none border-l"
            onClick={() => setViewMode("grid")}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="sr-only">Grid view</span>
          </Button>
        </div>
      </div>

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

      {/* Main content — list or grid */}
      {viewMode === "list" ? (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <button
                  type="button"
                  className="flex items-center hover:text-foreground"
                  onClick={() => handleSort("type")}
                >
                  Type
                  <SortIcon field="type" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="flex items-center hover:text-foreground"
                  onClick={() => handleSort("name")}
                >
                  Name
                  <SortIcon field="name" />
                </button>
              </TableHead>
              <TableHead className="w-32">
                <button
                  type="button"
                  className="flex items-center hover:text-foreground"
                  onClick={() => handleSort("size")}
                >
                  Size
                  <SortIcon field="size" />
                </button>
              </TableHead>
              <TableHead className="w-48">
                <button
                  type="button"
                  className="flex items-center hover:text-foreground"
                  onClick={() => handleSort("lastModified")}
                >
                  Last Modified
                  <SortIcon field="lastModified" />
                </button>
              </TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
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
            ) : visibleObjects.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery.trim()
                      ? `No files matching "${searchQuery.trim()}"`
                      : "No objects found in this location"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              // Object rows
              visibleObjects.map((obj) => (
                <TableRow key={obj.key}>
                  {/* Type icon */}
                  <TableCell>
                    {obj.isFolder ? (
                      <Folder className="h-5 w-5 text-amber-500" />
                    ) : (
                      <File className="h-5 w-5 text-muted-foreground" />
                    )}
                  </TableCell>

                  {/* Name — inline-editable when renaming */}
                  <TableCell>
                    {renamingKey === obj.key ? (
                      <div className="flex items-center gap-1">
                        <Input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameConfirm(obj);
                            if (e.key === "Escape") handleRenameCancel();
                          }}
                          className="h-7 text-sm"
                          disabled={isSubmittingRename}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-green-600 hover:text-green-700"
                          onClick={() => handleRenameConfirm(obj)}
                          disabled={isSubmittingRename}
                          title="Confirm rename"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={handleRenameCancel}
                          disabled={isSubmittingRename}
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : obj.isFolder ? (
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
                                navigator.clipboard
                                  .writeText(`${obj.previewUrl}`)
                                  .then(() => showToast("URL copied to clipboard!"))
                                  .catch(() => showToast("Failed to copy URL.", true));
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
                          disabled={renamingKey !== null}
                        >
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Download</span>
                        </Button>
                      )}

                      {/* Rename button */}
                      {onRename && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="cursor-pointer"
                          onClick={() => handleRenameStart(obj)}
                          title="Rename"
                          disabled={renamingKey !== null}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Rename</span>
                        </Button>
                      )}

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(obj.key)}
                        title="Delete"
                        className="text-destructive hover:text-destructive cursor-pointer"
                        disabled={renamingKey !== null}
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
      ) : (
        /* Grid view */
        <div>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="ml-2">Loading assets...</span>
            </div>
          ) : visibleObjects.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-muted-foreground">
                {searchQuery.trim()
                  ? `No files matching "${searchQuery.trim()}"`
                  : "No objects found in this location"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {visibleObjects.map((obj) => {
                const displayName = getDisplayName(obj.key, currentPrefix);
                const isRenaming = renamingKey === obj.key;
                return (
                  <div
                    key={obj.key}
                    className="group relative flex cursor-pointer flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      if (isNestedInteractiveElement(e.target)) return;
                      handleGridCardOpen(obj);
                    }}
                     onKeyDown={(e) => {
                       if (e.key === "Enter" || e.key === " " || e.code === "Space") {
                         e.preventDefault();
                         handleGridCardOpen(obj);
                       }
                     }}
                  >
                    {/* Preview / icon */}
                    <div className="flex h-24 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {obj.isFolder ? (
                        <Folder className="h-12 w-12 text-amber-500" />
                      ) : obj.previewUrl ? (
                        <img
                          src={obj.previewUrl}
                          alt={displayName}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <File className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>

                    {/* Name */}
                    {isRenaming ? (
                      <div className="flex flex-col gap-1">
                        <Input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameConfirm(obj);
                            if (e.key === "Escape") handleRenameCancel();
                          }}
                          className="h-7 text-xs"
                          disabled={isSubmittingRename}
                        />
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-600"
                            onClick={() => handleRenameConfirm(obj)}
                            disabled={isSubmittingRename}
                            title="Confirm"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleRenameCancel}
                            disabled={isSubmittingRename}
                            title="Cancel"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="truncate text-sm font-medium" title={displayName}>
                          {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(obj.size)}
                          {obj.lastModified && (
                            <> · {formatDate(obj.lastModified)}</>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Copy URL for images */}
                    {obj.previewUrl && !isRenaming && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="h-6 w-full text-[11px]"
                        onClick={() => {
                          navigator.clipboard
                            .writeText(obj.previewUrl!)
                            .then(() => showToast("URL copied to clipboard!"))
                            .catch(() => showToast("Failed to copy URL.", true));
                        }}
                      >
                        Copy URL
                      </Button>
                    )}

                    {/* Action buttons — visible on hover */}
                    {!isRenaming && (
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {!obj.isFolder && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onDownload(obj.key)}
                            title="Download"
                            disabled={renamingKey !== null}
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="sr-only">Download</span>
                          </Button>
                        )}
                        {onRename && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleRenameStart(obj)}
                            title="Rename"
                            disabled={renamingKey !== null}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Rename</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDelete(obj.key)}
                          title="Delete"
                          disabled={renamingKey !== null}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
      >
        <DialogContent className="max-w-4xl p-4">
          <DialogTitle className="text-sm sm:text-base">
            {previewImage?.name || "Image preview"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Large preview for selected image asset
          </DialogDescription>

          {previewImage && (
            <div className="max-h-[70vh] overflow-auto rounded-md border bg-muted">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="h-auto w-full object-contain"
              />
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
