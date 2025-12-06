const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const EXT_SRC = path.resolve(__dirname, "..");
const EXT_DIST = path.resolve(__dirname, "..", "..", "dist");
const supportsRecursiveWatch = ["darwin", "win32"].includes(process.platform);

// Icon sizes required for Chrome extension
const ICON_SIZES = [16, 32, 48, 128];

// Render SVG at this size first, then downscale for crisp results
const RENDER_SIZE = 512;

// Files and folders to copy from extension/src to extension/dist
// Excludes: _metadata (Chrome-generated), styles/ (Tailwind input only), icon.svg (processed separately)
// Note: popup.html is handled separately (CSS injection)
// Note: logger.js is handled separately (production flag injection)
const EXTENSION_FILES = [
  "manifest.json",
  "background.js",
  "contentScript.js",
  "popup.js",
  "ratelimit.js",
  "rules.json",
  "vendor",
];

// Check if running in watch mode or production mode
const isWatchMode = process.argv.includes("--watch");
const isProduction = process.argv.includes("--production");

// Clean dist folder
function cleanDist() {
  if (fs.existsSync(EXT_DIST)) {
    fs.rmSync(EXT_DIST, { recursive: true });
  }
  fs.mkdirSync(EXT_DIST, { recursive: true });
  console.log("✓ Cleaned extension/dist/");
}

// Copy a file or directory recursively
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy a single file/folder
function copyFile(file) {
  const srcPath = path.join(EXT_SRC, file);
  const destPath = path.join(EXT_DIST, file);

  if (fs.existsSync(srcPath)) {
    // If destination exists and is a directory, remove it first
    if (fs.existsSync(destPath)) {
      const stat = fs.statSync(destPath);
      if (stat.isDirectory()) {
        fs.rmSync(destPath, { recursive: true });
      }
    }
    copyRecursive(srcPath, destPath);
    return true;
  }
  return false;
}

// Copy extension files from src to dist
function copyExtensionFiles() {
  for (const file of EXTENSION_FILES) {
    if (copyFile(file)) {
      console.log(`✓ Copied ${file}`);
    } else {
      console.warn(`⚠ Skipped ${file} (not found)`);
    }
  }
}

// Process logger.js with production flag
function processLogger() {
  const srcPath = path.join(EXT_SRC, "logger.js");
  const destPath = path.join(EXT_DIST, "logger.js");

  if (!fs.existsSync(srcPath)) {
    console.warn("⚠ Skipped logger.js (not found)");
    return;
  }

  let content = fs.readFileSync(srcPath, "utf-8");

  // Replace DEBUG_MODE flag based on build mode
  const debugMode = isProduction ? "false" : "true";
  content = content.replace(
    /const DEBUG_MODE = true;/,
    `const DEBUG_MODE = ${debugMode};`,
  );

  fs.writeFileSync(destPath, content);
  console.log(`✓ Processed logger.js (DEBUG_MODE=${debugMode})`);
}

