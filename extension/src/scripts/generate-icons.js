// Script to generate green icons for ClickRemix BYOK
// Run with: node generate-icons.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Secondary color from theme.css converted to hex: #4EBEAA
const GREEN_COLOR = '#4EBEAA';

const sizes = [16, 32, 48, 128];

const svgTemplate = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
  <rect width="24" height="24" fill="${GREEN_COLOR}" rx="4"/>
  <path d="M14 4.1 12 6M5.1 8l-2.9-.8M6 12l-1.9 2M7.2 2.2 8 5.1M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"
        fill="none"
        stroke="white"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"/>
</svg>`;

async function generateIcons() {
  console.log('ClickRemix BYOK Icon Generator');
  console.log('================================\n');

  const outputDir = path.join(__dirname, 'extension', 'src');

  for (const size of sizes) {
    const svg = svgTemplate(size);
    const pngFilename = `icon-${size}.png`;
    const pngPath = path.join(outputDir, pngFilename);

    try {
      await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(pngPath);

      console.log(`✓ Created ${pngFilename} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to create ${pngFilename}:`, error.message);
    }
  }

  console.log('\n✨ PNG icons created successfully!');
  console.log(`\nIcons are using green color: ${GREEN_COLOR}`);
}

generateIcons().catch(console.error);
