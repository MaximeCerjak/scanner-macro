/**
 * Déclaration globale de l'API exposée par le preload sur `window.scanner`.
 *
 * Le preload expose `window.scanner` via `contextBridge.exposeInMainWorld`.
 * Ce fichier permet à TypeScript de connaître le type de cet objet côté
 * renderer.
 */

import type { ScannerApi } from '../../preload'

declare global {
  interface Window {
    scanner: ScannerApi
  }
}

export {}
