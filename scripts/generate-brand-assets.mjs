import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

function packIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  let offset = 6 + count * 16;
  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // No color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset of image data
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...images.map((img) => img.buffer)]);
}

async function run() {
  console.log('Generating Clarice Achadinhos favicons and footer assets...');

  // 1. Footer seal
  const logoSquarePath = path.resolve('public/brand/logo-square.jpg');
  const seloDescontoPath = path.resolve('public/brand/selo-clarice-desconto.jpg');
  fs.copyFileSync(logoSquarePath, seloDescontoPath);
  console.log('✓ Copied to', seloDescontoPath);

  // Generate selo-clarice-footer.png and .webp
  const footerPngPath = path.resolve('public/brand/selo-clarice-footer.png');
  const footerWebpPath = path.resolve('public/brand/selo-clarice-footer.webp');

  await sharp(seloDescontoPath)
    .resize(320, 320, { fit: 'cover' })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(footerPngPath);
  console.log('✓ Generated', footerPngPath);

  await sharp(seloDescontoPath)
    .resize(320, 320, { fit: 'cover' })
    .webp({ quality: 90 })
    .toFile(footerWebpPath);
  console.log('✓ Generated', footerWebpPath);

  // 2. Favicons
  const avatarSource = path.resolve('public/icon-192.png');
  const b16 = await sharp(avatarSource).resize(16, 16).png().toBuffer();
  const b32 = await sharp(avatarSource).resize(32, 32).png().toBuffer();
  const b48 = await sharp(avatarSource).resize(48, 48).png().toBuffer();

  // Save public/favicon.png (32x32)
  const faviconPngPath = path.resolve('public/favicon.png');
  fs.writeFileSync(faviconPngPath, b32);
  console.log('✓ Generated', faviconPngPath);

  // Save public/favicon-48.png (48x48)
  const favicon48PngPath = path.resolve('public/favicon-48.png');
  fs.writeFileSync(favicon48PngPath, b48);
  console.log('✓ Generated', favicon48PngPath);

  // Save public/favicon.ico
  const icoBuffer = packIco([
    { width: 16, height: 16, buffer: b16 },
    { width: 32, height: 32, buffer: b32 },
    { width: 48, height: 48, buffer: b48 },
  ]);
  const faviconIcoPath = path.resolve('public/favicon.ico');
  fs.writeFileSync(faviconIcoPath, icoBuffer);
  console.log('✓ Generated', faviconIcoPath, 'size:', icoBuffer.length, 'bytes');

  console.log('All brand and favicon assets created successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
