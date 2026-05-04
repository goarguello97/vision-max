import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0a0a0f"/>
  <circle cx="256" cy="256" r="180" fill="none" stroke="#d4af37" stroke-width="20"/>
  <circle cx="256" cy="256" r="120" fill="none" stroke="#d4af37" stroke-width="8" opacity="0.5"/>
  <polygon points="256,160 290,220 360,220 310,260 330,330 256,285 182,330 202,260 152,220 222,220" fill="#d4af37"/>
</svg>`;

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
];

const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generateIcons() {
  for (const { name, size } of sizes) {
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, name));
    console.log(`Generated ${name}`);
  }
  console.log('All icons generated!');
}

generateIcons().catch(console.error);