import fs from 'fs';
import path from 'path';

function injectMobileVersion() {
  const targetVersionCode = parseInt(process.env.VERSION_CODE || '2', 10);
  const targetVersionName = process.env.VERSION_NAME || `1.0.${targetVersionCode}`;

  console.log(`[Mobile Build] Injetando versionCode: ${targetVersionCode}, versionName: "${targetVersionName}"`);

  // 1. Atualizar capacitor.config.json
  const capConfigPath = path.resolve('capacitor.config.json');
  if (fs.existsSync(capConfigPath)) {
    try {
      const capConfig = JSON.parse(fs.readFileSync(capConfigPath, 'utf8'));
      capConfig.versionCode = targetVersionCode;
      capConfig.android = capConfig.android || {};
      capConfig.android.versionCode = targetVersionCode;
      capConfig.android.versionName = targetVersionName;
      fs.writeFileSync(capConfigPath, JSON.stringify(capConfig, null, 2), 'utf8');
      console.log('✅ capacitor.config.json atualizado com versionCode:', targetVersionCode);
    } catch (e) {
      console.error('Erro ao atualizar capacitor.config.json:', e);
    }
  }

  // 2. Se android/app/build.gradle já existir, atualiza diretamente
  const gradlePath = path.resolve('android', 'app', 'build.gradle');
  if (fs.existsSync(gradlePath)) {
    try {
      let gradle = fs.readFileSync(gradlePath, 'utf8');
      gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${targetVersionCode}`);
      gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${targetVersionName}"`);
      fs.writeFileSync(gradlePath, gradle, 'utf8');
      console.log('✅ android/app/build.gradle atualizado com versionCode:', targetVersionCode);
    } catch (e) {
      console.error('Erro ao atualizar build.gradle:', e);
    }
  }

  console.log('🚀 Configuração do pacote móvel sincronizada com sucesso!');
}

injectMobileVersion();
