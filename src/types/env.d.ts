declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_ASSETS_URL?: string;
    EXPO_PUBLIC_ACCESS_TOKEN?: string;
    EXPO_PUBLIC_SITE_URL?: string;
    EXPO_PUBLIC_GOOGLE_REVIEW_API?: string;
    NEXT_PUBLIC_API_URL?: string;
    NEXT_PUBLIC_ASSETS_URL?: string;
    NEXT_PUBLIC_SITE_URL?: string;
    ACCESS_TOKEN?: string;
    SECRET_TOKEN?: string;
    GOTIFY_TOKEN?: string;
    FCM_SERVER_KEY?: string;
    BROADCAST_SECRET?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
