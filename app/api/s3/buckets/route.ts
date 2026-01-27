import {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

/**
 * Creates an S3 client instance with the provided credentials
 * Supports S3-compatible endpoints (AWS, MinIO, DigitalOcean Spaces, etc.)
 * @param credentials - Object containing endpoint, region, accessKeyId, and secretAccessKey
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
    // Force path style for S3-compatible services (MinIO, etc.)
    forcePathStyle: true,
  });
}

/**
 * GET /api/s3/buckets
 * Lists all buckets available in the S3 account
 * Requires credentials to be passed as query parameters or headers
 */
export async function GET(request: Request) {
  try {
    // Extract credentials from request headers
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");
    const region = searchParams.get("region");
    const accessKeyId = searchParams.get("accessKeyId");
    const secretAccessKey = searchParams.get("secretAccessKey");

    // Validate that all required credentials are provided
    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: "Missing required credentials" },
        { status: 400 }
      );
    }

    // Create S3 client with provided credentials
    const client = createS3Client({
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
    });

    // Execute ListBuckets command to get all buckets
    const command = new ListBucketsCommand({});
    const response = await client.send(command);

    // Transform response to our Bucket interface format
    const buckets =
      response.Buckets?.map((bucket) => ({
        name: bucket.Name || "",
        creationDate: bucket.CreationDate,
      })) || [];

    return NextResponse.json({ buckets });
  } catch (error) {
    console.error("Error listing buckets:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list buckets",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/s3/buckets
 * Creates a new bucket with the specified name
 * Request body should contain: credentials and bucketName
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, region, accessKeyId, secretAccessKey, bucketName } = body;

    // Validate required fields
    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: "Missing required credentials" },
        { status: 400 }
      );
    }

    if (!bucketName) {
      return NextResponse.json(
        { error: "Bucket name is required" },
        { status: 400 }
      );
    }

    const client = createS3Client({
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
    });

    // Create the bucket using CreateBucketCommand
    const command = new CreateBucketCommand({
      Bucket: bucketName,
    });

    await client.send(command);

    return NextResponse.json({
      success: true,
      message: `Bucket "${bucketName}" created successfully`,
    });
  } catch (error) {
    console.error("Error creating bucket:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create bucket",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/s3/buckets
 * Deletes a bucket (must be empty)
 * Request body should contain: credentials and bucketName
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, region, accessKeyId, secretAccessKey, bucketName } = body;

    // Validate required fields
    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: "Missing required credentials" },
        { status: 400 }
      );
    }

    if (!bucketName) {
      return NextResponse.json(
        { error: "Bucket name is required" },
        { status: 400 }
      );
    }

    const client = createS3Client({
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
    });

    // Delete the bucket (must be empty)
    const command = new DeleteBucketCommand({
      Bucket: bucketName,
    });

    await client.send(command);

    return NextResponse.json({
      success: true,
      message: `Bucket "${bucketName}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting bucket:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete bucket",
      },
      { status: 500 }
    );
  }
}
