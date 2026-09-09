import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Camera, 
  Upload, 
  FileText, 
  Clipboard, 
  Loader2, 
  Sparkles, 
  Check, 
  X, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Trash2, 
  FileSpreadsheet, 
  Car, 
  Zap, 
  DollarSign, 
  Layers, 
  Smartphone,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  processInputFile, 
  captureNativeCameraPhoto, 
  ProcessedFile, 
  speakFeedback, 
  detectCellConflicts 
} from '../lib/multimodalHelper';
import { ConflictData } from './ConflictResolverModal';

interface MultimodalAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: any[];
  selectedDate: string;
  selectedMonth: number;
  selectedYear: number;
  carProfile: any;
  initialMode?: 'voice' | 'camera' | 'files' | 'paste';
  onApplyData: (data: any, targetDate: string, fixedExpenses?: any[]) => void;
  onConflictDetected: (conflictData: ConflictData) => void;
}

export const MultimodalAiModal: React.FC<MultimodalAiModalProps> = ({
  isOpen,
  onClose,
  logs,
  selectedDate,
  selectedMonth,
  selectedYear,
  carProfile,
  initialMode = 'voice',
  onApplyData,
  onConflictDetected,
}) => {
  // Tabs: 'voice' | 'camera_files' | 'paste'
  const [activeTab, setActiveTab] = useState<'voice' | 'camera_files' | 'paste'>(
    initialMode === 'camera' || initialMode === 'files' ? 'camera_files' : initialMode === 'paste' ? 'paste' : 'voice'
  );

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [voiceAudioBlob, setVoiceAudioBlob] = useState<Blob | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Files & Camera State
  const [filesQueue, setFilesQueue] = useState<ProcessedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paste Text State
  const [pastedText, setPastedText] = useState('');

  // Processing & Extraction State
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionResult, setExtractionResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [targetDateInput, setTargetDateInput] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);
  const [enableTts, setEnableTts] = useState(true);

  // Auto-launch selected mode on opening
  useEffect(() => {
    if (!isOpen) return;

    if (initialMode === 'camera') {
      setActiveTab('camera_files');
      const timer = setTimeout(() => {
        handleTriggerNativeCamera();
      }, 150);
      return () => clearTimeout(timer);
    } else if (initialMode === 'files') {
      setActiveTab('camera_files');
      const timer = setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }, 150);
      return () => clearTimeout(timer);
    } else if (initialMode === 'paste') {
      setActiveTab('paste');
    } else if (initialMode === 'voice') {
      setActiveTab('voice');
      const timer = setTimeout(() => {
        if (!isListening && !isRecordingAudio) {
          handleToggleVoice();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialMode]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript + ' ';
          }
          setSpeechText(current.trim());
        };

        recognition.onerror = (err: any) => {
          console.warn('SpeechRecognition error:', err?.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  // Toggle Voice Listening & Recording
  const handleToggleVoice = async () => {
    if (isListening || isRecordingAudio) {
      // Stop
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
      setIsRecordingAudio(false);
    } else {
      // Start
      setErrorMessage(null);
      let startedSpeech = false;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          startedSpeech = true;
        } catch (err) {
          console.warn('Could not start Web Speech Recognition, falling back to MediaRecorder:', err);
        }
      }

      // Also record audio stream as high-precision fallback or for direct audio processing
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setVoiceAudioBlob(audioBlob);
            stream.getTracks().forEach(track => track.stop());
          };

          mediaRecorder.start();
          mediaRecorderRef.current = mediaRecorder;
          setIsRecordingAudio(true);
        } catch (err) {
          if (!startedSpeech) {
            setErrorMessage('Permissão de microfone negada ou não disponível neste dispositivo.');
          }
        }
      }
    }
  };

  // Trigger Native Mobile Camera
  const handleTriggerNativeCamera = async () => {
    setErrorMessage(null);
    // 1. Try Capacitor Native Camera
    const photo = await captureNativeCameraPhoto();
    if (photo) {
      const newQueue = [...filesQueue, photo];
      setFilesQueue(newQueue);
      setActiveTab('camera_files');
      handleProcessWithAi(newQueue, 'camera_files');
      return;
    }

    // 2. Browser native camera input capture="environment"
    if (nativeCameraInputRef.current) {
      nativeCameraInputRef.current.click();
    }
  };

  // Handle Multi-file Selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const filesArray = Array.from(e.target.files) as File[];
      const processedList: ProcessedFile[] = [];

      for (const file of filesArray) {
        const processed = await processInputFile(file);
        processedList.push(processed);
      }

      const updatedQueue = [...filesQueue, ...processedList];
      setFilesQueue(updatedQueue);
      setActiveTab('camera_files');
      
      // Immediately run AI extraction on the chosen file(s)
      handleProcessWithAi(updatedQueue, 'camera_files');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao processar arquivos selecionados.');
      setIsProcessing(false);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Drag and Drop Handlers
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      const processedList: ProcessedFile[] = [];

      for (const file of filesArray) {
        const processed = await processInputFile(file);
        processedList.push(processed);
      }

      const updatedQueue = [...filesQueue, ...processedList];
      setFilesQueue(updatedQueue);
      setActiveTab('camera_files');
      handleProcessWithAi(updatedQueue, 'camera_files');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao ler arquivos soltos.');
      setIsProcessing(false);
    }
  };

  // Remove File from Queue
  const handleRemoveFile = (id: string) => {
    setFilesQueue(prev => prev.filter(f => f.id !== id));
  };

  // Execute AI Extraction
  const handleProcessWithAi = async (
    overrideFiles?: ProcessedFile[],
    overrideTab?: 'voice' | 'camera_files' | 'paste'
  ) => {
    const currentTab = overrideTab || activeTab;
    const currentFiles = overrideFiles || filesQueue;

    setErrorMessage(null);
    setIsProcessing(true);
    setExtractionResult(null);

    // Stop voice if still listening
    if (isListening || isRecordingAudio) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch (_) {}
      }
      setIsListening(false);
      setIsRecordingAudio(false);
    }

    try {
      let resultData: any = null;

      // Mode 1: Voice Command
      if (currentTab === 'voice') {
        if (!speechText.trim() && !voiceAudioBlob) {
          throw new Error('Por favor, fale um comando de voz antes de processar.');
        }

        let audioBase64: string | undefined;
        if (voiceAudioBlob) {
          const reader = new FileReader();
          audioBase64 = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(voiceAudioBlob);
          });
        }

        const res = await fetch('/api/parse-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: speechText.trim(),
            audioBase64,
            mimeType: voiceAudioBlob?.type || 'audio/webm',
            activeContext: {
              selectedMonth,
              selectedYear,
              defaultDate: targetDateInput,
            },
            carProfile,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Falha ao processar comando de voz com IA.');
        }

        resultData = await res.json();
      }

      // Mode 2: Photos, Documents & Multi-Files
      else if (currentTab === 'camera_files') {
        if (currentFiles.length === 0) {
          throw new Error('Nenhum arquivo ou foto foi adicionado.');
        }

        // Bundle images, PDFs, audios
        const payloadFiles: any[] = [];
        let combinedSpreadsheetOrText = '';

        for (const file of currentFiles) {
          if (file.type === 'spreadsheet' || file.type === 'text') {
            combinedSpreadsheetOrText += `\n--- ARQUIVO: ${file.name} ---\n${file.textContent}\n`;
          } else if (file.base64Data) {
            payloadFiles.push({
              imageBase64: file.base64Data,
              mimeType: file.mimeType,
            });
          }
        }

        const res = await fetch('/api/extract-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: payloadFiles,
            textData: combinedSpreadsheetOrText,
            activeContext: {
              selectedMonth,
              selectedYear,
              defaultDate: targetDateInput,
            },
            carProfile,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Falha ao analisar arquivos com IA.');
        }

        const json = await res.json();
        // Check if results array exists
        if (json.results && json.results.length > 0) {
          resultData = json.results[0];
          // Merge multi-receipts if more than one
          if (json.results.length > 1) {
            resultData = mergeMultiResults(json.results);
          }
          
          // Preserve fixedExpenses if present in the top-level response
          if (json.fixedExpenses && json.fixedExpenses.length > 0) {
            resultData.fixedExpenses = json.fixedExpenses;
          }
        } else {
          resultData = json;
        }
      }

      // Mode 3: Paste Text
      else if (currentTab === 'paste') {
        if (!pastedText.trim()) {
          throw new Error('Cole algum texto ou dados antes de processar.');
        }

        const res = await fetch('/api/extract-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textData: pastedText.trim(),
            activeContext: {
              selectedMonth,
              selectedYear,
              defaultDate: targetDateInput,
            },
            carProfile,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Falha ao processar texto com IA.');
        }

        const json = await res.json();
        resultData = (json.results && json.results.length > 0) ? json.results[0] : json;
        
        // Preserve fixedExpenses if present in the top-level response
        if (json.fixedExpenses && json.fixedExpenses.length > 0) {
          if (!resultData.results) { // If it's the item itself
            resultData.fixedExpenses = json.fixedExpenses;
          }
        }
      }

      if (!resultData) {
        throw new Error('Nenhum dado financeiro ou operacional foi identificado.');
      }

      // Set date if detected
      if (resultData.detectedDate) {
        setTargetDateInput(resultData.detectedDate);
      }

      // Normalize Trip KM into kmRodado if needed
      if ((!resultData.kmRodado || resultData.kmRodado === 0) && resultData.tripKm) {
        resultData.kmRodado = resultData.tripKm;
      }

      // Normalize 99 fares/tips into total earnings if 99 earnings is zero
      if ((!resultData.app99_earnings || resultData.app99_earnings === 0) && (resultData.app99_fares || resultData.app99_bonus || resultData.app99_tips)) {
        resultData.app99_earnings = Number(((resultData.app99_fares || 0) + (resultData.app99_bonus || 0) + (resultData.app99_tips || 0)).toFixed(2));
      }

      setExtractionResult(resultData);

      // Voice Feedback (SpeechSynthesis)
      if (enableTts) {
        const spokenMsg = resultData.speechSummary || generateSpokenSummary(resultData);
        speakFeedback(spokenMsg);
      }

    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro inesperado durante o processamento da IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to merge multi-file results if multiple images/docs processed together
  const mergeMultiResults = (items: any[]) => {
    const merged: any = { ...items[0] };
    for (let i = 1; i < items.length; i++) {
      const it = items[i];
      // Sum earnings and rides
      if (it.app99_rides) merged.app99_rides = (merged.app99_rides || 0) + it.app99_rides;
      if (it.app99_earnings) merged.app99_earnings = Number(((merged.app99_earnings || 0) + it.app99_earnings).toFixed(2));
      if (it.app99_bonus) merged.app99_bonus = Number(((merged.app99_bonus || 0) + it.app99_bonus).toFixed(2));
      if (it.app99_tips) merged.app99_tips = Number(((merged.app99_tips || 0) + it.app99_tips).toFixed(2));

      if (it.appUber_rides) merged.appUber_rides = (merged.appUber_rides || 0) + it.appUber_rides;
      if (it.appUber_earnings) merged.appUber_earnings = Number(((merged.appUber_earnings || 0) + it.appUber_earnings).toFixed(2));
      if (it.appUber_bonus) merged.appUber_bonus = Number(((merged.appUber_bonus || 0) + it.appUber_bonus).toFixed(2));

      if (it.appParticular_rides) merged.appParticular_rides = (merged.appParticular_rides || 0) + it.appParticular_rides;
      if (it.appParticular_earnings) merged.appParticular_earnings = Number(((merged.appParticular_earnings || 0) + it.appParticular_earnings).toFixed(2));

      if (it.kmRodado && (!merged.kmRodado || it.kmRodado > merged.kmRodado)) merged.kmRodado = it.kmRodado;
      if (it.tripKm && (!merged.tripKm || it.tripKm > merged.tripKm)) merged.tripKm = it.tripKm;
      if (it.odometro && (!merged.odometro || it.odometro > merged.odometro)) merged.odometro = it.odometro;
      if (it.sobrouBateria !== undefined && it.sobrouBateria !== null) merged.sobrouBateria = it.sobrouBateria;
    }
    return merged;
  };

  // Generate spoken feedback message
  const generateSpokenSummary = (data: any) => {
    const parts: string[] = [];
    const totalRides = (data.app99_rides || 0) + (data.appUber_rides || 0) + (data.appParticular_rides || 0);
    const totalMoney = (data.app99_earnings || 0) + (data.appUber_earnings || 0) + (data.appParticular_earnings || 0);

    if (totalRides > 0) parts.push(`${totalRides} corridas`);
    if (totalMoney > 0) parts.push(`R$ ${totalMoney.toFixed(2)} de faturamento`);
    if (data.kmRodado || data.tripKm) parts.push(`${data.kmRodado || data.tripKm} quilômetros`);
    if (data.sobrouBateria !== undefined && data.sobrouBateria !== null) parts.push(`${data.sobrouBateria}% de bateria restante`);
    if (data.fixedExpenses && data.fixedExpenses.length > 0) parts.push(`${data.fixedExpenses.length} despesas fixas`);

    if (parts.length === 0) return 'Dados identificados com sucesso.';
    return `Identificado: ${parts.join(', ')}.`;
  };

  // Confirm and Apply Data with Duplicate Cell Conflict Check
  const handleApplyExtracted = () => {
    if (!extractionResult) return;

    const targetDate = targetDateInput || selectedDate;
    const existingLog = logs.find(l => l.date === targetDate);

    // Run Duplicate Cell Conflict Detector
    const conflicts = detectCellConflicts(existingLog, extractionResult);

    if (conflicts.length > 0) {
      // Conflict detected! Inform the user and open conflict resolution
      const formattedDate = targetDate.split('-').reverse().join('/');
      onConflictDetected({
        targetDate,
        formattedDate,
        conflicts,
        rawExtractedData: extractionResult,
      });
      onClose();
      return;
    }

    // No conflicts, apply directly
    onApplyData(extractionResult, targetDate, extractionResult.fixedExpenses);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b0e14] border border-emerald-500/40 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        
        {/* Hidden inputs for camera and files */}
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*, application/pdf, text/*, .csv, .xlsx, .xls, audio/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/50 via-zinc-900 to-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl shadow-lg shadow-emerald-500/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100">
                  Comando de Voz & IA Multimodal
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  GKD IA 3.8
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Fale por voz, tire fotos com a câmera nativa ou envie múltiplos comprovantes e planilhas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEnableTts(!enableTts)}
              title={enableTts ? 'Voz de confirmação ativada' : 'Voz de confirmação desativada'}
              className={`p-2 rounded-xl border transition-colors ${
                enableTts ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}
            >
              {enableTts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 p-2 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 p-1.5 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'voice'
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Comando de Voz</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('camera_files')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'camera_files'
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Fotos & Documentos</span>
            {filesQueue.length > 0 && (
              <span className="ml-1 bg-zinc-950 text-emerald-400 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {filesQueue.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'paste'
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            <span>Copiar & Colar</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Target Date Picker */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-400 font-medium">Data do Lançamento:</span>
            <input
              type="date"
              value={targetDateInput}
              onChange={e => setTargetDateInput(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 text-zinc-100 font-bold px-3 py-1.5 rounded-lg text-xs focus:border-emerald-500 outline-none"
            />
          </div>

          {/* TAB 1: COMANDO DE VOZ */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-4">
                
                {/* Visualizer Pulsing Mic */}
                <div className="relative">
                  {isListening && (
                    <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
                  )}
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                      isListening || isRecordingAudio
                        ? 'bg-red-500 text-white shadow-red-500/30 scale-105'
                        : 'bg-gradient-to-tr from-emerald-600 to-emerald-400 text-zinc-950 shadow-emerald-500/30 hover:scale-105'
                    }`}
                  >
                    {isListening || isRecordingAudio ? (
                      <MicOff className="w-8 h-8 animate-pulse" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-zinc-100">
                    {isListening || isRecordingAudio ? 'Ouvindo... Fale agora!' : 'Toque no microfone para falar'}
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-sm mt-1">
                    Ex: "Fiz 12 corridas na 99 dando 240 reais, sendo 20 de recompensa. Na Uber fiz 6 corridas dando 120 reais. Rodei 180 km, sobrou 40% de bateria e gastei 30 de almoço."
                  </p>
                </div>

                {/* Live Speech Text */}
                <div className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 text-left min-h-[64px] max-h-[120px] overflow-y-auto">
                  <span className="text-[10px] text-zinc-500 font-bold block mb-1">
                    {isListening ? 'TRANSCREVENDO EM TEMPO REAL:' : 'SUA FALA / TRANSCRIÇÃO:'}
                  </span>
                  <p className="text-xs text-zinc-200 italic">
                    {speechText || (
                      <span className="text-zinc-600 not-italic">
                        Nenhuma fala detectada ainda. Clique no microfone e comece a falar.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FOTOS & DOCUMENTOS (MÚLTIPLOS) & CÂMERA NATIVA */}
          {activeTab === 'camera_files' && (
            <div className="space-y-4">
              
              {/* Top Action Buttons: Native Camera & Multi-File Upload */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleTriggerNativeCamera}
                  className="p-3 bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-700 hover:border-emerald-500/50 rounded-xl flex items-center justify-center gap-2.5 text-xs font-bold text-zinc-200 transition-all shadow-md group"
                >
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg group-hover:bg-emerald-500 group-hover:text-zinc-950 transition-colors">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span>Câmera Nativa do Celular</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-700 hover:border-emerald-500/50 rounded-xl flex items-center justify-center gap-2.5 text-xs font-bold text-zinc-200 transition-all shadow-md group"
                >
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg group-hover:bg-indigo-500 group-hover:text-zinc-950 transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span>Upload de Múltiplos Arquivos</span>
                </button>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50'
                }`}
              >
                <div className="p-3 bg-zinc-900 rounded-full text-zinc-400">
                  <Layers className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-zinc-200">Arraste e solte fotos ou documentos aqui</span>
                  <span className="text-zinc-500 block text-[11px] mt-0.5">
                    Aceita fotos (PNG, JPG, HEIC), PDFs, planilhas (.xlsx, .csv), áudio e relatórios
                  </span>
                </div>
              </div>

              {/* Queue of Selected Files */}
              {filesQueue.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-bold px-1">
                    <span>Arquivos Selecionados ({filesQueue.length})</span>
                    <button
                      type="button"
                      onClick={() => setFilesQueue([])}
                      className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3 h-3" />
                      Limpar todos
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
                    {filesQueue.map(f => (
                      <div
                        key={f.id}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {f.previewUrl ? (
                            <img
                              src={f.previewUrl}
                              alt={f.name}
                              className="w-9 h-9 rounded-lg object-cover border border-zinc-700 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                              {f.type === 'spreadsheet' ? (
                                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <FileText className="w-4 h-4 text-indigo-400" />
                              )}
                            </div>
                          )}
                          <div className="truncate">
                            <p className="text-zinc-200 font-bold truncate text-[11px]">{f.name}</p>
                            <span className="text-[10px] text-zinc-500">
                              {(f.size / 1024).toFixed(0)} KB • {f.type}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(f.id)}
                          className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: COPIAR & COLAR */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <span className="text-xs text-zinc-400 font-medium block">
                Cole o resumo de corridas do WhatsApp, extrato da Uber/99 ou dados tabulares:
              </span>
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Exemplo: Uber: 8 corridas, R$ 180,50. 99: 14 corridas, R$ 260,00 com R$ 15 de gorjeta. Rodei 200 km. Bateria restante: 35%..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 outline-none min-h-[120px] max-h-[220px]"
              />
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* AI Extraction Preview Card */}
          {extractionResult && (
            <div className="bg-zinc-950/90 border border-emerald-500/40 rounded-2xl p-4 space-y-3 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h4 className="text-xs font-bold text-zinc-100">
                    Dados Identificados pela Inteligência Artificial
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-emerald-400">
                  Data: {targetDateInput.split('-').reverse().join('/')}
                </span>
              </div>

              {/* Categorized Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                
                {/* 99 */}
                <div className="bg-zinc-900/90 border border-amber-500/30 rounded-xl p-2.5 space-y-1">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Aplicativo 99
                  </span>
                  <div className="text-zinc-300 space-y-0.5 text-[11px]">
                    <p>Corridas: <strong className="text-zinc-100">{extractionResult.app99_rides || 0}</strong></p>
                    <p>Ganhos: <strong className="text-amber-300">R$ {(extractionResult.app99_earnings || 0).toFixed(2)}</strong></p>
                    {(extractionResult.app99_bonus > 0 || extractionResult.app99_tips > 0) && (
                      <p className="text-[10px] text-zinc-400">
                        Recompensa: R$ {(extractionResult.app99_bonus || 0).toFixed(2)} • Gorjeta: R$ {(extractionResult.app99_tips || 0).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Uber */}
                <div className="bg-zinc-900/90 border border-zinc-700 rounded-xl p-2.5 space-y-1">
                  <span className="text-[11px] font-bold text-zinc-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-200" />
                    Aplicativo Uber
                  </span>
                  <div className="text-zinc-300 space-y-0.5 text-[11px]">
                    <p>Corridas: <strong className="text-zinc-100">{extractionResult.appUber_rides || 0}</strong></p>
                    <p>Ganhos: <strong className="text-zinc-100">R$ {(extractionResult.appUber_earnings || 0).toFixed(2)}</strong></p>
                    {extractionResult.appUber_bonus > 0 && (
                      <p className="text-[10px] text-zinc-400">
                        Bônus: R$ {(extractionResult.appUber_bonus || 0).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Veículo & Rodagem */}
                <div className="bg-zinc-900/90 border border-emerald-500/30 rounded-xl p-2.5 space-y-1">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5" />
                    Veículo & Bateria
                  </span>
                  <div className="text-zinc-300 space-y-0.5 text-[11px]">
                    <p>KM Rodado: <strong className="text-zinc-100">{extractionResult.kmRodado || extractionResult.tripKm || 0} km</strong></p>
                    {extractionResult.odometro > 0 && (
                      <p>Odômetro (ODO): <strong className="text-zinc-100">{extractionResult.odometro.toLocaleString('pt-BR')} km</strong></p>
                    )}
                    {extractionResult.sobrouBateria !== undefined && extractionResult.sobrouBateria !== null && (
                      <p>Bateria Restante: <strong className="text-emerald-300">{extractionResult.sobrouBateria}%</strong></p>
                    )}
                    {extractionResult.custoEnergia > 0 && (
                      <p>Recarga/Combustível: <strong>R$ {extractionResult.custoEnergia.toFixed(2)}</strong></p>
                    )}
                  </div>
                </div>

                {/* Fixed Expenses Extra Card if found */}
                {extractionResult.fixedExpenses && extractionResult.fixedExpenses.length > 0 && (
                  <div className="bg-zinc-900/90 border border-blue-500/30 rounded-xl p-2.5 space-y-1 sm:col-span-3">
                    <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                      <div className="p-1 bg-blue-500/20 rounded">
                        <FileText className="w-3 h-3" />
                      </div>
                      Despesas Fixas Identificadas ({extractionResult.fixedExpenses.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-zinc-400 mt-1">
                      {extractionResult.fixedExpenses.map((fe: any, idx: number) => (
                        <div key={idx} className="flex justify-between border-b border-zinc-800 pb-0.5">
                          <span className="truncate mr-1">{fe.description || fe.name}</span>
                          <span className="text-zinc-100 font-bold whitespace-nowrap">R$ {Number(fe.value).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Document Summary / Relatório de Treinamento */}
              {extractionResult.documentSummary && (
                <div className="bg-zinc-900/80 border border-zinc-800/80 p-3 rounded-xl text-xs text-zinc-300 font-sans whitespace-pre-line leading-relaxed">
                  {extractionResult.documentSummary}
                </div>
              )}

              {/* Spoken Summary */}
              {extractionResult.speechSummary && (
                <div className="bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{extractionResult.speechSummary}</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-zinc-950/90 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold rounded-xl text-xs transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {!extractionResult ? (
              <button
                type="button"
                onClick={handleProcessWithAi}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Processar com IA</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyExtracted}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar e Salvar Lançamentos</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
