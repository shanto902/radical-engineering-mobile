declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SITE_URL?: string;
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_ASSETS_URL?: string;
    EXPO_PUBLIC_ACCESS_TOKEN?: string;
    EXPO_PUBLIC_GOOGLE_REVIEW_API?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
