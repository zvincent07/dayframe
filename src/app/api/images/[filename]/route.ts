import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Image } from "@/models/Image";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    if (!filename) {
      return new NextResponse("Filename is required", { status: 400 });
    }

    await connectDB();
    const image = await Image.findOne({ filename });

    if (!image) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", image.contentType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(image.data as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
