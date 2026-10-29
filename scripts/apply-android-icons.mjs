import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const iconSrc = path.resolve('public', 'icon.png');
  const statIconSrc = path.resolve('public', 'ic_stat_icon.png');
  const resDir = path.resolve('android', 'app', 'src', 'main', 'res');

  if (!fs.existsSync(iconSrc)) {
    console.error('Source icon not found:', iconSrc);
    return;
  }

  if (!fs.existsSync(resDir)) {
    console.log('Android res directory not found yet, skipping icon generation until android platform is added.');
    return;
  }

  const sizes = [
    { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 }
  ];

  let sharp;
  try {
    const sharpModule = await import('sharp');
    sharp = sharpModule.default;
  } catch (e) {
    console.log('Sharp not installed, will use fallback copying.');
  }

  for (const item of sizes) {
    const targetFolder = path.join(resDir, item.dir);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    if (sharp) {
      await sharp(iconSrc)
        .resize(item.size, item.size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toFile(path.join(targetFolder, 'ic_launcher.png'));

      await sharp(iconSrc)
        .resize(item.size, item.size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toFile(path.join(targetFolder, 'ic_launcher_round.png'));

      await sharp(iconSrc)
        .resize(item.fgSize, item.fgSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path.join(targetFolder, 'ic_launcher_foreground.png'));
    } else {
      fs.copyFileSync(iconSrc, path.join(targetFolder, 'ic_launcher.png'));
      fs.copyFileSync(iconSrc, path.join(targetFolder, 'ic_launcher_round.png'));
      fs.copyFileSync(iconSrc, path.join(targetFolder, 'ic_launcher_foreground.png'));
    }
  }

  // Generate notification small icons (transparent silhouette for Android status bar)
  // Supports ic_stat_icon, icon, and ic_notification names so any call resolves correctly
  const statSource = fs.existsSync(statIconSrc) ? statIconSrc : iconSrc;
  const statIconSizes = [
    { dir: 'drawable', size: 24 },
    { dir: 'drawable-mdpi', size: 24 },
    { dir: 'drawable-hdpi', size: 36 },
    { dir: 'drawable-xhdpi', size: 48 },
    { dir: 'drawable-xxhdpi', size: 72 },
    { dir: 'drawable-xxxhdpi', size: 96 }
  ];

  for (const item of statIconSizes) {
    const targetFolder = path.join(resDir, item.dir);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    if (sharp) {
      const buffer = await sharp(statSource)
        .resize(item.size, item.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      fs.writeFileSync(path.join(targetFolder, 'ic_stat_icon.png'), buffer);
      fs.writeFileSync(path.join(targetFolder, 'icon.png'), buffer);
      fs.writeFileSync(path.join(targetFolder, 'ic_notification.png'), buffer);
    } else {
      fs.copyFileSync(statSource, path.join(targetFolder, 'ic_stat_icon.png'));
      fs.copyFileSync(statSource, path.join(targetFolder, 'icon.png'));
      fs.copyFileSync(statSource, path.join(targetFolder, 'ic_notification.png'));
    }
  }

  // Splash screen
  const drawableDirs = ['drawable', 'drawable-land-hdpi', 'drawable-land-mdpi', 'drawable-land-xhdpi', 'drawable-land-xxhdpi', 'drawable-land-xxxhdpi', 'drawable-port-hdpi', 'drawable-port-mdpi', 'drawable-port-xhdpi', 'drawable-port-xxhdpi', 'drawable-port-xxxhdpi'];
  for (const d of drawableDirs) {
    const dPath = path.join(resDir, d);
    if (fs.existsSync(dPath)) {
      fs.copyFileSync(iconSrc, path.join(dPath, 'splash.png'));
    }
  }

  console.log('✅ Android icons & notification small icons successfully injected with official Controle Diário logo!');
}

generateIcons().catch(console.error);
