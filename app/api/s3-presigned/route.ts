import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize the AWS S3 Client
const s3Client = new S3Client({
  region: process.env.MY_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  console.log("DEBUG S3:", { bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME, region: process.env.MY_AWS_REGION });

  // Safety check for critical env vars
  if (!process.env.NEXT_PUBLIC_S3_BUCKET_NAME || !process.env.MY_AWS_REGION) {
    return NextResponse.json({ error: "Missing Env Vars" }, { status: 500 });
  }

  try {
    // 1. Security Check: Ensure only logged-in users can upload
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse what the frontend wants to upload
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    // 3. Create a unique path (Key) in S3 so files don't overwrite each other
    const key = `uploads/${userId}-${Date.now()}-${filename}`;

    // 4. Create the command telling AWS we want to PUT an object
    const command = new PutObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // 5. Generate a secure "Presigned URL" - this is basically a 5-minute temporary ticket 
    // that lets the frontend securely bypass our server and upload directly to AWS S3.
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Construct the public URL where the file will permanently live
    const publicUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.MY_AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({ 
      presignedUrl, // The secure upload ticket
      publicUrl,    // The final URL to save to MongoDB
      key           // The S3 object key (path)
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}