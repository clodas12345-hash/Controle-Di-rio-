import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Serviço de Notificações para Web, PWA e Android (Capacitor)
 */

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // 1. Android Nativo via Capacitor
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await LocalNotifications.requestPermissions();
        if (status.display === 'granted') {
          return true;
        }
      } catch (capErr) {
        console.warn('Erro ao solicitar LocalNotifications no Capacitor:', capErr);
      }
    }

    // 2. Web e PWA
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    }
  } catch (error) {
    console.warn('Erro ao solicitar permissão de notificação:', error);
  }
  return false;
}

export async function sendAppNotification(title: string, options?: { body?: string; icon?: string; tag?: string; id?: number }) {
  try {
    // 1. Android Nativo via Capacitor LocalNotifications
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body: options?.body || '',
              id: options?.id || Math.floor(Math.random() * 1000000) + 1,
              smallIcon: 'ic_launcher',
              sound: 'default'
            }
          ]
        });
        return;
      } catch (capErr) {
        console.warn('LocalNotifications.schedule falhou, tentando fallback Web:', capErr);
      }
    }

    // 2. Notificação Web / PWA no navegador
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const iconUrl = options?.icon || '/icon2.png';
      new Notification(title, {
        body: options?.body || '',
        icon: iconUrl,
        tag: options?.tag || 'gkd-controle-diario',
      });
      return;
    }
  } catch (error) {
    console.warn('Não foi possível disparar notificação:', error);
  }
}
