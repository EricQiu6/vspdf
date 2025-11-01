import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { validatePath, validateWritePath, SecurityError } from './security';
import { setupApplicationMenu } from './menu';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load renderer
  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// FileSystem IPC handlers
ipcMain.handle('fs.read', async (_, filePath: string) => {
  try {
    const validatedPath = await validatePath(filePath);
    const data = await readFile(validatedPath);
    return { success: true, data: Array.from(data) };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      code: error instanceof SecurityError ? 'SECURITY_ERROR' : 'FS_ERROR',
    };
  }
});

ipcMain.handle('fs.write', async (_, filePath: string, data: number[]) => {
  try {
    const validatedPath = await validateWritePath(filePath);
    await writeFile(validatedPath, new Uint8Array(data));
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      code: error instanceof SecurityError ? 'SECURITY_ERROR' : 'FS_ERROR',
    };
  }
});

ipcMain.handle('fs.listDir', async (_, dirPath: string) => {
  try {
    const validatedPath = await validatePath(dirPath);
    const entries = await readdir(validatedPath, { withFileTypes: true });
    const result = entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(validatedPath, entry.name),
    }));
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      code: error instanceof SecurityError ? 'SECURITY_ERROR' : 'FS_ERROR',
    };
  }
});

ipcMain.handle('fs.stat', async (_, filePath: string) => {
  try {
    const validatedPath = await validatePath(filePath);
    const stats = await stat(validatedPath);
    return {
      success: true,
      data: {
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        mtime: stats.mtime.toISOString(),
        ctime: stats.ctime.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      code: error instanceof SecurityError ? 'SECURITY_ERROR' : 'FS_ERROR',
    };
  }
});

// App lifecycle
app.whenReady().then(() => {
  // Setup custom application menu (removes Cmd+W and other conflicting shortcuts)
  setupApplicationMenu();
  createWindow();
});

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
