import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import dotenv from "dotenv";
import OpenAI, { toFile } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const MODELS = {
  "gpt-image-1": "openai",
  "gpt-image-1.5": "openai",
  "gemini-2.5-flash-image": "gemini",
  "gemini-3-pro-image-preview": "gemini",
  "gemini-3.1-flash-image-preview": "gemini",
};

const DEFAULT_MODEL = "gpt-image-1.5";

const SIZES = {
  openai: ["1024x1024", "1536x1024", "1024x1536"],
  gemini: ["512px", "1K", "2K", "4K"],
};

function parseArgs(argv) {
  const args = argv.slice(2);
  let model = null;
  let size = null;
  let background = null;
  let quality = null;
  let open = false;
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--model" && i + 1 < args.length) {
      model = args[++i];
    } else if (args[i] === "--size" && i + 1 < args.length) {
      size = args[++i];
    } else if (args[i] === "--background" && i + 1 < args.length) {
      background = args[++i];
    } else if (args[i] === "--quality" && i + 1 < args.length) {
      quality = args[++i];
    } else if (args[i] === "--models") {
      console.log("Available models:\n");
      for (const [name, provider] of Object.entries(MODELS)) {
        const tag = name === DEFAULT_MODEL ? " (default)" : "";
        console.log(`  ${name} [${provider}]${tag}`);
      }
      process.exit(0);
    } else if (args[i] === "--sizes") {
      console.log("Available sizes by provider:\n");
      for (const [provider, sizes] of Object.entries(SIZES)) {
        console.log(`  ${provider}: ${sizes.join(", ")}`);
      }
      process.exit(0);
    } else if (args[i] === "--open") {
      open = true;
    } else {
      positional.push(args[i]);
    }
  }

  const sourceImage = positional[0];
  const output = positional[1];
  const prompt = positional[2];

  if (!sourceImage || !output || !prompt) {
    console.error('Usage: node picasso.js <input_file> <output_file> "prompt" [--model <model>] [--size <size>] [--quality <quality>] [--open]');
    console.error(`\nAvailable models: ${Object.keys(MODELS).join(", ")}`);
    process.exit(1);
  }

  model = model || DEFAULT_MODEL;
  const provider = MODELS[model];
  if (!provider) {
    console.error(`Unknown model: ${model}`);
    console.error(`Available models: ${Object.keys(MODELS).join(", ")}`);
    process.exit(1);
  }

  return { output, prompt, sourceImage, provider, model, size, background, quality, open };
}

async function generateOpenAI(prompt, sourceImage, model, size, background, quality) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const mimeType = sourceImage.endsWith(".png") ? "image/png" : "image/jpeg";
  const image = await toFile(fs.createReadStream(sourceImage), null, { type: mimeType });
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

async function generateGemini(prompt, sourceImage, model, size) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const genModel = genAI.getGenerativeModel({ model });

  const imageBuffer = fs.readFileSync(sourceImage);
  const mimeType = sourceImage.endsWith(".png") ? "image/png" : "image/jpeg";
  const contents = [{
    role: "user",
    parts: [
      { inlineData: { data: imageBuffer.toString("base64"), mimeType } },
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

async function main() {
  const { output, prompt, sourceImage, provider, model, size, background, quality, open } = parseArgs(process.argv);

  const outputDir = path.dirname(path.resolve(output));
  fs.mkdirSync(outputDir, { recursive: true });

  const frames = ["Generating.", "Generating..", "Generating..."];
  let i = 0;
  const spinner = setInterval(() => {
    process.stdout.write(`\r${frames[i++ % frames.length]}`);
  }, 400);

  try {
    const generate = provider === "openai" ? generateOpenAI : generateGemini;
    const buf = await generate(prompt, sourceImage, model, size, background, quality);

    fs.writeFileSync(output, buf);
    clearInterval(spinner);
    process.stdout.write(`\rSaved: ${output}\n`);
    if (open) {
      execSync(`open "${path.resolve(output)}"`);
    }
  } catch (err) {
    clearInterval(spinner);
    process.stdout.write(`\r`);
    throw err;
  }
}

main();
