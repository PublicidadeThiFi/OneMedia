import fs from "fs";
import path from "path";

const version =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.CI_COMMIT_SHA ||
  String(Date.now());

// Ensure public/ exists (Vite static dir)
const publicDir = path.resolve(process.cwd(), "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outPath = path.join(publicDir, "version.json");
fs.writeFileSync(outPath, JSON.stringify({ version }, null, 2), "utf-8");

console.log(`version.json written: ${version}`);
