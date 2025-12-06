const fs = require("fs");
const path = require("path");

const source = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "node_modules",
  "@alpinejs",
  "csp",
  "dist",
  "module.esm.js",
);
const targetDir = path.resolve(__dirname, "..", "vendor");
const target = path.join(targetDir, "alpinejs-csp.esm.js");

if (!fs.existsSync(source)) {
  console.error("Alpine CSP ESM build not found. Did you run `npm install`?");
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(
  `✓ Copied Alpine CSP ESM to ${path.relative(process.cwd(), target)}`,
);
