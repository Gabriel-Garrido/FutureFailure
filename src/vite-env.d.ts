/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Optional endpoint that receives subscription emails as JSON
   * `{ email, lang, source }`. When unset, sign-ups are stored locally so the
   * form stays functional in the demo build without a backend.
   */
  readonly VITE_SUBSCRIBE_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
