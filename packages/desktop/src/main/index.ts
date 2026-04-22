import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'

/**
 * Process principal d'Electron.
 *
 * Responsabilités chapitre 01 : créer UNE fenêtre qui charge le renderer
 * React. C'est tout. Pas d'IPC métier, pas de menus custom, pas de
 * communication avec l'orchestrateur — ça viendra au chapitre 07.
 *
 * Configuration de sécurité appliquée dès le départ :
 * - nodeIntegration: false      → le renderer n'a pas accès à Node
 * - contextIsolation: true      → séparation des contextes V8
 * - sandbox: true               → sandbox Chromium activée
 *
 * Ces réglages sont non-négociables et serviront de base au chapitre 07.
 */

const isDev = !app.isPackaged

function createMainWindow(): void {
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  window.on('ready-to-show', () => {
    window.show()
  })

  // Ouvrir les liens externes dans le navigateur système, pas dans Electron.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // En dev, Vite sert le renderer avec HMR.
  // En prod packagé, on charge le HTML compilé.
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createMainWindow()

  app.on('activate', () => {
    // macOS : recréer la fenêtre si toutes ont été fermées mais que le dock est cliqué.
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Linux et Windows : quitter quand toutes les fenêtres sont fermées.
  // macOS garde l'app en vie (convention Apple).
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
