import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  validatePath,
  validateWritePath,
  approveUserPath,
  clearUserApprovedPaths,
  clearCachedSafeDirs,
  SecurityError
} from '../security';
import * as fsPromises from 'fs/promises';
import { app } from 'electron';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  realpath: vi.fn(),
}));

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return '/app/user-data';
      if (name === 'temp') return '/tmp';
      return '/unknown';
    }),
  },
}));

describe('validatePath', () => {
  const mockRealpath = vi.mocked(fsPromises.realpath);

  beforeEach(() => {
    clearUserApprovedPaths();
    clearCachedSafeDirs();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearUserApprovedPaths();
    clearCachedSafeDirs();
  });

  describe('Input validation', () => {
    it('should reject null or undefined paths', async () => {
      await expect(validatePath(null as any)).rejects.toThrow(SecurityError);
      await expect(validatePath(undefined as any)).rejects.toThrow(SecurityError);
      await expect(validatePath('' as any)).rejects.toThrow(SecurityError);
    });

    it('should reject paths with null bytes (injection attack)', async () => {
      await expect(validatePath('/path/with\0null')).rejects.toThrow(SecurityError);
      await expect(validatePath('/path\0/file.pdf')).rejects.toThrow('null bytes');
    });

    it('should reject non-string paths', async () => {
      await expect(validatePath(123 as any)).rejects.toThrow(SecurityError);
      await expect(validatePath({} as any)).rejects.toThrow(SecurityError);
    });
  });

  describe('Error handling - ENOENT (file not found)', () => {
    it('should validate parent directory when file does not exist (ENOENT)', async () => {
      const filePath = '/home/user/documents/newfile.pdf';
      const parentPath = '/home/user/documents';

      // First call: file doesn't exist (ENOENT)
      mockRealpath.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      // Second call: parent directory exists and resolves
      mockRealpath.mockResolvedValueOnce(parentPath);

      // Approve the parent directory
      approveUserPath(parentPath, true);

      const result = await validatePath(filePath);
      expect(result).toBe('/home/user/documents/newfile.pdf');
      expect(mockRealpath).toHaveBeenCalledTimes(2);
    });

    it('should reject if parent directory is not approved (ENOENT on file)', async () => {
      const filePath = '/unapproved/path/file.pdf';
      const parentPath = '/unapproved/path';

      mockRealpath
        .mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }))
        .mockResolvedValue(parentPath);

      // Do NOT approve the parent
      await expect(validatePath(filePath)).rejects.toThrow(SecurityError);
      expect(await validatePath(filePath).catch(e => e.message)).toContain('not approved');
    });

    it('should reject if parent directory does not exist (ENOENT on both)', async () => {
      // File doesn't exist and parent doesn't exist either
      const filePath = '/nonexistent/dir/file.pdf';

      mockRealpath.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      await expect(validatePath(filePath)).rejects.toThrow(SecurityError);
      expect(await validatePath(filePath).catch(e => e.message)).toContain('does not exist');
    });
  });

  describe('Error handling - EACCES (permission denied)', () => {
    it('should throw EACCES immediately on file access', async () => {
      const filePath = '/restricted/file.pdf';
      const eaccesError = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });

      mockRealpath.mockRejectedValueOnce(eaccesError);

      await expect(validatePath(filePath)).rejects.toThrow('EACCES');
      expect(mockRealpath).toHaveBeenCalledTimes(1); // Should not try parent
    });

    it('should throw EACCES immediately on parent directory access', async () => {
      const filePath = '/home/user/restricted/file.pdf';
      const parentPath = '/home/user/restricted';

      // File doesn't exist (ENOENT)
      mockRealpath.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      // Parent has permission denied (EACCES)
      const eaccesError = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
      mockRealpath.mockRejectedValueOnce(eaccesError);

      await expect(validatePath(filePath)).rejects.toThrow('EACCES');
      expect(mockRealpath).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling - ELOOP (symlink loop)', () => {
    it('should throw ELOOP immediately for circular symlinks', async () => {
      const filePath = '/path/with/symlink/loop';
      const eloopError = Object.assign(new Error('ELOOP: too many symbolic links'), { code: 'ELOOP' });

      mockRealpath.mockRejectedValueOnce(eloopError);

      await expect(validatePath(filePath)).rejects.toThrow('ELOOP');
      expect(mockRealpath).toHaveBeenCalledTimes(1);
    });

    it('should throw ELOOP on parent directory symlink loop', async () => {
      const filePath = '/symlink-loop/file.pdf';

      mockRealpath.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      mockRealpath.mockRejectedValueOnce(Object.assign(new Error('ELOOP'), { code: 'ELOOP' }));

      await expect(validatePath(filePath)).rejects.toThrow('ELOOP');
    });
  });

  describe('Error handling - ENOTDIR (not a directory)', () => {
    it('should throw ENOTDIR immediately', async () => {
      const filePath = '/file.txt/subpath';
      const enotdirError = Object.assign(new Error('ENOTDIR: not a directory'), { code: 'ENOTDIR' });

      mockRealpath.mockRejectedValueOnce(enotdirError);

      await expect(validatePath(filePath)).rejects.toThrow('ENOTDIR');
      expect(mockRealpath).toHaveBeenCalledTimes(1);
    });

    it('should throw ENOTDIR on parent validation', async () => {
      const filePath = '/file.txt/newfile.pdf';

      mockRealpath.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      mockRealpath.mockRejectedValueOnce(Object.assign(new Error('ENOTDIR'), { code: 'ENOTDIR' }));

      await expect(validatePath(filePath)).rejects.toThrow('ENOTDIR');
    });
  });

  describe('Error handling - EIO (I/O error)', () => {
    it('should throw EIO immediately for I/O errors', async () => {
      const filePath = '/path/with/io-error.pdf';
      const eioError = Object.assign(new Error('EIO: i/o error'), { code: 'EIO' });

      mockRealpath.mockRejectedValueOnce(eioError);

      await expect(validatePath(filePath)).rejects.toThrow('EIO');
      expect(mockRealpath).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling - Parent directory ENOENT', () => {
    it('should throw SecurityError when parent directory does not exist', async () => {
      const filePath = '/nonexistent/path/file.pdf';

      mockRealpath.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const error = await validatePath(filePath).catch(e => e);
      expect(error).toBeInstanceOf(SecurityError);
      expect(error.message).toContain('does not exist');
    });
  });

  describe('Approval mechanism - User-approved paths', () => {
    it('should allow access to user-approved file paths', async () => {
      const filePath = '/home/user/documents/file.pdf';
      const resolvedPath = '/home/user/documents/file.pdf';

      mockRealpath.mockResolvedValueOnce(resolvedPath);
      approveUserPath(filePath);

      const result = await validatePath(filePath);
      expect(result).toBe(resolvedPath);
    });

    it('should allow access to files within user-approved directories', async () => {
      const dirPath = '/home/user/documents';
      const filePath = '/home/user/documents/subdir/file.pdf';

      mockRealpath.mockResolvedValueOnce(filePath);
      approveUserPath(dirPath, true); // Approve directory

      const result = await validatePath(filePath);
      expect(result).toBe(filePath);
    });

    it('should reject access to files outside user-approved directories', async () => {
      const approvedPath = '/home/user/documents';
      const unauthorizedPath = '/home/user/other/file.pdf';

      mockRealpath.mockResolvedValue(unauthorizedPath);
      approveUserPath(approvedPath, true);

      const error = await validatePath(unauthorizedPath).catch(e => e);
      expect(error).toBeInstanceOf(SecurityError);
      expect(error.message).toContain('not approved');
    });

    it('should prevent prefix attacks on approved paths', async () => {
      // Approve /home/user/docs, but try to access /home/user/docs-evil
      const approvedPath = '/home/user/docs';
      const maliciousPath = '/home/user/docs-evil/file.pdf';

      mockRealpath.mockResolvedValueOnce(maliciousPath);
      approveUserPath(approvedPath, true);

      await expect(validatePath(maliciousPath)).rejects.toThrow(SecurityError);
    });

    it('should handle case-insensitive filesystems (macOS/Windows)', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const approvedPath = '/Users/Test/Documents';
      const requestPath = '/users/test/documents/file.pdf';

      mockRealpath.mockResolvedValueOnce('/Users/Test/Documents/file.pdf');
      approveUserPath(approvedPath, true);

      const result = await validatePath(requestPath);
      expect(result).toBe('/Users/Test/Documents/file.pdf');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('Approval mechanism - Safe directories', () => {
    it('should allow access to app userData directory', async () => {
      const filePath = '/app/user-data/config.json';

      mockRealpath.mockResolvedValueOnce(filePath);

      const result = await validatePath(filePath);
      expect(result).toBe(filePath);
    });

    it('should allow access to app temp directory', async () => {
      const filePath = '/tmp/cache/file.pdf';

      mockRealpath.mockResolvedValueOnce(filePath);

      const result = await validatePath(filePath);
      expect(result).toBe(filePath);
    });

    it('should allow new files in safe directories (ENOENT)', async () => {
      const filePath = '/app/user-data/newfile.json';
      const parentPath = '/app/user-data';

      mockRealpath.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      mockRealpath.mockResolvedValueOnce(parentPath);

      const result = await validatePath(filePath);
      expect(result).toBe('/app/user-data/newfile.json');
    });
  });

  describe('Symlink resolution', () => {
    it('should resolve symlinks before validation', async () => {
      const symlinkPath = '/home/user/link-to-doc.pdf';
      const realPath = '/home/user/documents/doc.pdf';

      mockRealpath.mockResolvedValueOnce(realPath);
      approveUserPath(realPath);

      const result = await validatePath(symlinkPath);
      expect(result).toBe(realPath);
    });

    it('should validate against resolved symlink target, not link itself', async () => {
      const symlinkPath = '/home/user/approved-link.pdf';
      const realPath = '/etc/shadow'; // Dangerous file

      mockRealpath.mockResolvedValueOnce(realPath);
      approveUserPath(symlinkPath); // Approve the link, not the target

      // Should fail because resolved path is not approved
      await expect(validatePath(symlinkPath)).rejects.toThrow(SecurityError);
    });
  });

  describe('clearUserApprovedPaths', () => {
    it('should clear all user-approved paths', async () => {
      const filePath = '/home/user/documents/file.pdf';

      mockRealpath.mockResolvedValue(filePath);
      approveUserPath(filePath);

      // Should work before clearing
      await expect(validatePath(filePath)).resolves.toBe(filePath);

      clearUserApprovedPaths();

      // Should fail after clearing
      await expect(validatePath(filePath)).rejects.toThrow(SecurityError);
    });
  });
});

describe('validateWritePath', () => {
  const mockRealpath = vi.mocked(fsPromises.realpath);

  beforeEach(() => {
    clearUserApprovedPaths();
    clearCachedSafeDirs();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearUserApprovedPaths();
    clearCachedSafeDirs();
  });

  it('should reject writes to root directory', async () => {
    const rootPath = '/';

    mockRealpath.mockResolvedValue(rootPath);
    approveUserPath(rootPath, true);

    await expect(validateWritePath(rootPath)).rejects.toThrow(SecurityError);
    await expect(validateWritePath(rootPath)).rejects.toThrow('root directory');
  });

  it('should allow writes to approved non-root paths', async () => {
    const filePath = '/home/user/documents/file.pdf';

    mockRealpath.mockResolvedValueOnce(filePath);
    approveUserPath(filePath);

    const result = await validateWritePath(filePath);
    expect(result).toBe(filePath);
  });

  it('should allow writes to safe directories', async () => {
    const filePath = '/app/user-data/config.json';

    mockRealpath.mockResolvedValueOnce(filePath);

    const result = await validateWritePath(filePath);
    expect(result).toBe(filePath);
  });

  it('should inherit all validatePath restrictions', async () => {
    const unauthorizedPath = '/unauthorized/file.pdf';

    mockRealpath.mockResolvedValueOnce(unauthorizedPath);

    await expect(validateWritePath(unauthorizedPath)).rejects.toThrow(SecurityError);
  });
});
