import fs from "fs";
import OpenAI, { toFile } from "openai";

export async function textToImageOpenAI(prompt, model, size, background, quality) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const result = await openai.images.generate({
    model,
    prompt,
    ...(size && { size }),
    ...(background && { background }),
    ...(quality && { quality }),
  });

  const b64 = result.data[0].b64_json;
  return Buffer.from(b64, "base64");
}

export async function generateOpenAI(prompt, sourceImages, model, size, background, quality) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const images = await Promise.all(sourceImages.map(async (src) => {
    const mimeType = src.endsWith(".png") ? "image/png" : "image/jpeg";
    return toFile(fs.createReadStream(src), null, { type: mimeType });
  }));

  const image = images.length === 1 ? images[0] : images;
  const result = await openai.images.edit({
    model,
    image,
    prompt,
    ...(size && { size }),
    ...(background && { background }),
    ...(quality && { quality }),
  });

  const b64 = result.data[0].b64_json;
  return Buffer.from(b64, "base64");
}
