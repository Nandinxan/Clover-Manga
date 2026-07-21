import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Файл олдсонгүй" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Файлын нэрийг давхцахгүй, зайгүй болгох оновчлол
    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: uniqueFileName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // Зургийг вэб дээр шууд үзэх линк
    const imageUrl = `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL}/${uniqueFileName}`;

    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error("R2 Upload Error:", error);
    return NextResponse.json({ error: "Зураг хуулахад алдаа гарлаа" }, { status: 500 });
  }
}
