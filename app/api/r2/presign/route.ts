/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { adminAuth, adminDb } from "@/lib/firebase.admin";

export const runtime = "nodejs";

type MediaType = "audio" | "pdf";

const ALLOWED_CONTENT_TYPES: Record<MediaType, string[]> = {
  audio: [
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/x-aac",
    "audio/ogg",
    "application/ogg",
    "audio/opus",
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/flac",
    "audio/x-flac",
  ],
  pdf: ["application/pdf"],
};

const ALLOWED_AUDIO_EXTENSIONS = [
  ".mp3",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
  ".webm",
  ".wav",
  ".flac",
];

const MAX_FILE_SIZE_BYTES: Record<MediaType, number> = {
  audio: 300 * 1024 * 1024,
  pdf: 80 * 1024 * 1024,
};

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }

  return value;
}

function safeSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function safeFileName(fileName: string) {
  const name = fileName
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

  return name || "file";
}

function getAllowedAudioExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  return ALLOWED_AUDIO_EXTENSIONS.find((ext) => lower.endsWith(ext)) ?? "";
}

function isAllowedUploadContentType(input: {
  fileName: string;
  contentType: string;
  mediaType: MediaType;
}) {
  if (ALLOWED_CONTENT_TYPES[input.mediaType].includes(input.contentType)) {
    return true;
  }

  // بعض المتصفحات أو الأنظمة ترسل نوع الملف كـ octet-stream
  // لذلك نسمح به فقط إذا كان الامتداد معروفًا وآمنًا حسب نوع الميديا.
  if (input.contentType === "application/octet-stream") {
    if (input.mediaType === "audio") {
      return !!getAllowedAudioExtension(input.fileName);
    }

    if (input.mediaType === "pdf") {
      return input.fileName.toLowerCase().endsWith(".pdf");
    }
  }

  return false;
}

function getExtension(
  fileName: string,
  contentType: string,
  mediaType: MediaType,
) {
  const lower = fileName.toLowerCase();

  if (mediaType === "pdf") return ".pdf";

  if (lower.endsWith(".mp3")) return ".mp3";
  if (lower.endsWith(".m4a")) return ".m4a";
  if (lower.endsWith(".aac")) return ".aac";
  if (lower.endsWith(".ogg")) return ".ogg";
  if (lower.endsWith(".opus")) return ".opus";
  if (lower.endsWith(".webm")) return ".webm";
  if (lower.endsWith(".wav")) return ".wav";
  if (lower.endsWith(".flac")) return ".flac";

  if (contentType === "audio/x-m4a" || contentType === "audio/mp4") {
    return ".m4a";
  }

  if (contentType === "audio/aac" || contentType === "audio/x-aac") {
    return ".aac";
  }

  if (contentType === "audio/ogg" || contentType === "application/ogg") {
    return ".ogg";
  }

  if (contentType === "audio/opus") {
    return ".opus";
  }

  if (contentType === "audio/webm") {
    return ".webm";
  }

  if (
    contentType === "audio/wav" ||
    contentType === "audio/x-wav" ||
    contentType === "audio/wave"
  ) {
    return ".wav";
  }

  if (contentType === "audio/flac" || contentType === "audio/x-flac") {
    return ".flac";
  }

  if (contentType === "audio/mpeg" || contentType === "audio/mp3") {
    return ".mp3";
  }

  return ".mp3";
}

function ensureFileNameHasExtension(
  fileName: string,
  contentType: string,
  mediaType: MediaType,
) {
  const safe = safeFileName(fileName);
  const ext = getExtension(safe, contentType, mediaType);

  if (safe.toLowerCase().endsWith(ext)) return safe;

  return `${safe}${ext}`;
}

function makeR2Key(input: {
  mediaType: MediaType;
  fileName: string;
  contentType: string;
  authorId: string;
  branchId: string;
  bookId: string;
}) {
  const finalFileName = ensureFileNameHasExtension(
    input.fileName,
    input.contentType,
    input.mediaType,
  );

  const stamp = Date.now();
  const shortId = randomUUID().split("-")[0];

  return [
    "authors",
    safeSegment(input.authorId),
    "branches",
    safeSegment(input.branchId),
    "books",
    safeSegment(input.bookId),
    `${stamp}-${shortId}-${finalFileName}`,
  ].join("/");
}

async function assertAdminFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Unauthorized: missing token" },
        { status: 401 },
      ),
    };
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const adminSnap = await adminDb.doc(`admins/${decoded.uid}`).get();

  if (!adminSnap.exists) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Forbidden: admin only" },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, uid: decoded.uid };
}

export async function POST(request: Request) {
  try {
    const adminCheck = await assertAdminFromRequest(request);

    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const body = await request.json();

    const fileName = String(body.fileName ?? "");
    const contentType = String(body.contentType ?? "");
    const mediaType = String(body.mediaType ?? "") as MediaType;
    const fileSize = Number(body.fileSize ?? 0);

    const authorId = String(body.authorId ?? "");
    const branchId = String(body.branchId ?? "");
    const bookId = String(body.bookId ?? "");

    if (
      !fileName ||
      !contentType ||
      !mediaType ||
      !authorId ||
      !branchId ||
      !bookId
    ) {
      return NextResponse.json(
        { error: "Missing required upload data" },
        { status: 400 },
      );
    }

    if (mediaType !== "audio" && mediaType !== "pdf") {
      return NextResponse.json(
        { error: "Unsupported media type" },
        { status: 400 },
      );
    }

    if (!isAllowedUploadContentType({ fileName, contentType, mediaType })) {
      return NextResponse.json(
        {
          error: `Unsupported file content type: ${contentType}`,
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE_BYTES[mediaType]) {
      return NextResponse.json({ error: "File is too large" }, { status: 400 });
    }

    const accountId = requiredEnv("R2_ACCOUNT_ID");
    const bucket = requiredEnv("R2_BUCKET_NAME");

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
      },
    });

    const r2Key = makeR2Key({
      mediaType,
      fileName,
      contentType,
      authorId,
      branchId,
      bookId,
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: 60 * 5,
    });

    return NextResponse.json({
      uploadUrl,
      r2Key,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error: error?.message ?? "Failed to create upload URL",
      },
      { status: 500 },
    );
  }
}
