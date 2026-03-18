// app/api/s3/presigned-url/route.ts
import {
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract from query params (same as /api/s3/objects)
    const endpoint = searchParams.get("endpoint");
    const region = searchParams.get("region");
    const accessKeyId = searchParams.get("accessKeyId");
    const secretAccessKey = searchParams.get("secretAccessKey");
    const bucket = searchParams.get("bucket");
    const key = searchParams.get("key");

    if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket || !key) {
      return NextResponse.json(
        { error: "Missing required parameters: endpoint, region, accessKeyId, secretAccessKey, bucket, key" },
        { status: 400 }
      );
    }

    const client = createS3Client({
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
    });

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    // Generate pre-signed URL valid for 1 hour
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

    return NextResponse.json({
      url: signedUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate pre-signed URL",
      },
      { status: 500 }
    );
  }
}