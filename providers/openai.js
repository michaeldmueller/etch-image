import fs from "fs";
import OpenAI, { toFile } from "openai";
import { OPENAI_RATES } from "../models.js";

// Estimates cost from the usage block and the published per-token rates.
function estimateCost(model, usage) {
  const rate = OPENAI_RATES[model];
  if (!rate || !usage) return null;
  const textIn = usage.input_tokens_details?.text_tokens ?? 0;
  const imageIn = usage.input_tokens_details?.image_tokens ?? 0;
  const imageOut = usage.output_tokens ?? 0;
  const usd = (textIn * rate.textIn + imageIn * rate.imageIn + imageOut * rate.imageOut) / 1e6;
  return { usd, estimated: true };
}

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
  return { buffer: Buffer.from(b64, "base64"), cost: estimateCost(model, result.usage) };
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
  return { buffer: Buffer.from(b64, "base64"), cost: estimateCost(model, result.usage) };
}
