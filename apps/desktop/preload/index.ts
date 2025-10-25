// Use require for preload script (runs in Node context)
// eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
const { contextBridge, ipcRenderer } = require('electron');

// FileSystem API
const fsAPI = {
  read: async (filePath: string): Promise<Uint8Array> => {
    const result = await ipcRenderer.invoke('fs.read', filePath);
    if (!result.success) {
      throw new Error(result.error);
    }
    return new Uint8Array(result.data);
  },

  write: async (filePath: string, data: Uint8Array): Promise<void> => {
    const result = await ipcRenderer.invoke('fs.write', filePath, Array.from(data));
    if (!result.success) {
      throw new Error(result.error);
    }
  },

  listDir: async (
    dirPath: string
  ): Promise<Array<{ name: string; isDirectory: boolean; path: string }>> => {
    const result = await ipcRenderer.invoke('fs.listDir', dirPath);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  },

  stat: async (
    filePath: string
  ): Promise<{
    size: number;
    isDirectory: boolean;
    isFile: boolean;
    mtime: string;
    ctime: string;
  }> => {
    const result = await ipcRenderer.invoke('fs.stat', filePath);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  },
};

// Expose API to renderer via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  fs: fsAPI,
});

// Type declaration for TypeScript
export type ElectronAPI = {
  fs: typeof fsAPI;
};
