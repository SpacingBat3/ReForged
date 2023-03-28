import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // More restricted defaults.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      safeDialogs: true,
      autoplayPolicy: 'user-gesture-required',
    },
  });

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Block opening popup windows.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  // Deny all requests (to permissions / devices).
  mainWindow.webContents.session.setPermissionCheckHandler(() => false);
  mainWindow.webContents.session.setPermissionRequestHandler(() => false);
  mainWindow.webContents.session.setDevicePermissionHandler(() => false);
  mainWindow.webContents.session.setBluetoothPairingHandler(() => false);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => process.platform !== 'darwin' ? app.quit() : undefined);

app.on('activate', () => BrowserWindow.getAllWindows().length === 0 ? createWindow() : undefined);
