"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOutput } from "lucide-react";

interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectKey: string;
  onConfirm: (oldKey: string, newKey: string) => Promise<void>;
  isMoving?: boolean;
}

export function MoveDialog({
  open,
  onOpenChange,
  objectKey,
  onConfirm,
  isMoving = false,
}: MoveDialogProps) {
  const [targetPath, setTargetPath] = useState(objectKey);
  const [error, setError] = useState("");

  useEffect(() => {
    setTargetPath(objectKey);
    setError("");
  }, [objectKey, open]);

  const handleMove = async () => {
    const trimmed = targetPath.trim();
    if (!trimmed) {
      setError("Please enter a destination path");
      return;
    }
    if (trimmed === objectKey) {
      setError("Destination path is unchanged");
      return;
    }

    try {
      setError("");
      await onConfirm(objectKey, trimmed);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Move failed");
    }
  };

  const isFolder = objectKey.endsWith("/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOutput className="h-5 w-5 text-primary" />
            Move {isFolder ? "Folder" : "File"}
          </DialogTitle>
          <DialogDescription>
            Specify the target path for <code className="text-primary">{objectKey}</code>. You can move it into another folder by updating its path prefix.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="destination">Destination Key / Path</Label>
            <Input
              id="destination"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              placeholder={isFolder ? "folder/new-subfolder/" : "folder/filename.ext"}
              disabled={isMoving}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleMove();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {isFolder
                ? "All files inside this folder will be recursively moved to the new path prefix."
                : "Enter full target key, including destination folder (e.g., subfolder/file.png)."}
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleMove} disabled={isMoving}>
            {isMoving ? "Moving..." : "Move Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

