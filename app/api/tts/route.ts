import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export async function POST(req: Request) {
  const { text } = await req.json().catch(() => ({}));
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const model = process.env.PIPER_MODEL_PATH;
  const config = process.env.PIPER_CONFIG_PATH;
  if (!model || !config) {
    return NextResponse.json(
      { error: "Set PIPER_MODEL_PATH and PIPER_CONFIG_PATH" },
      { status: 500 },
    );
  }

  const outPath = path.join(os.tmpdir(), `piper-${Date.now()}.wav`);
  const piperBin = process.env.PIPER_BIN || "piper";

  await new Promise<void>((resolve, reject) => {
    const p = spawn(piperBin, [
      "--model",
      model,
      "--config",
      config,
      "--output_file",
      outPath,
    ]);

    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString("utf8")));

    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`piper exited ${code}: ${stderr}`));
    });

    p.stdin.write(text);
    p.stdin.end();
  });

  const wav = await fs.readFile(outPath);
  await fs.unlink(outPath).catch(() => {});

  return new NextResponse(wav, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
    },
  });
}
