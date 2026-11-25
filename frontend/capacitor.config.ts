import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.secretariasaude.app',
  appName: 'Secretaria da Saúde',
  webDir: 'dist/frontend/browser',
  server: {
    // http (não https): o backend do MVP roda em http na rede local; com a página em https
    // o WebView bloquearia as chamadas (mixed content).
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
