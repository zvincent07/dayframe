import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requirePermission } from "@/permissions";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const isValidImage = (buf: Buffer) => {
      if (buf.length < 12) return false
      const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
      const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
      const gif = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38
      const riff = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
      const webp = riff && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
      return jpeg || png || gif || webp
    }
    const session = await auth();
    // Use view:own-journal as the minimum permission to upload images for journal
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    requirePermission(session.user, "update:own-journal");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      return NextResponse.json({ error: "File size must be less than 2MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!isValidImage(buffer)) {
      return NextResponse.json({ error: "Invalid image content" }, { status: 400 });
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = file.name.split(".").pop() || "png";
    const filename = `journal-${uniqueSuffix}.${extension}`;
    
    const uploadDir = join(process.cwd(), "public", "uploads", "journal");
    await mkdir(uploadDir, { recursive: true });

    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const url = `/uploads/journal/${filename}`;

    return NextResponse.json({ url });
  } catch (error) {
    logger.error("Upload error", { error: error as unknown });
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
