"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Props for the DeleteDialog component
 */
interface DeleteDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** The key/name of the object to delete */
  objectKey: string;
  /** Callback when delete is confirmed */
  onConfirm: () => void;
  /** Whether delete operation is in progress */
  isDeleting?: boolean;
}

/**
 * DeleteDialog Component
 * Confirmation dialog for deleting S3 objects
 * Requires explicit confirmation to prevent accidental deletions
 */
export function DeleteDialog({
  open,
  onOpenChange,
  objectKey,
  onConfirm,
  isDeleting = false,
}: DeleteDialogProps) {
  /**
   * Extracts just the file name from the full key path
   * @param key - Full S3 object key
   * @returns Just the file/folder name
   */
  const getFileName = (key: string): string => {
    const parts = key.split("/").filter(Boolean);
    return parts[parts.length - 1] || key;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Object</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {getFileName(objectKey)}
            </span>
            ? This action cannot be undone and the object will be permanently
            removed from S3.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
