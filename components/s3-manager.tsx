"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialsForm } from "@/components/credentials-form";
import { BucketSelector } from "@/components/bucket-selector";
import { AssetTable } from "@/components/asset-table";
import { UploadDialog } from "@/components/upload-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { CreateBucketDialog } from "@/components/create-bucket-dialog";
import {
  saveCredentials,
  getCredentials,
  clearCredentials,
} from "@/lib/s3-storage";
import type { S3Credentials, Bucket, S3Object } from "@/lib/types";
import { LogOut, RefreshCw, Settings, FolderPlus } from "lucide-react";

/**
 * S3Manager Component
 * Main component that orchestrates the entire S3 asset management interface
 * Handles authentication, bucket selection, and CRUD operations on objects
 */
export function S3Manager() {
  // Authentication state
  const [credentials, setCredentials] = useState<S3Credentials | null>(getCredentials());
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Bucket state
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | undefined>();
  const [isBucketsLoading, setBucketsLoading] = useState(false);

  // Objects state with pagination
  const [objects, setObjects] = useState<(S3Object & { isFolder?: boolean })[]>(
    []
  );
  const [isObjectsLoading, setObjectsLoading] = useState(false);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [continuationToken, setContinuationToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageHistory, setPageHistory] = useState<string[]>([]);

  // CRUD operation states
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingBucket, setIsCreatingBucket] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [perPage, setPerPage] = useState(50);

  /**
   * Loads saved credentials from localStorage on component mount
   * Automatically attempts to connect if credentials exist
   */
  useEffect(() => {
    const saved = getCredentials();
    if (saved) {
      setCredentials(credentials);
      if (saved.bucket) {
        setSelectedBucket(saved.bucket);
        setIsConnected(true)
      }
    }
    setMounted(true)
  }, []);

  useEffect(() => {
    fetchObjects(currentPrefix, continuationToken, true);
  }, [perPage]);

  /**
   * Builds query string with credentials for API calls
   * @returns URL search params string with credentials
   */
  const buildCredentialParams = useCallback(() => {
    if (!credentials) return "";
    const params = new URLSearchParams({
      endpoint: credentials.endpoint,
      region: credentials.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    });
    return params.toString();
  }, [credentials]);

  /**
   * Tests the S3 connection with provided credentials
   * @param creds - Credentials to test
   * @returns true if connection successful, false otherwise
   */
  const testConnection = async (creds: S3Credentials): Promise<boolean> => {
    try {
      const response = await fetch("/api/s3/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      const data = await response.json();
      return data.success;
    } catch {
      return false;
    }
  };

  /**
   * Fetches list of buckets from S3
   * Called after successful connection
   */
  const fetchBuckets = useCallback(async () => {
    if (!credentials) return;
    setBucketsLoading(true);
    try {
      const response = await fetch(
        `/api/s3/buckets?${buildCredentialParams()}`
      );
      const data = await response.json();
      if (data.buckets) {
        setBuckets(data.buckets);
      }
    } catch (error) {
      console.error("Failed to fetch buckets:", error);
    } finally {
      setBucketsLoading(false);
    }
  }, [credentials, buildCredentialParams]);


  const getPresignedUrl = async (
    key: string,
    credentials: any,
    bucket: string,
    buildCredentialParams: () => string
  ): Promise<string> => {
    const params = new URLSearchParams({
      ...Object.fromEntries(new URLSearchParams(buildCredentialParams())),
      bucket,
      key,
    });

    const response = await fetch(`/api/s3/presigned-url?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to generate pre-signed URL');
    }
    const data = await response.json();
    return data.url;
  };

  /**
   * Fetches objects from the selected bucket
   * Supports pagination and folder navigation via prefix
   * @param prefix - Folder prefix to filter objects
   * @param token - Continuation token for pagination
   * @param isNextPage - Whether this is a next page request
   */
  const fetchObjects = useCallback(
    async (
      prefix = "",
      token?: string,
      isNextPage = false
    ) => {
      if (!credentials || !selectedBucket) return;
      setObjectsLoading(true);
      try {
        const params = new URLSearchParams({
          ...Object.fromEntries(
            new URLSearchParams(buildCredentialParams())
          ),
          bucket: selectedBucket,
          prefix,
          maxKeys: perPage.toString(),
          Key: 'image.jpg'
        });
        if (token) {
          params.set("continuationToken", token);
        }

        const response = await fetch(`/api/s3/objects?${params.toString()}`);
        const data = await response.json();
        
        if (data.objects) {
          const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
          const enrichedObjects = await Promise.all(
            data.objects.map(async (obj: any) => {
              if (!obj.isFolder) {
                const ext = obj.key.split('.').pop()?.toLowerCase();
                if (imageExtensions.includes(ext)) {
                  try {
                    const imgUrl = await getPresignedUrl(
                      obj.key,
                      credentials,
                      selectedBucket,
                      buildCredentialParams
                    );
                    const previewUrl = `https://nos.jkt-1.neo.id/${selectedBucket}/${encodeURIComponent(obj.key)}`;
                    return { ...obj, previewUrl, imgUrl };
                  } catch (err) {
                    console.warn(`Failed to generate preview for ${obj.key}:`, err);
                    return { ...obj, previewUrl: null };
                  }
                }
              }
              return { ...obj, previewUrl: null }; // non-image or folder
            })
          );
          setObjects(enrichedObjects);
          // setObjects(data.objects);
          setContinuationToken(data.nextContinuationToken);
          setHasMore(data.isTruncated);
          setCurrentPrefix(prefix);
          
          if (isNextPage) {
            setCurrentPage((p) => p + 1);
          }
        }
      } catch (error) {
        console.error("Failed to fetch objects:", error);
      } finally {
        setObjectsLoading(false);
      }
    },
    [credentials, selectedBucket, buildCredentialParams]
  );

  /**
   * Effect to fetch buckets when connected
   */
  useEffect(() => {
    if (isConnected && credentials) {
      fetchBuckets();
    }
  }, [isConnected, credentials, fetchBuckets]);

  /**
   * Effect to fetch objects when bucket is selected
   */
  useEffect(() => {
    if (selectedBucket && isConnected) {
      setCurrentPrefix("");
      setCurrentPage(1);
      setPageHistory([]);
      fetchObjects("", undefined, false);
    }
  }, [selectedBucket, isConnected, fetchObjects]);

  /**
   * Handles saving credentials and connecting
   * @param creds - Credentials to save
   */
  const handleSaveCredentials = (creds: S3Credentials) => {
    setCredentials(creds);
    saveCredentials(creds);
    setIsConnected(true);
    setShowSettings(false);
  };

  /**
   * Handles bucket selection change
   * Updates credentials with selected bucket
   * @param bucketName - Selected bucket name
   */
  const handleBucketSelect = (bucketName: string) => {
    setSelectedBucket(bucketName);
    if (credentials) {
      const updated = { ...credentials, bucket: bucketName };
      setCredentials(updated);
      saveCredentials(updated);
    }
  };

  /**
   * Handles folder navigation
   * Updates prefix and fetches objects for new location
   * @param prefix - New folder prefix
   */
  const handleNavigate = (prefix: string) => {
    setCurrentPage(1);
    setPageHistory([]);
    fetchObjects(prefix, undefined, false);
  };

  /**
   * Loads next page of objects
   */
  const handleLoadMore = () => {
    if (continuationToken) {
      // Save current token to page history for going back
      setPageHistory((prev) => [...prev, continuationToken]);
      fetchObjects(currentPrefix, continuationToken, true);
    }
  };

  /**
   * Goes to previous page of objects
   */
  const handlePreviousPage = () => {
    if (pageHistory.length > 0) {
      const newHistory = [...pageHistory];
      newHistory.pop();
      setPageHistory(newHistory);
      setCurrentPage((p) => p - 1);
      
      const prevToken = newHistory[newHistory.length - 1];
      fetchObjects(currentPrefix, prevToken, false);
    } else if (currentPage > 1) {
      setCurrentPage(1);
      fetchObjects(currentPrefix, undefined, false);
    }
  };
  /**
   * Handles file upload to S3
   * @param file - File to upload
   * @param key - S3 object key
   */
  const handleUpload = async (uploads: { file: File; key: string }[]) => {
    if (!credentials || !selectedBucket) return;
    setIsUploading(true);
    try {
      const results = await Promise.allSettled(
        uploads.map(async ({ file, key }) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("key", key);
          formData.append("bucket", selectedBucket);
          formData.append("endpoint", credentials.endpoint);
          formData.append("region", credentials.region);
          formData.append("accessKeyId", credentials.accessKeyId);
          formData.append("secretAccessKey", credentials.secretAccessKey);

          const response = await fetch("/api/s3/objects", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || `Upload failed for ${key}`);
          }
        })
      );

      const failedUploads = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => result.reason);

      if (failedUploads.length > 0) {
        const firstError = failedUploads[0];
        const message = firstError instanceof Error ? firstError.message : "Upload failed";
        throw new Error(
          failedUploads.length === 1
            ? message
            : `${message} (${failedUploads.length} files failed)`
        );
      }

      // Refresh objects list after upload
      await fetchObjects(currentPrefix);
    } finally {
      setIsUploading(false);
    }
  };


  /**
   * handle create folder
  */
  const createFolder = async (folderName: string) => {
    if (!credentials || !selectedBucket) {
      console.warn("Missing credentials or bucket");
      return;
    }

    // Ensure folder key ends with '/'
    const folderKey = folderName.endsWith('/') ? folderName : `${folderName}/`;

    setIsUploading(true);
    try {
      // Create a zero-byte "file" to represent the folder
      const emptyFile = new File([''], folderKey, { type: 'application/x-directory' });

      const formData = new FormData();
      formData.append('file', emptyFile);
      formData.append('key', folderKey);
      formData.append('bucket', selectedBucket);
      formData.append('endpoint', credentials.endpoint);
      formData.append('region', credentials.region);
      formData.append('accessKeyId', credentials.accessKeyId);
      formData.append('secretAccessKey', credentials.secretAccessKey);

      const response = await fetch('/api/s3/objects', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create folder "${folderName}"`);
      }

      // Refresh the object list to show the new folder
      await fetchObjects(currentPrefix);

      // Optional: show success feedback
      console.log(`Folder created: ${folderKey}`);
    } catch (error) {
      console.error('Error creating folder:', error);
      // You might want to show a toast/notification here
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handles object deletion from S3
   * @param key - Key of object to delete
   */
  const handleDelete = async () => {
    if (!credentials || !selectedBucket || !deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/s3/objects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...credentials,
          bucket: selectedBucket,
          key: deleteTarget,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Delete failed");
      }
      setObjects(objects.filter((obj) => obj.key !== deleteTarget));
      // Refresh objects list after deletion
      // fetchObjects(currentPrefix);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  /**
   * Handles renaming an S3 object (copy to new key + delete old key)
   * @param oldKey - Current object key
   * @param newKey - Target object key
   */
  const handleRename = async (oldKey: string, newKey: string) => {
    if (!credentials || !selectedBucket) return;
    const response = await fetch("/api/s3/objects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...credentials,
        bucket: selectedBucket,
        oldKey,
        newKey,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Rename failed");
    }
    await fetchObjects(currentPrefix);
  };

  /**
   * Handles file download by generating pre-signed URL
   * @param key - Key of object to download
   */
  const handleDownload = async (key: string) => {
    if (!credentials || !selectedBucket) return;
    try {
      const response = await fetch("/api/s3/objects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...credentials,
          bucket: selectedBucket,
          key,
        }),
      });

      const data = await response.json();
      if (data.url) {
        // Open pre-signed URL in new tab
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Failed to generate download URL:", error);
    }
  };

  /**
   * Handles new bucket creation
   * @param bucketName - Name for new bucket
   */
  const handleCreateBucket = async (bucketName: string) => {
    if (!credentials) return;
    setIsCreatingBucket(true);
    try {
      const response = await fetch("/api/s3/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...credentials,
          bucketName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create bucket");
      }

      // Refresh buckets list
      fetchBuckets();
    } finally {
      setIsCreatingBucket(false);
    }
  };

  /**
   * Handles disconnect/logout
   * Clears credentials and resets state
   */
  const handleDisconnect = () => {
    clearCredentials();
    setCredentials(null);
    setIsConnected(false);
    setBuckets([]);
    setSelectedBucket(undefined);
    setObjects([]);
  };

  if(!mounted){
    return ('loading...')
  }

  // Show credentials form if not connected or settings view is requested
  if (!isConnected || showSettings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col gap-4">
          <CredentialsForm
            initialCredentials={credentials}
            onSave={handleSaveCredentials}
            onTest={testConnection}
          />
          {isConnected && (
            <Button
              variant="ghost"
              onClick={() => setShowSettings(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Main application view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold">S3 Asset Manager</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDisconnect}
              title="Disconnect"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Disconnect</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col gap-6">
          {/* Bucket selection and actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bucket Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-start gap-4">
                <BucketSelector
                  buckets={buckets}
                  selectedBucket={selectedBucket}
                  onSelect={handleBucketSelect}
                  isLoading={isBucketsLoading}
                />
                
                <div className="flex-col flex gap-2">
                    <label
                      className="text-sm font-medium text-foreground"
                    >
                      Create Bucket
                    </label>

                    <CreateBucketDialog
                      onCreate={handleCreateBucket}
                      isCreating={isCreatingBucket}
                    />
                </div>


                <div className="flex-col flex gap-2">
                    <label
                      className="text-sm font-medium text-foreground"
                    >
                      &nbsp;
                    </label>
                    <Button
                      variant="outline"
                      onClick={fetchBuckets}
                      disabled={isBucketsLoading}
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${isBucketsLoading ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Asset browser */}
          {selectedBucket && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Assets in {selectedBucket}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchObjects(currentPrefix)}
                      disabled={isObjectsLoading}
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${isObjectsLoading ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </Button>
                    {/* Create Folder Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const folderName = prompt("Enter folder name:");
                        if (folderName?.trim()) {
                          await createFolder(`${currentPrefix}${folderName.trim()}`);
                        }
                      }}
                      disabled={isUploading || isObjectsLoading}
                    >
                      <FolderPlus className="mr-2 h-4 w-4" />
                      New Folder
                    </Button>
                    <UploadDialog
                      currentPrefix={currentPrefix}
                      onUpload={handleUpload}
                      isUploading={isUploading}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AssetTable
                  objects={objects}
                  currentPrefix={currentPrefix}
                  onNavigate={handleNavigate}
                  onDelete={(key) => setDeleteTarget(key)}
                  onDownload={handleDownload}
                  onRename={handleRename}
                  isLoading={isObjectsLoading}
                  pagination={{
                    hasMore,
                    continuationToken,
                    onLoadMore: handleLoadMore,
                    onPrevious: handlePreviousPage,
                    canGoPrevious: currentPage > 1,
                    currentPage,
                    perPage,
                    onPerPage:setPerPage
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Connection info */}
          <div className="text-center text-sm text-muted-foreground">
            Connected to: <span className={`${credentials?.endpoint || credentials?.region ? "font-mono bg-green-500 text-green-800" : " bg-gray-400"} font-bold px-2 py-1 rounded-2xl`}>{credentials?.endpoint} | Region: {credentials?.region}</span>
          </div>
        </div>
      </main>

      {/* Delete confirmation dialog */}
      <DeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        objectKey={deleteTarget || ""}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
