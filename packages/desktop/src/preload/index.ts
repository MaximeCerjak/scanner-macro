import { contextBridge } from 'electron'

/**
 * Script de pré-chargement.
 *
 * Exécuté dans un contexte isolé AVANT le renderer. C'est le seul endroit
 * où on peut exposer des APIs natives au renderer via contextBridge,
 * de manière contrôlée et typée.
 *
 * Au chapitre 01 on n'expose RIEN — le renderer parle à l'orchestrateur
 * directement en HTTP via fetch/WebSocket. Le preload existe juste pour
 * valider que la plomberie contextIsolation fonctionne.
 *
 * Au chapitre 07, on exposera ici (par exemple) :
 *   - des helpers pour ouvrir des dialogues natifs de sélection de fichier
 *   - des notifications système
 *   - des infos sur la version de l'app
 *
 * Règle d'or : JAMAIS exposer `ipcRenderer` ou `require` directement.
 * Toujours passer par une API typée et restreinte.
 */

const api = {
  platform: process.platform,
  // Les vraies méthodes seront ajoutées au chapitre 07.
}

contextBridge.exposeInMainWorld('scanner', api)

// Typage côté renderer — voir src/renderer/types/scanner.d.ts
export type ScannerApi = typeof api
