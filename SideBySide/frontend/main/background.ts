
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 300,  // Compact width
        height: 100, // Compact height
        alwaysOnTop: true, // Key Requirement: Always on Top
        frame: false, // Optional: for custom UI
        transparent: true, // Optional: for floating effect
        webPreferences: {
            preload: path.join(__dirname, '../preload.js'), // Adjusted path if needed, usually in same dir or root
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Ensure it stays on top even in fullscreen apps (macOS behavior, but good generally)
    mainWindow.setAlwaysOnTop(true, 'screen-saver');

    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../out/index.html')}`;

    mainWindow.loadURL(startUrl);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

const isSingleInstance = app.requestSingleInstanceLock();

if (!isSingleInstance) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.on('ready', createWindow);

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}

// IPC handlers for resizing
ipcMain.on('resize-window', (event, { width, height }) => {
    if (mainWindow) {
        mainWindow.setSize(width, height);
    }
});
