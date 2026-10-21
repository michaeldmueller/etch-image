import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_RATES } from "../models.js";

// Estimates cost from token usage and the published per-token rates.
function estimateCost(model, usage) {
  const rate = GEMINI_RATES[model];
  if (!rate || !usage) return null;
  const usd = ((usage.promptTokenCount ?? 0) * rate.in + (usage.candidatesTokenCount ?? 0) * rate.out) / 1e6;
  return { usd, estimated: true };
}

export async function textToImageGemini(prompt, model, size) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const genModel = genAI.getGenerativeModel({ model });

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      ...(size && { imageConfig: { imageSize: size } }),
    },
  });

  const parts = result.response.candidates[0].content.parts;
  for (const part of parts) {
    if (part.inlineData) {
      return { buffer: Buffer.from(part.inlineData.data, "base64"), cost: estimateCost(model, result.response.usageMetadata) };
    }
  }

  throw new Error("Gemini returned no image data");
}

export async function generateGemini(prompt, sourceImages, model, size) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const genModel = genAI.getGenerativeModel({ model });

  const imageParts = sourceImages.map((src) => {
    const imageBuffer = fs.readFileSync(src);
    const mimeType = src.endsWith(".png") ? "image/png" : "image/jpeg";
    return { inlineData: { data: imageBuffer.toString("base64"), mimeType } };
  });

  const contents = [{
    role: "user",
    parts: [
      ...imageParts,
      { text: prompt },
    ],
  }];

  const result = await genModel.generateContent({
    contents,
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      ...(size && { imageConfig: { imageSize: size } }),
    },
  });

  const parts = result.response.candidates[0].content.parts;
  for (const part of parts) {
    if (part.inlineData) {
      return { buffer: Buffer.from(part.inlineData.data, "base64"), cost: estimateCost(model, result.response.usageMetadata) };
    }
  }

  throw new Error("Gemini returned no image data");
}
