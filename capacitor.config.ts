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
  },
};

export default config;
