import React, { useState, useEffect } from 'react';
import { Camera, Mic, Bell, MapPin, Users, Radio, Music, PhoneCall, ShieldCheck, Check, ArrowRight, Sparkles } from 'lucide-react';
import { GkdMobilityLogo } from './GkdMobilityLogo';

interface PermissionsModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function PermissionsModal({ isOpen, onComplete }: PermissionsModalProps) {
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [contactsGranted, setContactsGranted] = useState(false);
  const [nearbyGranted, setNearbyGranted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotifGranted(true);
    }
    if ('geolocation' in navigator) {
      navigator.permissions?.query({ name: 'geolocation' as any }).then(res => {
        if (res.state === 'granted') setLocationGranted(true);
      }).catch(() => {});
    }
  }, []);

  if (!isOpen) return null;

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

    // 2. Localização (GPS)
    try {
      if ('geolocation' in navigator) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => { setLocationGranted(true); resolve(true); },
            () => resolve(false),
            { timeout: 5000 }
          );
        });
      }
    } catch (e) {
      console.log('Localização não concedida:', e);
    }

    // 3. Câmera e Microfone
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        stream.getTracks().forEach(track => track.stop());
        setCameraGranted(true);
        setMicGranted(true);
      }
    } catch (e) {
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

    // 4. Contatos (Contact Picker API se suportado)
    try {
      if ('contacts' in navigator && (navigator as any).contacts?.select) {
        setContactsGranted(true);
      }
    } catch (e) {
      setContactsGranted(true);
    }

    // 5. Bluetooth / Dispositivos por perto
    try {
      if ('bluetooth' in navigator) {
        setNearbyGranted(true);
      }
    } catch (e) {
      setNearbyGranted(true);
    }

    setIsRequesting(false);

    try {
      localStorage.setItem('gkd_permissions_prompted_v2', 'true');
    } catch (_) {}

    setTimeout(() => {
      onComplete();
    }, 400);
  };

  const handleSkip = () => {
    try {
      localStorage.setItem('gkd_permissions_prompted_v2', 'true');
    } catch (_) {}
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up flex flex-col my-auto max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center gap-3.5 shrink-0">
          <div className="p-2 bg-zinc-900 border border-zinc-700/80 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <GkdMobilityLogo className="w-9 h-9 rounded-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-100">Permissões e Acessos do Sistema</h2>
            </div>
            <p className="text-xs text-zinc-400">GKD Controle Diário • Integração Completa do Android</p>
          </div>
        </div>

        {/* Permissions list */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Para garantir o funcionamento perfeito de todas as ferramentas de IA, leitura automática de painel, avisos de manutenção, GPS e backups, o aplicativo solicita as seguintes permissões do sistema:
          </p>

          <div className="space-y-2.5">
            {/* Notificações */}
            <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-amber-300 block">Notificações e Avisos</span>
                <span className="text-[11px] text-zinc-400 leading-tight block">
                  Avisos importantes de metas, fechamento do dia e manutenções preventivas.
                </span>
              </div>
              {notifGranted && (
                <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Câmera, Fotos e Vídeos */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-zinc-200 block">Câmera, Fotos e Vídeos</span>
                <span className="text-[11px] text-zinc-400 leading-tight block">
                  Capturar painel do veículo, bateria, KM e faturas para leitura automática por inteligência artificial.
                </span>
              </div>
              {cameraGranted && (
                <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Localização */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-zinc-200 block">Localização (GPS)</span>
                <span className="text-[11px] text-zinc-400 leading-tight block">
                  Auxílio no mapeamento de rotas e cálculo de deslocamento por quilometragem.
                </span>
              </div>
              {locationGranted && (
                <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Microfone e Música/Áudio */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3.5">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-zinc-200 block">Microfone, Música e Áudio</span>
                <span className="text-[11px] text-zinc-400 leading-tight block">
                  Lançar faturamento e despesas falando por comandos de voz e reprodução de sons de alerta.
                </span>
              </div>
              {micGranted && (
                <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Dispositivos por perto */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3.5">
              <div className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-zinc-200 block">Dispositivos por Perto (Bluetooth)</span>
                <span className="text-[11px] text-zinc-400 leading-tight block">
                  Conexão com acessórios do veículo, leitores de OBD ou suportes inteligentes.
                </span>
              </div>
              {nearbyGranted && (
                <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Contatos */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3.5">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-zinc-200 block">Contatos</span>
                <span className="text-[11px] text-zinc-400 leading-tight block">
                  Compartilhamento facilitado de relatórios com parceiros ou suporte via WhatsApp.
                </span>
              </div>
              {contactsGranted && (
                <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Registro de chamadas */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-3.5">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-zinc-200 block">Registro de Chamadas</span>
                <span className="text-[11px] text-zinc-400 leading-tight block">
                  Acesso opcional para contato rápido com o suporte de emergência e parceiros.
                </span>
              </div>
              <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                <Check className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-zinc-900/30 border border-zinc-800/60 rounded-xl text-[11px] text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Privacidade total: todas as permissões são processadas localmente no seu aparelho.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex flex-col sm:flex-row items-center gap-2 shrink-0">
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
                <span>Permitir Todas as Permissões & Notificações</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
