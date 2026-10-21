import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";
import { MODELS, DEFAULT_MODEL, validateSize, validateQuality, printModels, printSizes } from "./models.js";
import { generateOpenAI } from "./providers/openai.js";
import { generateGemini } from "./providers/gemini.js";
import { generateFlux } from "./providers/flux.js";

dotenv.config();

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
      printModels();
      process.exit(0);
    } else if (args[i] === "--sizes") {
      printSizes();
      process.exit(0);
    } else if (args[i] === "--open") {
      open = true;
    } else {
      positional.push(args[i]);
    }
  }

  if (positional.length < 3) {
    console.error('Usage: node editImage.js <input_file> [input_file2 ...] <output_file> "prompt" [--model <model>] [--size <size>] [--quality <quality>] [--open]');
    console.error(`\nAvailable models: ${Object.keys(MODELS).join(", ")}`);
    process.exit(1);
  }

  const prompt = positional[positional.length - 1];
  const output = positional[positional.length - 2];
  const sourceImages = positional.slice(0, -2);

  model = model || DEFAULT_MODEL;
  const provider = MODELS[model];
  if (!provider) {
    console.error(`Unknown model: ${model}`);
    console.error(`Available models: ${Object.keys(MODELS).join(", ")}`);
    process.exit(1);
  }

  const sizeError = size && validateSize(model, size);
  if (sizeError) {
    console.error(sizeError);
    process.exit(1);
  }

  const qualityError = quality && validateQuality(model, quality);
  if (qualityError) {
    console.error(qualityError);
    process.exit(1);
  }

  return { output, prompt, sourceImages, provider, model, size, background, quality, open };
}

async function main() {
  const { output, prompt, sourceImages, provider, model, size, background, quality, open } = parseArgs(process.argv);

  const outputDir = path.dirname(path.resolve(output));
  fs.mkdirSync(outputDir, { recursive: true });

  const frames = ["Generating.", "Generating..", "Generating..."];
  let i = 0;
  const spinner = setInterval(() => {
    process.stdout.write(`\r${frames[i++ % frames.length]}`);
  }, 400);

  try {
    const generators = { openai: generateOpenAI, gemini: generateGemini, flux: generateFlux };
    const generate = generators[provider];
    const buf = await generate(prompt, sourceImages, model, size, background, quality);

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
