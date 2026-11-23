import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import api from '../api/axios';

type CheckNotification = {
  id: number;
  action: string;
  request_id: number;
  created: string;
  title: string;
  body: string;
};

type NotificationsResponse = { last_id: number; items: CheckNotification[] };

/** Cada cuánto se consultan novedades mientras la app está abierta. */
const POLL_MS = 30_000;
const CHANNEL_ID = 'cheques';
const PUSH_TOKEN_KEY = 'm-push-token';

const storageKey = (username: string) => `m-check-notif-last:${username}`;

function readLast(username: string): number | undefined {
  try {
    const v = localStorage.getItem(storageKey(username));
    return v === null ? undefined : Number(v);
  } catch {
    return undefined;
  }
}

function writeLast(username: string, id: number) {
  try {
    localStorage.setItem(storageKey(username), String(id));
  } catch {
    /* sin almacenamiento: se vuelve a pedir el último id al reabrir */
  }
}

function readPushToken(): string | null {
  try {
    return localStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writePushToken(token: string | null) {
  try {
    if (token) localStorage.setItem(PUSH_TOKEN_KEY, token);
    else localStorage.removeItem(PUSH_TOKEN_KEY);
  } catch {
    /* sin almacenamiento */
  }
}

const toRequestId = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/**
 * Llamar ANTES de cerrar sesión (todavía con el JWT): el teléfono deja de
 * recibir push de ese usuario. Nunca lanza.
 */
export async function unregisterPushDevice(): Promise<void> {
  const token = readPushToken();
  if (!token || !Capacitor.isNativePlatform()) return;
  try {
    await api.delete('/api/push/devices', { data: { token } });
  } catch {
    /* sin red: el backend lo reasigna al próximo login en este teléfono */
  }
  writePushToken(null);
}

/** Canales de Android, uno por módulo (el usuario puede silenciarlos por separado). */
const CHANNELS = [
  { id: 'cheques', name: 'Cheques', description: 'Autorizaciones y liquidaciones de cheques' },
  { id: 'vacaciones', name: 'Vacaciones', description: 'Solicitudes y respuestas de vacaciones' },
  { id: 'salas', name: 'Salas', description: 'Reservas de salas por aprobar, aceptadas o rechazadas' },
  { id: 'envios', name: 'Envíos', description: 'Envíos asignados, entregados o con problemas' },
  { id: 'dinero', name: 'Dinero', description: 'Requerimientos de dinero por aprobar y sus respuestas' },
];

/** id int de 32 bits para una notificación local que no viene del historial de cheques. */
const localId = () => 1_000_000_000 + Math.floor(Math.random() * 1_000_000_000);

/**
 * Notificaciones de la app.
 *
 * - Push (Firebase) para TODOS los usuarios con sesión: cheques, vacaciones,
 *   salas, envíos y dinero. Llega con la app cerrada o en segundo plano.
 *   Con la app abierta Android no lo muestra solo: se muestra como local.
 * - Cheques además sondea `GET /checks/notifications?after=<id>` cada 30 s
 *   mientras la app está a la vista (respaldo si el push no se pudo activar).
 *
 * Sin duplicados en cheques: si el push está activo, al volver a primer plano
 * el sondeo solo avanza el último id (eso ya lo mostró el push).
 *
 * `onOpen(route, refId)` se llama al tocar una notificación.
 */
export function useCheckNotifications(
  username: string,
  chequesEnabled: boolean,
  onOpen: (route: string, refId?: number) => void,
) {
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!username || !Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let busy = false;
    // Si este teléfono ya registró push antes, se asume activo desde el arranque
    // (el registro es asíncrono y el primer sondeo no debe repetir lo ya avisado).
    let pushActive = readPushToken() !== null;
    const handles: Array<Promise<{ remove: () => Promise<void> }>> = [];

    const setup = async () => {
      // En Android 13+ es el mismo permiso (POST_NOTIFICATIONS) para ambos.
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') await LocalNotifications.requestPermissions();
      for (const ch of CHANNELS) {
        await LocalNotifications.createChannel({ ...ch, importance: 4, visibility: 1 }).catch(
          () => undefined,
        );
      }
    };

    const setupPush = async () => {
      try {
        const perm = await PushNotifications.checkPermissions();
        const granted =
          perm.receive === 'granted' ||
          (await PushNotifications.requestPermissions()).receive === 'granted';
        if (!granted || cancelled) return;

        handles.push(
          PushNotifications.addListener('registration', async ({ value }) => {
            try {
              await api.post('/api/push/devices', {
                token: value,
                platform: Capacitor.getPlatform(),
              });
              writePushToken(value);
              pushActive = true;
            } catch {
              pushActive = false;
            }
          }),
          PushNotifications.addListener('registrationError', () => {
            pushActive = false;
          }),
          // App en primer plano: Android no muestra el push solo.
          PushNotifications.addListener('pushNotificationReceived', (n) => {
            const data = (n.data ?? {}) as Record<string, string>;
            const module = data.module || 'cheques';
            if (module === 'cheques') {
              // el sondeo lo trae con su id del historial (sin duplicar)
              if (chequesEnabled) void poll(true);
              return;
            }
            void LocalNotifications.schedule({
              notifications: [
                {
                  id: localId(),
                  title: n.title ?? '',
                  body: n.body ?? '',
                  channelId: module,
                  extra: { route: data.route, refId: data.refId },
                },
              ],
            }).catch(() => undefined);
          }),
          PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
            const data = (a.notification?.data ?? {}) as Record<string, string>;
            onOpenRef.current(data.route || '/cheques', toRequestId(data.refId ?? data.requestId));
          }),
        );
        await PushNotifications.register();
      } catch {
        pushActive = false; // p. ej. sin google-services.json o sin Google Play
      }
    };

    const poll = async (show: boolean) => {
      if (!chequesEnabled || busy || cancelled) return;
      busy = true;
      try {
        const after = readLast(username);
        const { data } = await api.get<NotificationsResponse>('/checks/notifications', {
          params: after === undefined ? {} : { after },
        });
        if (cancelled) return;
        if (show && data.items.length) {
          await LocalNotifications.schedule({
            notifications: data.items.map((n) => ({
              // id de Android: int de 32 bits; el id del historial cabe de sobra
              id: n.id,
              title: n.title,
              body: n.body,
              channelId: CHANNEL_ID,
              extra: { route: '/cheques', refId: n.request_id },
            })),
          });
        }
        writeLast(username, data.last_id);
      } catch {
        /* sin red o sesión vencida: se reintenta en el siguiente ciclo */
      } finally {
        busy = false;
      }
    };

    const visible = () => document.visibilityState === 'visible';

    // Al volver a primer plano: lo ocurrido en segundo plano ya llegó por push.
    const onVisible = () => {
      if (visible()) void poll(!pushActive);
    };

    void setup()
      .then(setupPush)
      .then(() => poll(!pushActive));
    const timer = window.setInterval(() => {
      if (visible()) void poll(true);
    }, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    handles.push(
      LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
        const extra = (a.notification?.extra ?? {}) as { route?: string; refId?: unknown; requestId?: unknown };
        onOpenRef.current(extra.route || '/cheques', toRequestId(extra.refId ?? extra.requestId));
      }),
    );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      handles.forEach((h) => void h.then((x) => x.remove()));
    };
  }, [username, chequesEnabled]);
}
