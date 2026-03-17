import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
      responseModalities: ["IMAGE"],
      ...(size && { imageConfig: { imageSize: size } }),
    },
  });

  const parts = result.response.candidates[0].content.parts;
  for (const part of parts) {
    if (part.inlineData) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  throw new Error("Gemini returned no image data");
}
