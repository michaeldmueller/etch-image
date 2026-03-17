import fs from "fs";

const BFL_API_URL = "https://api.bfl.ai/v1";
const BFL_POLL_INTERVAL_MS = 2000;

export async function generateFlux(prompt, sourceImages, model, size) {
  const apiKey = process.env.BFL_API_KEY;
  if (!apiKey) throw new Error("BFL_API_KEY is not set");

  const body = { prompt, output_format: "png" };

  if (size) body.aspect_ratio = size;

  const isKontext = model.startsWith("flux-kontext");
  const maxImages = isKontext ? 4 : 8;
  const imagesToUse = sourceImages.slice(0, maxImages);

  for (let i = 0; i < imagesToUse.length; i++) {
    const imageBuffer = fs.readFileSync(imagesToUse[i]);
    const key = i === 0 ? "input_image" : `input_image_${i + 1}`;
    body[key] = imageBuffer.toString("base64");
  }

  const submitRes = await fetch(`${BFL_API_URL}/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`BFL API error (${submitRes.status}): ${err}`);
  }

  const { id } = await submitRes.json();

  while (true) {
    await new Promise((r) => setTimeout(r, BFL_POLL_INTERVAL_MS));

    const pollRes = await fetch(`${BFL_API_URL}/get_result?id=${id}`, {
      headers: { "x-key": apiKey },
    });

    const result = await pollRes.json().catch(() => null);
    if (!result) {
      const err = await pollRes.text();
      throw new Error(`BFL polling error (${pollRes.status}): ${err}`);
    }

    if (result.status === "Ready") {
      const imageRes = await fetch(result.result.sample);
      if (!imageRes.ok) throw new Error("Failed to download generated image");
      return Buffer.from(await imageRes.arrayBuffer());
    }

    if (result.status === "Error" || result.status === "Failed" || result.status === "Request Moderated" || result.status === "Content Moderated") {
      throw new Error(`BFL generation failed: ${result.status}`);
    }

    // "Task not found", "Pending" — keep polling
  }
}
