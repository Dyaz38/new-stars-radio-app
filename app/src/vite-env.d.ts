/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AD_SERVER_URL?: string;
  readonly VITE_ADSENSE_PUBLISHER_ID?: string;
  readonly VITE_ADSENSE_BANNER_SLOT?: string;
  readonly VITE_ADSENSE_EVENTS_SLOT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
