import * as XLSX from 'xlsx';
import heic2any from 'heic2any';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CellConflict } from '../components/ConflictResolverModal';

export interface ProcessedFile {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'spreadsheet' | 'audio' | 'text';
  mimeType: string;
  size: number;
  previewUrl?: string;
  base64Data?: string;
  textContent?: string;
}

/**
 * Converts any File object (image, PDF, spreadsheet, audio, text)
 * into a structured ProcessedFile ready for Gemini AI extraction.
 */
export async function processInputFile(file: File): Promise<ProcessedFile> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 1. Spreadsheet (.xlsx, .xls, .csv)
  if (
    fileExt === 'xlsx' ||
    fileExt === 'xls' ||
    fileExt === 'csv' ||
    file.type.includes('spreadsheet') ||
    file.type.includes('excel') ||
    file.type.includes('csv')
  ) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      let combinedText = `[CONTEÚDO DA PLANILHA: ${file.name}]\n`;

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        combinedText += `\n--- ABA: ${sheetName} ---\n${csvData}\n`;
      });

      return {
        id: fileId,
        name: file.name,
        type: 'spreadsheet',
        mimeType: 'text/plain',
        size: file.size,
        textContent: combinedText,
      };
    } catch (err) {
      console.warn('Erro ao ler planilha com XLSX:', err);
      const text = await file.text();
      return {
        id: fileId,
        name: file.name,
        type: 'spreadsheet',
        mimeType: 'text/plain',
        size: file.size,
        textContent: text,
      };
    }
  }

  // 2. Audio (.mp3, .wav, .m4a, .ogg, .webm)
  if (file.type.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'aac'].includes(fileExt)) {
    const base64 = await fileToBase64(file);
    return {
      id: fileId,
      name: file.name,
      type: 'audio',
      mimeType: file.type || 'audio/webm',
      size: file.size,
      base64Data: base64,
    };
  }

  // 3. PDF Document
  if (file.type === 'application/pdf' || fileExt === 'pdf') {
    const base64 = await fileToBase64(file);
    return {
      id: fileId,
      name: file.name,
      type: 'pdf',
      mimeType: 'application/pdf',
      size: file.size,
      base64Data: base64,
    };
  }

  // 4. Plain Text (.txt)
  if (file.type.startsWith('text/') || fileExt === 'txt') {
    const text = await file.text();
    return {
      id: fileId,
      name: file.name,
      type: 'text',
      mimeType: 'text/plain',
      size: file.size,
      textContent: text,
    };
  }

  // 5. Image (HEIC / PNG / JPG / WEBP, etc.)
  let processedBlob: Blob = file;
  let targetMime = file.type || 'image/jpeg';

  if (fileExt === 'heic' || fileExt === 'heif' || file.type.includes('heic')) {
    try {
      const conversionResult = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.85,
      });
      processedBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
      targetMime = 'image/jpeg';
    } catch (e) {
      console.warn('Erro na conversão HEIC:', e);
    }
  }

  const base64 = await blobToBase64(processedBlob);
  const previewUrl = URL.createObjectURL(processedBlob);

  return {
    id: fileId,
    name: file.name,
    type: 'image',
    mimeType: targetMime,
    size: processedBlob.size,
    previewUrl,
    base64Data: base64,
  };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Launches native mobile camera via Capacitor if on native device,
 * or returns null to let the browser file input capture='environment' handle it.
 */
export async function captureNativeCameraPhoto(): Promise<ProcessedFile | null> {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    });

    if (image.base64String) {
      const mimeType = image.format ? `image/${image.format}` : 'image/jpeg';
      const base64Data = `data:${mimeType};base64,${image.base64String}`;
      return {
        id: `${Date.now()}_cam`,
        name: `Foto_Camera_${new Date().toLocaleTimeString('pt-BR').replace(/:/g, '-')}.${image.format || 'jpg'}`,
        type: 'image',
        mimeType,
        size: Math.round((image.base64String.length * 3) / 4),
        previewUrl: base64Data,
        base64Data,
      };
    }
  } catch (err: any) {
    // If user cancelled or running in plain browser, fallback to standard input
    console.log('Capacitor camera bypassed or cancelled:', err?.message);
  }
  return null;
}

/**
 * Text-to-Speech (TTS) synthesizer to speak feedback in Portuguese.
 */
export function speakFeedback(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick pt-BR voice if available
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt'));
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Erro ao falar síntese de voz:', err);
  }
}

/**
 * Duplicate Cell / Conflict Detector:
 * Compares incoming AI extracted fields against an existing daily log.
 * Returns a list of conflicts if the target cell already has a non-empty/non-zero value!
 */
