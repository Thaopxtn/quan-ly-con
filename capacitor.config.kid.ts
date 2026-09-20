import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lethao.kidcare',
  appName: 'KidCare - Con Cái',
  webDir: 'dist-kid',
  server: {
    url: 'https://thaopxtn.github.io/quan-ly-con/kid.html',
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
  },
};

export default config;

