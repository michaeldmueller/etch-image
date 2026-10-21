#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";
import os from "os";
import { fileURLToPath } from "url";
import { MODELS, DEFAULT_MODEL, validateSize, validateQuality, printModels, printSizes } from "./models.js";
import { textToImageOpenAI, generateOpenAI } from "./providers/openai.js";
import { textToImageGemini, generateGemini } from "./providers/gemini.js";
import { textToImageFlux, generateFlux } from "./providers/flux.js";

// API keys come from the shell environment, then the project's .env, then ~/.etch/.env.
// dotenv never overrides a variable that is already set, so earlier sources win.
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });
dotenv.config({ path: path.join(os.homedir(), ".etch", ".env") });

const USAGE = 'Usage: etch [input_file ...] <output_file> "prompt" [--model <model>] [--size <size>] [--quality <quality>] [--background <background>] [--open | --dont-open]';

// Built-in defaults. Any of these can be overridden in ~/.etch/config.json,
// and a CLI flag overrides both.
const CONFIG_PATH = path.join(os.homedir(), ".etch", "config.json");
const DEFAULTS = {
  model: DEFAULT_MODEL,
  size: null,
  quality: null,
  background: null,
  open: true,
};

function loadConfig() {
  let raw;
  try {
    raw = fs.readFileSync(CONFIG_PATH, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    console.error(`Invalid JSON in ${CONFIG_PATH}: ${err.message}`);
    process.exit(1);
  }

  const unknown = Object.keys(config).filter((key) => !(key in DEFAULTS));
  if (unknown.length > 0) {
    console.error(`Unknown setting${unknown.length > 1 ? "s" : ""} in ${CONFIG_PATH}: ${unknown.join(", ")}`);
    console.error(`Valid settings: ${Object.keys(DEFAULTS).join(", ")}`);
    process.exit(1);
  }
  if ("open" in config && typeof config.open !== "boolean") {
    console.error(`Invalid value for "open" in ${CONFIG_PATH}: expected true or false`);
    process.exit(1);
  }
  return config;
}

function printConfig(settings) {
  console.log(`Config file: ${CONFIG_PATH}${fs.existsSync(CONFIG_PATH) ? "" : " (not found)"}\n`);
  console.log("Effective defaults:\n");
  for (const [key, value] of Object.entries(settings)) {
    console.log(`  ${key}: ${value === null ? "(provider default)" : value}`);
  }
}

function openFile(file) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? 'start ""' : "xdg-open";
  execSync(`${cmd} "${file}"`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const settings = { ...DEFAULTS, ...loadConfig() };
  let { model, size, background, quality, open } = settings;
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
    } else if (args[i] === "--dont-open") {
      open = false;
    } else if (args[i] === "--config") {
      printConfig(settings);
      process.exit(0);
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(USAGE);
      process.exit(0);
    } else if (args[i].startsWith("--")) {
      console.error(`Unknown option: ${args[i]}\n${USAGE}`);
      process.exit(1);
    } else {
      positional.push(args[i]);
    }
  }

  if (positional.length < 2) {
    console.error(USAGE);
    console.error(`\nAvailable models: ${Object.keys(MODELS).join(", ")}`);
    process.exit(1);
  }

  const prompt = positional[positional.length - 1];
  const output = positional[positional.length - 2];
  const sourceImages = positional.slice(0, -2);

  for (const src of sourceImages) {
    if (!fs.existsSync(src)) {
      console.error(`Input file not found: ${src}`);
      process.exit(1);
    }
  }

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

const GENERATORS = {
  openai: { create: textToImageOpenAI, edit: generateOpenAI },
  gemini: { create: textToImageGemini, edit: generateGemini },
  flux: { create: textToImageFlux, edit: generateFlux },
};

async function main() {
  const { output, prompt, sourceImages, provider, model, size, background, quality, open } = parseArgs(process.argv);

  const outputDir = path.dirname(path.resolve(output));
  fs.mkdirSync(outputDir, { recursive: true });

  const isEdit = sourceImages.length > 0;
  const verb = isEdit ? "Editing" : "Generating";
  const frames = [`${verb}.`, `${verb}..`, `${verb}...`];
  let i = 0;
  const spinner = setInterval(() => {
    process.stdout.write(`\r${frames[i++ % frames.length]}`);
  }, 400);

  try {
    const buf = isEdit
      ? await GENERATORS[provider].edit(prompt, sourceImages, model, size, background, quality)
      : await GENERATORS[provider].create(prompt, model, size, background, quality);

    fs.writeFileSync(output, buf);
    clearInterval(spinner);
    process.stdout.write(`\rSaved: ${output}\n`);
    if (open) {
      openFile(path.resolve(output));
    }
  } catch (err) {
    clearInterval(spinner);
    process.stdout.write(`\r`);
    throw err;
  }
}

main();
