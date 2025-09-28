import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as unzipper from "unzipper";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_READER!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_READER!,
  },
});

export interface AttachmentContext {
  ogFileName?: string;
  description?: string;
  source?: string;
  tags?: string[];
}

export interface AttachmentMetadata {
  id: string;
  filename: string;
  mime?: string;
  size?: number;
  capturedAt?: string;
  context?: AttachmentContext;
}

interface ZipContents {
  json: unknown | null;
  images: Record<string, Buffer>;
  attachments: AttachmentMetadata[];
}

export async function readZip(key: string): Promise<ZipContents> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET!,
    Key: key,
  });
  const response = await s3.send(command);

  const chunks: Buffer[] = [];
  for await (const chunk of response.Body as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  const zipBuffer = Buffer.concat(chunks);

  const directory = await unzipper.Open.buffer(zipBuffer);

  const result: ZipContents = { json: null, images: {}, attachments: [] };
  const imageExtensions = [".jpeg", ".jpg", ".png", ".webp", ".gif"];

  for (const file of directory.files) {
    if (file.type !== "File") continue;
    const content = await file.buffer();

    if (file.path.endsWith(".json")) {
      const parsed = JSON.parse(content.toString("utf-8"));
      if (file.path === "passport.json") {
        result.json = parsed;
      } else if (file.path === "attachments/index.json") {
        const files = Array.isArray(parsed?.files) ? parsed.files : [];
        result.attachments = files.map((item: any) => ({
          id: item?.id,
          filename: item?.filename,
          mime: item?.mime,
          size: item?.size,
          capturedAt: item?.capturedAt,
          context: item?.context,
        }));
      } else if (!result.json) {
        result.json = parsed;
      }
    } else {
      const lowered = file.path.toLowerCase();
      if (imageExtensions.some((ext) => lowered.endsWith(ext))) {
        result.images[file.path] = content;
      }
    }
  }

  return result;
}

export async function uploadFileToS3(
  key: string,
  body: Buffer | string,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET!,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3.send(command);
  return `s3://${process.env.AWS_BUCKET}/${key}`;
}

/**
 * Generates a presigned URL for reading
 */
export async function getPresignedReadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET!,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}