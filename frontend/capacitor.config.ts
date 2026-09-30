import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.secretariasaude.app',
  appName: 'Secretaria da Saúde',
  webDir: 'dist/frontend/browser',
  server: {
    androidScheme: 'https',
  },
};

export default config;
