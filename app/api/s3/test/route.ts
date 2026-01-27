import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

/**
 * POST /api/s3/test
 * Tests the S3 connection with provided credentials
 * Returns success if connection is valid, error otherwise
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, region, accessKeyId, secretAccessKey } = body;

    // Validate that all required credentials are provided
    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { error: "Missing required credentials" },
        { status: 400 }
      );
    }

    /**
     * Create S3 client with provided credentials
     * forcePathStyle is set to true for compatibility with S3-compatible services
     */
    const client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });

    /**
     * Use ListBucketsCommand as a simple connection test
     * If credentials are valid, this will return successfully
     * If invalid, it will throw an error
     */
    const command = new ListBucketsCommand({});
    await client.send(command);

    return NextResponse.json({
      success: true,
      message: "Connection successful",
    });
  } catch (error) {
    console.error("S3 connection test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Connection test failed",
      },
      { status: 401 }
    );
  }
}