export function detectCellConflicts(
  existingLog: any | undefined,
  extracted: any
): CellConflict[] {
  if (!existingLog) return [];

  const conflicts: CellConflict[] = [];

  const checkNumericField = (
    key: string,
    label: string,
    category: CellConflict['category'],
    existingVal: number | undefined,
    newVal: number | undefined,
    prefix = 'R$ '
  ) => {
    if (
      newVal !== undefined &&
      newVal !== null &&
      Number(newVal) > 0 &&
      existingVal !== undefined &&
      existingVal !== null &&
      Number(existingVal) > 0 &&
      Math.abs(Number(existingVal) - Number(newVal)) > 0.001
    ) {
      conflicts.push({
        fieldKey: key,
        fieldLabel: label,
        category,
        currentValue: Number(existingVal),
        newValue: Number(newVal),
        formattedCurrent: prefix === 'R$ ' ? `R$ ${Number(existingVal).toFixed(2)}` : `${existingVal} ${prefix}`,
        formattedNew: prefix === 'R$ ' ? `R$ ${Number(newVal).toFixed(2)}` : `${newVal} ${prefix}`,
        selectedAction: 'replace',
      });
    }
  };

  // 99
  checkNumericField('app99_rides', 'Corridas 99', '99', existingLog.app99?.rides, extracted.app99_rides, 'viagens');
  checkNumericField('app99_earnings', 'Ganhos 99', '99', existingLog.app99?.earnings, extracted.app99_earnings);
  checkNumericField('app99_bonus', 'Recompensas / Bônus 99', '99', existingLog.app99?.bonus, extracted.app99_bonus);

  // Uber
  checkNumericField('appUber_rides', 'Corridas Uber', 'uber', existingLog.appUber?.rides, extracted.appUber_rides, 'viagens');
  checkNumericField('appUber_earnings', 'Ganhos Uber', 'uber', existingLog.appUber?.earnings, extracted.appUber_earnings);
  checkNumericField('appUber_bonus', 'Bônus Uber', 'uber', existingLog.appUber?.bonus, extracted.appUber_bonus);

  // Particular
  checkNumericField('appParticular_rides', 'Corridas Particular', 'geral', existingLog.appParticular?.rides, extracted.appParticular_rides, 'viagens');
  checkNumericField('appParticular_earnings', 'Ganhos Particular', 'geral', existingLog.appParticular?.earnings, extracted.appParticular_earnings);

  // Veículo & KM
  checkNumericField('kmRodado', 'Quilômetros Rodados (Trip A)', 'veiculo', existingLog.kmRodado, extracted.kmRodado || extracted.tripKm, 'km');
  checkNumericField('sobrouBateria', 'Bateria Restante', 'veiculo', existingLog.sobrouBateria, extracted.sobrouBateria, '%');
  checkNumericField('custoEnergia', 'Custo com Energia / Recarga', 'veiculo', existingLog.custoEnergia, extracted.custoEnergia);
  checkNumericField('diariaCarro', 'Diária do Carro', 'veiculo', existingLog.diariaCarro, extracted.diariaCarro);

  // Despesas Carro
  checkNumericField('carExpenses_wash', 'Lavagem do Carro', 'despesas', existingLog.carExpenses?.wash, extracted.carExpenses_wash);
  checkNumericField('carExpenses_toll', 'Pedágios', 'despesas', existingLog.carExpenses?.toll, extracted.carExpenses_toll);
  checkNumericField('carExpenses_maintenance', 'Manutenção', 'despesas', existingLog.carExpenses?.maintenance, extracted.carExpenses_maintenance);
  checkNumericField('carExpenses_parking', 'Estacionamento', 'despesas', existingLog.carExpenses?.parking, extracted.carExpenses_parking);

  // Despesas Alimentação
  checkNumericField('foodExpenses_lunch', 'Almoço / Refeição', 'alimentacao', existingLog.foodExpenses?.lunch, extracted.foodExpenses_lunch);
  checkNumericField('foodExpenses_dinner', 'Jantar', 'alimentacao', existingLog.foodExpenses?.dinner, extracted.foodExpenses_dinner);
  checkNumericField('foodExpenses_snacks', 'Lanches / Padaria', 'alimentacao', existingLog.foodExpenses?.snacks, extracted.foodExpenses_snacks);
  checkNumericField('foodExpenses_coffee', 'Café / Bebidas', 'alimentacao', existingLog.foodExpenses?.coffee, extracted.foodExpenses_coffee);

  return conflicts;
}
