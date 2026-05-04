const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

sizes.forEach(size => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0f"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.35}" fill="none" stroke="#d4af37" stroke-width="${size*0.04}"/>
  <polygon points="${size/2},${size*0.3} ${size*0.56},${size*0.43} ${size*0.7},${size*0.43} ${size*0.6},${size*0.5} ${size*0.64},${size*0.64} ${size*0.5},${size*0.55} ${size*0.36},${size*0.64} ${size*0.4},${size*0.5} ${size*0.3},${size*0.43} ${size*0.44},${size*0.43}" fill="#d4af37"/>
</svg>`;

  fs.writeFileSync(path.join(publicDir, `pwa-${size}x${size}.png`), Buffer.from(svg));
  console.log(`Created pwa-${size}x${size}.png`);
});

console.log('Icon generation complete');