const sharp = require('sharp');
const fs = require('fs');

const svgContent = fs.readFileSync('public/icons/icon-192.svg', 'utf8');

// Generate 192x192
sharp(Buffer.from(svgContent))
  .resize(192, 192)
  .png()
  .toFile('public/icons/icon-192.png')
  .then(() => console.log('icon-192.png done'))
  .catch(e => console.error('192 error:', e.message));

// Generate 512x512 - resize same SVG
sharp(Buffer.from(svgContent))
  .resize(512, 512)
  .png()
  .toFile('public/icons/icon-512.png')
  .then(() => console.log('icon-512.png done'))
  .catch(e => console.error('512 error:', e.message));
