import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// App icon SVG - checklist with bell (256x256)
const appIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6C63FF"/>
      <stop offset="100%" style="stop-color:#3B35B0"/>
    </linearGradient>
    <linearGradient id="bell" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD93D"/>
      <stop offset="100%" style="stop-color:#FF9F1C"/>
    </linearGradient>
  </defs>
  <!-- Rounded square background -->
  <rect x="8" y="8" width="240" height="240" rx="48" ry="48" fill="url(#bg)"/>

  <!-- Clipboard body -->
  <rect x="58" y="60" width="140" height="160" rx="12" ry="12" fill="white" opacity="0.95"/>
  <!-- Clipboard top clip -->
  <rect x="98" y="48" width="60" height="24" rx="8" ry="8" fill="white" opacity="0.95"/>
  <rect x="108" y="44" width="40" height="14" rx="7" ry="7" fill="#6C63FF"/>

  <!-- Checkmark line 1 (completed) -->
  <circle cx="88" cy="100" r="10" fill="none" stroke="#6C63FF" stroke-width="3"/>
  <polyline points="82,100 86,105 95,94" fill="none" stroke="#6C63FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="108" y="94" width="72" height="6" rx="3" fill="#6C63FF" opacity="0.3"/>

  <!-- Checkmark line 2 (completed) -->
  <circle cx="88" cy="132" r="10" fill="none" stroke="#6C63FF" stroke-width="3"/>
  <polyline points="82,132 86,137 95,126" fill="none" stroke="#6C63FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="108" y="126" width="56" height="6" rx="3" fill="#6C63FF" opacity="0.3"/>

  <!-- Checkmark line 3 (pending) -->
  <circle cx="88" cy="164" r="10" fill="none" stroke="#AAAACC" stroke-width="3"/>
  <rect x="108" y="158" width="64" height="6" rx="3" fill="#AAAACC" opacity="0.4"/>

  <!-- Checkmark line 4 (pending) -->
  <circle cx="88" cy="196" r="10" fill="none" stroke="#AAAACC" stroke-width="3"/>
  <rect x="108" y="190" width="48" height="6" rx="3" fill="#AAAACC" opacity="0.4"/>

  <!-- Bell notification badge -->
  <circle cx="192" cy="64" r="32" fill="url(#bell)"/>
  <g transform="translate(192,60)">
    <!-- Bell shape -->
    <path d="M0-16 C-10-16-14-8-14-2 L-14,4 -18,8 18,8 14,4 14,-2 C14-8 10-16 0-16Z"
          fill="white" stroke="none"/>
    <circle cx="0" cy="12" r="4" fill="white"/>
    <!-- Bell top -->
    <circle cx="0" cy="-16" r="2.5" fill="white"/>
  </g>
</svg>
`;

// Tray icon SVG - simple, clear at 16x16/32x32, white for dark taskbar
const trayIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <!-- Clipboard outline -->
  <rect x="12" y="14" width="40" height="44" rx="4" ry="4" fill="none" stroke="white" stroke-width="3.5"/>
  <!-- Clip top -->
  <rect x="22" y="9" width="20" height="10" rx="3" ry="3" fill="none" stroke="white" stroke-width="3"/>

  <!-- Check 1 -->
  <polyline points="19,28 23,33 31,24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="35" y1="28" x2="46" y2="28" stroke="white" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Check 2 -->
  <polyline points="19,42 23,47 31,38" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="35" y1="42" x2="44" y2="42" stroke="white" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Bell badge -->
  <circle cx="50" cy="14" r="10" fill="#FF6B6B"/>
  <g transform="translate(50,13)">
    <path d="M0-5 C-3.5-5-5-2.5-5,0 L-5,2 -6,3.5 6,3.5 5,2 5,0 C5-2.5 3.5-5 0-5Z" fill="white"/>
    <circle cx="0" cy="5.5" r="1.5" fill="white"/>
  </g>
</svg>
`;

async function generate() {
  // App icon - 256x256 PNG
  await sharp(Buffer.from(appIconSvg))
    .resize(256, 256)
    .png()
    .toFile(path.join(publicDir, 'icon.png'));
  console.log('Generated: public/icon.png (256x256)');

  // Also generate 512x512 for higher quality
  await sharp(Buffer.from(appIconSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Generated: public/icon-512.png (512x512)');

  // ICO needs 256x256 PNG (electron-builder converts to .ico)

  // Tray icon - 32x32 PNG (Windows tray standard)
  await sharp(Buffer.from(trayIconSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'tray-icon.png'));
  console.log('Generated: public/tray-icon.png (32x32)');

  // Tray icon 64x64 for high DPI
  await sharp(Buffer.from(trayIconSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'tray-icon@2x.png'));
  console.log('Generated: public/tray-icon@2x.png (64x64)');

  // Generate base64 for inline tray icon fallback
  const tray32 = await sharp(Buffer.from(trayIconSvg))
    .resize(32, 32)
    .png()
    .toBuffer();
  console.log('\nTray icon base64 (for main.ts):');
  console.log(`data:image/png;base64,${tray32.toString('base64')}`);
}

generate().catch(console.error);
