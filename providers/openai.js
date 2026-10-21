import fs from "fs";
import OpenAI, { toFile } from "openai";
import { OPENAI_RATES } from "../models.js";

// Estimates cost from the usage block and the published per-token rates.
// The usage block covers every image in the request, so no per-image summing is needed.
function estimateCost(model, usage) {
  const rate = OPENAI_RATES[model];
  if (!rate || !usage) return null;
  const textIn = usage.input_tokens_details?.text_tokens ?? 0;
  const imageIn = usage.input_tokens_details?.image_tokens ?? 0;
  const imageOut = usage.output_tokens ?? 0;
  const usd = (textIn * rate.textIn + imageIn * rate.imageIn + imageOut * rate.imageOut) / 1e6;
  return { usd, estimated: true };
}

// OpenAI returns several images from one request via `n`.
export async function generateOpenAI({ prompt, sourceImages, model, size, background, quality, count }) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const params = {
    model,
    prompt,
    n: count,
    ...(size && { size }),
    ...(background && { background }),
    ...(quality && { quality }),
  };

  let result;
  if (sourceImages.length > 0) {
    const images = await Promise.all(sourceImages.map(async (src) => {
      const mimeType = src.endsWith(".png") ? "image/png" : "image/jpeg";
      return toFile(fs.createReadStream(src), null, { type: mimeType });
    }));
    result = await openai.images.edit({ ...params, image: images.length === 1 ? images[0] : images });
  } else {
    result = await openai.images.generate(params);
  }

  return {
    buffers: result.data.map((item) => Buffer.from(item.b64_json, "base64")),
    cost: estimateCost(model, result.usage),
    errors: [],
  };
}
