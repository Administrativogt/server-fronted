import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.consortiumlegal.administrativo',
  appName: 'Administrativo',
  webDir: 'dist-mobile',
  android: {
    // Solo para depurar desde Chrome (chrome://inspect); se apaga en release
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    // Las peticiones (axios/XHR) salen por la capa nativa: sin CORS, así el
    // backend no necesita permitir el origen https://localhost de la app.
    CapacitorHttp: { enabled: true },
    LocalNotifications: { smallIcon: 'ic_stat_notify', iconColor: '#1F3A5F' },
    // Android: con la app en primer plano el push no se muestra solo; lo
    // muestra el sondeo (useCheckNotifications) para no duplicar.
    PushNotifications: { presentationOptions: [] },
  },
};

export default config;
