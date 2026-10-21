import fs from "fs";
import { FLUX_FAMILIES } from "../models.js";
import { runBatch } from "./batch.js";

const BFL_API_URL = "https://api.bfl.ai/v1";
const BFL_POLL_INTERVAL_MS = 2000;
const TARGET_MEGAPIXELS = 1;

function readBase64(file) {
  return fs.readFileSync(file).toString("base64");
}

// Converts a W:H aspect ratio to width/height near the target megapixel count,
// rounded to multiples of 32 so every FLUX endpoint accepts it.
function ratioToDimensions(size, family) {
  const [w, h] = size.split(":").map(Number);
  const ratio = w / h;
  const pixels = TARGET_MEGAPIXELS * 1024 * 1024;
  let width = Math.round(Math.sqrt(pixels * ratio) / 32) * 32;
  let height = Math.round(Math.sqrt(pixels / ratio) / 32) * 32;
  if (family === "flux1") {
    width = Math.min(1440, Math.max(256, width));
    height = Math.min(1440, Math.max(256, height));
  }
  return { width, height };
}

function sizeToDimensions(size, family) {
  if (size.includes("x")) {
    const [width, height] = size.split("x").map(Number);
    return { width, height };
  }
  return ratioToDimensions(size, family);
}

// Builds the request body for a FLUX model. Exported for testing.
export function buildFluxBody(model, prompt, sourceImages, size, quality) {
  const { family, maxImages } = FLUX_FAMILIES[model];
  if (sourceImages.length > maxImages) {
    throw new Error(`${model} accepts at most ${maxImages} input image${maxImages === 1 ? "" : "s"}, got ${sourceImages.length}`);
  }

  const body = { prompt, output_format: "png" };

  if (family === "flux3") {
    if (size) body.aspect_ratio = size;
    if (quality) body.resolution = quality;
    if (sourceImages.length > 0) body.images = sourceImages.map(readBase64);
    return body;
  }

  if (family === "kontext" || family === "ultra") {
    if (size) body.aspect_ratio = size;
  } else if (size) {
    Object.assign(body, sizeToDimensions(size, family));
  }

  if (family === "flux1" || family === "ultra") {
    if (sourceImages.length > 0) body.image_prompt = readBase64(sourceImages[0]);
  } else {
    sourceImages.forEach((src, i) => {
      body[i === 0 ? "input_image" : `input_image_${i + 1}`] = readBase64(src);
    });
  }

  return body;
}

async function submitAndPoll(model, body) {
  const apiKey = process.env.BFL_API_KEY;
  if (!apiKey) throw new Error("BFL_API_KEY is not set");

  const submitRes = await fetch(`${BFL_API_URL}/${model}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-key": apiKey },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`BFL API error (${submitRes.status}): ${err}`);
  }

  const { id, polling_url: pollingUrl } = await submitRes.json();
  const pollUrl = pollingUrl || `${BFL_API_URL}/get_result?id=${id}`;

  while (true) {
    await new Promise((r) => setTimeout(r, BFL_POLL_INTERVAL_MS));

    const pollRes = await fetch(pollUrl, { headers: { "x-key": apiKey } });
    const result = await pollRes.json().catch(() => null);
    if (!result) {
      const err = await pollRes.text();
      throw new Error(`BFL polling error (${pollRes.status}): ${err}`);
    }

    if (result.status === "Ready") {
      const imageRes = await fetch(result.result.sample);
      if (!imageRes.ok) throw new Error("Failed to download generated image");
      const credits = typeof result.cost === "number" ? result.cost : null;
      return {
        buffer: Buffer.from(await imageRes.arrayBuffer()),
        cost: credits === null ? null : { usd: credits * 0.01, estimated: false },
      };
    }

    if (result.status === "Error" || result.status === "Failed" || result.status === "Request Moderated" || result.status === "Content Moderated") {
      throw new Error(`BFL generation failed: ${result.status}`);
    }

    // "Task not found", "Pending" — keep polling
  }
}

// FLUX returns one image per task, so several images mean several concurrent tasks.
export async function generateFlux({ prompt, sourceImages, model, size, quality, count }) {
  const body = buildFluxBody(model, prompt, sourceImages, size, quality);
  return runBatch(count, () => submitAndPoll(model, body));
}
