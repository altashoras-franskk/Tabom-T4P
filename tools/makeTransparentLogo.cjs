/* eslint-disable no-console */
const path = require("path");
const sharp = require("sharp");

async function main() {
  const inp = path.resolve(__dirname, "..", "src", "assets", "devices-for-intuition-logo.png");
  const out = path.resolve(__dirname, "..", "src", "assets", "devices-for-intuition-logo-transparent.png");

  const res = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const data = Buffer.from(res.data);
  const info = res.info;

  // Key out near-black background only (keep dark strokes).
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 8 && g < 8 && b < 8) data[i + 3] = 0;
  }

  await sharp(data, { raw: info }).png().toFile(out);
  console.log("Wrote", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

