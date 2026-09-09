import React, { useState, useEffect } from 'react';
import { Camera, Mic, Bell, ShieldCheck, Check, ArrowRight, Sparkles } from 'lucide-react';
import { GkdMobilityLogo } from './GkdMobilityLogo';

interface PermissionsModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function PermissionsModal({ isOpen, onComplete }: PermissionsModalProps) {
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check initial status if available
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotifGranted(true);
    }
  }, []);

  if (!isOpen) return null;

  // Request all permissions interactively
  const handleRequestPermissions = async () => {
    setIsRequesting(true);

    // 1. Notificações
    try {
      if ('Notification' in window && Notification.permission !== 'granted') {
        const res = await Notification.requestPermission();
        if (res === 'granted') setNotifGranted(true);
      } else if ('Notification' in window && Notification.permission === 'granted') {
        setNotifGranted(true);
      }
    } catch (e) {
      console.log('Erro ao solicitar notificação:', e);
    }

    // 2. Câmera e Microfone via MediaDevices
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Pede permissão de câmera e áudio juntos para acionar os prompts nativos do sistema
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        // Se deu certo, fecha as faixas imediatamente para não consumir bateria
        stream.getTracks().forEach(track => track.stop());
        setCameraGranted(true);
        setMicGranted(true);
      }
    } catch (e) {
      // Caso o usuário recuse áudio ou vídeo separadamente, tenta câmera individual
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const streamVideo = await navigator.mediaDevices.getUserMedia({ video: true });
          streamVideo.getTracks().forEach(track => track.stop());
          setCameraGranted(true);
        }
      } catch (errVideo) {
        console.log('Câmera não concedida:', errVideo);
      }

      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const streamAudio = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamAudio.getTracks().forEach(track => track.stop());
          setMicGranted(true);
        }
      } catch (errAudio) {
        console.log('Microfone não concedido:', errAudio);
      }
    }

    setIsRequesting(false);

    // Marca como solicitado no localStorage para não incomodar novamente
    try {
      localStorage.setItem('gkd_permissions_prompted_v1', 'true');
    } catch (_) {}

    // Finaliza e entra no aplicativo
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  const handleSkip = () => {
    try {
      localStorage.setItem('gkd_permissions_prompted_v1', 'true');
    } catch (_) {}
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up flex flex-col">
        
        {/* Top Header */}
        <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center gap-3.5">
          <div className="p-2 bg-zinc-900 border border-zinc-700/80 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <GkdMobilityLogo className="w-9 h-9 rounded-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-100">Bem-vindo ao Controle Diário</h2>
            </div>
            <p className="text-xs text-zinc-400">Configuração inicial de permissões do sistema</p>
          </div>
        </div>

        {/* Permissions list */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Para que o aplicativo funcione perfeitamente com todas as leituras inteligentes por IA, fotos do painel do carro e alertas de metas, precisamos das seguintes permissões:
          </p>

          <div className="space-y-2.5">
            {/* Câmera */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-zinc-200 block">Câmera e Fotos</span>
                <span className="text-[11px] text-zinc-400 leading-tight block">
                  Capturar painel do carro, bateria, KM e faturas para leitura automática por IA.
                </span>
              </div>
              {cameraGranted && (
                <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Microfone */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3.5">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-zinc-200 block">Microfone / Áudio</span>
                <span className="text-[11px] text-zinc-400 leading-tight block">
                  Lançar faturamento e despesas falando diretamente por comandos de voz.
                </span>
              </div>
              {micGranted && (
                <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Notificações */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-zinc-200 block">Notificações e Avisos</span>
                <span className="text-[11px] text-zinc-400 leading-tight block">
                  Lembrete de manutenção preventiva, metas atingidas e fechamento do dia.
                </span>
              </div>
              {notifGranted && (
                <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-zinc-900/30 border border-zinc-800/60 rounded-xl text-[11px] text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Seus dados ficam protegidos no seu aparelho e no seu banco seguro.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex flex-col sm:flex-row items-center gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="w-full sm:w-auto px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors font-medium cursor-pointer text-center order-2 sm:order-1"
          >
            Configurar depois
          </button>
          <button
            type="button"
            onClick={handleRequestPermissions}
            disabled={isRequesting}
            className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
          >
            {isRequesting ? (
              <span>Solicitando permissões...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Permitir e Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
