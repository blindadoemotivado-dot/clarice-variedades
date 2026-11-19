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

async function main() {
  console.log('🎨 [Clarice Achadinhos] Gerando ícones oficiais do PWA em alta resolução...');

  const sourcePath = path.resolve('public/brand/logo-square.jpg');
  if (!fs.existsSync(sourcePath)) {
    console.error('❌ Imagem fonte não encontrada:', sourcePath);
    process.exit(1);
  }

  const iconsDir = path.resolve('public/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
    console.log('✓ Diretório criado:', iconsDir);
  }

  // 1. icon-192x192.png
  const icon192Path = path.join(iconsDir, 'icon-192x192.png');
  await sharp(sourcePath)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(icon192Path);
  console.log('✓ Gerado: public/icons/icon-192x192.png');

  // 2. icon-512x512.png
  const icon512Path = path.join(iconsDir, 'icon-512x512.png');
  await sharp(sourcePath)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(icon512Path);
  console.log('✓ Gerado: public/icons/icon-512x512.png');

  // 3. icon-512x512-maskable.png (com padding de área segura para Android Adaptive Icons)
  // O padrão W3C para maskable icons prevê uma área central segura de 80% (diâmetro ~410px no canvas de 512px).
  // A cor de fundo oficial da logo é #131d36 (RGB 19, 29, 54).
  const safeInnerSize = 410;
  const innerBuffer = await sharp(sourcePath)
    .resize(safeInnerSize, safeInnerSize, { fit: 'contain' })
    .toBuffer();

  const icon512MaskablePath = path.join(iconsDir, 'icon-512x512-maskable.png');
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 19, g: 29, b: 54, alpha: 1 },
    },
  })
    .composite([
      {
        input: innerBuffer,
        top: Math.round((512 - safeInnerSize) / 2),
        left: Math.round((512 - safeInnerSize) / 2),
      },
    ])
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(icon512MaskablePath);
  console.log('✓ Gerado: public/icons/icon-512x512-maskable.png (com safe-zone adaptativa)');

  // 4. apple-touch-icon.png (180x180, fundo sólido sem transparência para iOS)
  const appleTouchPath = path.join(iconsDir, 'apple-touch-icon.png');
  await sharp(sourcePath)
    .resize(180, 180, { fit: 'cover' })
    .flatten({ background: { r: 19, g: 29, b: 54 } })
    .png({ quality: 95, compressionLevel: 9 })
    .toFile(appleTouchPath);
  console.log('✓ Gerado: public/icons/apple-touch-icon.png');

  // 5. favicon-32x32.png
  const favicon32Path = path.join(iconsDir, 'favicon-32x32.png');
  await sharp(sourcePath)
    .resize(32, 32, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(favicon32Path);
  console.log('✓ Gerado: public/icons/favicon-32x32.png');

  // 6. favicon.ico (contendo 16x16, 32x32 e 48x48)
  const b16 = await sharp(sourcePath).resize(16, 16, { fit: 'cover' }).png().toBuffer();
  const b32 = await sharp(sourcePath).resize(32, 32, { fit: 'cover' }).png().toBuffer();
  const b48 = await sharp(sourcePath).resize(48, 48, { fit: 'cover' }).png().toBuffer();

  const icoBuffer = packIco([
    { width: 16, height: 16, buffer: b16 },
    { width: 32, height: 32, buffer: b32 },
    { width: 48, height: 48, buffer: b48 },
  ]);

  const faviconIcoPath = path.join(iconsDir, 'favicon.ico');
  fs.writeFileSync(faviconIcoPath, icoBuffer);
  console.log('✓ Gerado: public/icons/favicon.ico');

  // Cópias de retrocompatibilidade na raiz de public/
  fs.copyFileSync(icon192Path, path.resolve('public/icon-192.png'));
  fs.copyFileSync(icon512Path, path.resolve('public/icon-512.png'));
  fs.copyFileSync(appleTouchPath, path.resolve('public/apple-touch-icon.png'));
  fs.copyFileSync(favicon32Path, path.resolve('public/favicon.png'));
  fs.copyFileSync(favicon32Path, path.resolve('public/favicon-32x32.png'));
  fs.copyFileSync(faviconIcoPath, path.resolve('public/favicon.ico'));
  console.log('✓ Sincronizadas cópias em public/ raiz');

  console.log('🎉 Todos os ícones gerados com sucesso!');
}

main().catch((err) => {
  console.error('❌ Falha ao gerar ícones:', err);
  process.exit(1);
});
