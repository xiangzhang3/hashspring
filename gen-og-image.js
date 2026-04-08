// Generate a simple OG image as SVG → PNG placeholder
const fs = require('fs');
const path = process.argv[2] || '/Users/xiangzhang/hashspring-next';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect fill="#0a0a1a" width="1200" height="630"/>
  <rect fill="#0066FF" x="0" y="0" width="1200" height="4"/>
  <circle cx="200" cy="315" r="60" fill="#0066FF" opacity="0.15"/>
  <text x="200" y="330" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" font-weight="bold" fill="#0066FF">H</text>
  <text x="340" y="300" font-family="Arial,sans-serif" font-size="56" font-weight="bold" fill="white">HashSpring</text>
  <text x="340" y="360" font-family="Arial,sans-serif" font-size="24" fill="#8888aa">GLOBAL CRYPTO INTELLIGENCE</text>
  <rect fill="#0066FF" opacity="0.1" x="340" y="400" width="520" height="40" rx="20"/>
  <text x="600" y="426" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#0066FF">Real-time News · Market Data · AI Analysis</text>
</svg>`;

fs.writeFileSync(path + '/public/og-image.svg', svg);
// Also write as the referenced og-image.png path (SVG works as fallback)
fs.writeFileSync(path + '/public/og-image.png', svg);
console.log('OG image created at public/og-image.svg');