// Generate PNG icons from SVG
async function generateIcons() {
  const svgPath = path.join(EXT_SRC, "icon.svg");

  if (!fs.existsSync(svgPath)) {
    console.warn("⚠ Skipped icons (icon.svg not found)");
    return;
  }

  let sharp;
  try {
    sharp = require("sharp");
  } catch (e) {
    console.warn("⚠ Skipped icons (sharp not installed, run npm install)");
    return;
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // First render SVG at high resolution
  const highResBuffer = await sharp(svgBuffer)
    .resize(RENDER_SIZE, RENDER_SIZE)
    .png()
    .toBuffer();

  // Then downscale to each target size for crisp results
  for (const size of ICON_SIZES) {
    const outputPath = path.join(EXT_DIST, `icon-${size}.png`);
    await sharp(highResBuffer)
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toFile(outputPath);
  }

  console.log(`✓ Generated icons (${ICON_SIZES.join(", ")}px)`);
}

// Build Tailwind CSS and return the content
function buildTailwindCSS() {
  const inputPath = path.join(EXT_SRC, "styles", "tailwind-input.css");
  const outputPath = path.join(EXT_DIST, "tailwind.css");

  try {
    execSync(`npx tailwindcss -i "${inputPath}" -o "${outputPath}" --minify`, {
      cwd: ROOT,
      stdio: "pipe",
    });
    const css = fs.readFileSync(outputPath, "utf-8");
    // Remove the temp file since we'll inline it
    fs.unlinkSync(outputPath);
    return css;
  } catch (error) {
    console.error("✗ Failed to build Tailwind CSS");
    process.exit(1);
  }
}

// Process popup.html - inline CSS only
function processPopupHtml(tailwindCSS) {
  const srcPath = path.join(EXT_SRC, "popup.html");
  const destPath = path.join(EXT_DIST, "popup.html");
  const popupCssPath = path.join(EXT_SRC, "popup.css");
  const themeCssPath = path.join(EXT_SRC, "theme.css");

  let html = fs.readFileSync(srcPath, "utf-8");

  // Read CSS files
  const popupCSS = fs.existsSync(popupCssPath)
    ? fs.readFileSync(popupCssPath, "utf-8")
    : "";
  const themeCSS = fs.existsSync(themeCssPath)
    ? fs.readFileSync(themeCssPath, "utf-8")
    : "";

  // Combine all CSS
  const combinedCSS = `${tailwindCSS}\n${themeCSS}\n${popupCSS}`;

  // Remove external CSS links
  html = html.replace(/<link[^>]*href=["']tailwind\.css["'][^>]*>\s*/gi, "");
  html = html.replace(/<link[^>]*href=["']popup\.css["'][^>]*>\s*/gi, "");
  html = html.replace(/<link[^>]*href=["']theme\.css["'][^>]*>\s*/gi, "");

  // Inject combined CSS as inline style in <head>
  const styleTag = `<style>${combinedCSS}</style>`;
  html = html.replace("</head>", `${styleTag}\n</head>`);

  fs.writeFileSync(destPath, html);
  console.log("✓ Built popup.html (CSS inlined)");
}

// Perform the build steps
async function performBuild() {
  cleanDist();
  copyExtensionFiles();
  processLogger();

  await generateIcons();

  const tailwindCSS = buildTailwindCSS();
  console.log("✓ Built Tailwind CSS");

  processPopupHtml(tailwindCSS);
}

// Full build
async function build() {
  console.log("\n🔨 Building extension...\n");
  if (isProduction) {
    console.log("🚀 Production mode: Logging disabled\n");
  }

  await performBuild();

  console.log("\n✅ Extension built successfully in extension/dist/\n");
}

// Watch mode - rebuild on changes
async function watchBuild() {
  console.log("\n🔨 Building extension (watch mode)...\n");

  await performBuild();

  console.log("\n✅ Initial build complete. Watching for changes...\n");

  if (!supportsRecursiveWatch) {
    console.log("ℹ️ Recursive file watching not supported on this platform; watching top-level directories.");
  }

  // Files to watch
  const watchedFiles = [
    ...EXTENSION_FILES,
    "logger.js",
    "popup.html",
    "popup.css",
    "theme.css",
    "styles",
    "icon.svg",
  ];

  for (const file of watchedFiles) {
    const srcPath = path.join(EXT_SRC, file);
    if (!fs.existsSync(srcPath)) continue;

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      const handler = (eventType, filename) => {
        if (filename) {
          console.log(`📝 Changed: ${file}/${filename}`);
          rebuildOnChange(file, filename);
        }
      };

      try {
        if (supportsRecursiveWatch) {
          fs.watch(srcPath, { recursive: true }, handler);
        } else {
          fs.watch(srcPath, handler);
        }
      } catch (error) {
        console.warn(`⚠ Failed to watch ${file}: ${error.message}`);
      }
    } else {
      fs.watch(srcPath, () => {
        console.log(`📝 Changed: ${file}`);
        rebuildOnChange(file, null);
      });
    }
  }
}

// Handle rebuilding specific files on change
async function rebuildOnChange(file, filename) {
  // If icon.svg changed, regenerate icons
  if (file === "icon.svg") {
    try {
      await generateIcons();
      console.log("✓ Regenerated icons");
    } catch (e) {
      console.error("✗ Failed to regenerate icons:", e.message);
    }
    return;
  }

  // If logger.js changed, reprocess it
  if (file === "logger.js") {
    try {
      processLogger();
    } catch (e) {
      console.error("✗ Failed to process logger.js:", e.message);
    }
    return;
  }

  // Files that require rebuilding popup.html (CSS-related)
  const cssRelated = ["popup.css", "theme.css", "styles", "popup.html"];

  if (cssRelated.includes(file)) {
    try {
      const tailwindCSS = buildTailwindCSS();
      processPopupHtml(tailwindCSS);
      console.log("✓ Rebuilt popup.html");
    } catch (e) {
      console.error("✗ Failed to rebuild:", e.message);
    }
    return;
  }

  // Otherwise just copy the changed file
  if (copyFile(file)) {
    console.log(`✓ Updated ${file}`);
  }
}

// Main
if (isWatchMode) {
  watchBuild();
} else {
  build();
}
