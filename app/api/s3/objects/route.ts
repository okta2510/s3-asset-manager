import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

/**
 * Creates an S3 client instance with the provided credentials
 * @param credentials - S3 connection credentials
 * @returns Configured S3Client instance
 */
function createS3Client(credentials: {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}) {
  return new S3Client({
    endpoint: credentials.endpoint,
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

/**
 * GET /api/s3/objects
 * Lists objects in a bucket with pagination support
 * Query params: bucket, prefix, continuationToken, maxKeys
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract credentials from query parameters
    const endpoint = searchParams.get("endpoint");
    const region = searchParams.get("region");
    const accessKeyId = searchParams.get("accessKeyId");
    const secretAccessKey = searchParams.get("secretAccessKey");
    const bucket = searchParams.get("bucket");

    // Pagination parameters
    const prefix = searchParams.get("prefix") || "";
    const continuationToken = searchParams.get("continuationToken") || undefined;
    const maxKeys = Number.parseInt(searchParams.get("maxKeys") || "20", 10);

    // Validate required fields
    if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const client = createS3Client({
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
    });

    /**
     * ListObjectsV2Command with pagination support
     * - Bucket: Target bucket name
     * - Prefix: Filter objects by key prefix (folder-like navigation)
     * - MaxKeys: Number of objects per page (default 20)
     * - ContinuationToken: Token for fetching next page
     */
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
      Delimiter: "/", // Use delimiter for folder-like navigation
    });

    const response = await client.send(command);

    // Transform response to include both objects and common prefixes (folders)
    const objects =
      response.Contents?.map((obj) => ({
        key: obj.Key || "",
        lastModified: obj.LastModified,
        size: obj.Size || 0,
        etag: obj.ETag,
        storageClass: obj.StorageClass,
        isFolder: false,
      })) || [];

    // Include common prefixes (virtual folders)
    const folders =
      response.CommonPrefixes?.map((prefix) => ({
        key: prefix.Prefix || "",
        lastModified: null,
        size: 0,
        isFolder: true,
      })) || [];

    return NextResponse.json({
      objects: [...folders, ...objects],
      nextContinuationToken: response.NextContinuationToken,
      isTruncated: response.IsTruncated || false,
      prefix: prefix,
      keyCount: response.KeyCount || 0,
    });
  } catch (error) {
    console.error("Error listing objects:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list objects",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/s3/objects
 * Uploads a new object to the bucket
 * Expects multipart form data with file and metadata
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Extract credentials from form data
    const endpoint = formData.get("endpoint") as string;
    const region = formData.get("region") as string;
    const accessKeyId = formData.get("accessKeyId") as string;
    const secretAccessKey = formData.get("secretAccessKey") as string;
    const bucket = formData.get("bucket") as string;
    const key = formData.get("key") as string;
    const file = formData.get("file") as File;

    // Validate required fields
    if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
      return NextResponse.json(
        { error: "Missing required credentials" },
        { status: 400 }
      );
    }

    if (!file || !key) {
      return NextResponse.json(
        { error: "File and key are required" },
        { status: 400 }
      );
    }

    const client = createS3Client({
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
    });

    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    /**
     * PutObjectCommand uploads file to S3
     * - Bucket: Target bucket
     * - Key: Object key (path/filename)
     * - Body: File content as Buffer
     * - ContentType: MIME type for proper handling
     */
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
      ACL: 'public-read' // 👈 THIS MAKES IT PUBLIC
    });

    await client.send(command);

    return NextResponse.json({
      success: true,
      message: `File "${key}" uploaded successfully`,
      key: key,
    });
  } catch (error) {
    console.error("Error uploading object:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload object",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/s3/objects
 * Deletes an object from the bucket
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, region, accessKeyId, secretAccessKey, bucket, key } =
      body;

    // Validate required fields
    if (
      !endpoint ||
      !region ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucket ||
      !key
    ) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const client = createS3Client({
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
    });

    /**
     * DeleteObjectCommand removes an object from the bucket
     * Note: This operation is idempotent - deleting non-existent object succeeds
     */
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);

    return NextResponse.json({
      success: true,
      message: `Object "${key}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting object:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete object",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/s3/objects
 * Renames an object by copying it to a new key then deleting the original.
 * S3 has no native rename — copy + delete is the standard pattern.
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, region, accessKeyId, secretAccessKey, bucket, oldKey, newKey } = body;

    if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket || !oldKey || !newKey) {
      return NextResponse.json(
        { error: "Missing required parameters: endpoint, region, accessKeyId, secretAccessKey, bucket, oldKey, newKey" },
        { status: 400 }
      );
    }

    const client = createS3Client({ endpoint, region, accessKeyId, secretAccessKey });

    // Copy to the new key
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${oldKey}`,
        Key: newKey,
        ACL: "public-read",
      })
    );

    // Delete the original key
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: oldKey,
      })
    );

    return NextResponse.json({
      success: true,
      message: `Renamed "${oldKey}" to "${newKey}"`,
      newKey,
    });
  } catch (error) {
    console.error("Error renaming object:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to rename object" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/s3/objects
 * Gets a pre-signed URL for downloading an object
 * Pre-signed URLs allow temporary access without exposing credentials
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, region, accessKeyId, secretAccessKey, bucket, key } =
      body;

    // Validate required fields
    if (
      !endpoint ||
      !region ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucket ||
      !key
    ) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const client = createS3Client({
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
    });

    /**
     * Generate pre-signed URL for secure, temporary download access
     * URL expires after 1 hour (3600 seconds)
     */
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

    return NextResponse.json({
      url: signedUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate download URL",
      },
      { status: 500 }
    );
  }
}
