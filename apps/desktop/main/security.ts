import path from 'path';
import { app } from 'electron';
import { realpath } from 'fs/promises';

/**
 * Security utility for validating file paths to prevent directory traversal attacks.
 *
 * Security Model:
 * 1. User-approved paths: Files/folders selected via Electron dialog (session whitelist)
 * 2. App-safe directories: App data, temp storage (always allowed)
 * 3. Symlink resolution: All paths resolved before validation
 *
 * This allows users to open PDFs from anywhere (USB, network shares, custom folders)
 * while preventing malicious renderer code from accessing arbitrary system files.
 */

/**
 * Custom error class for security violations
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

// Session-based whitelist of user-approved paths
const userApprovedPaths = new Set<string>();

// Cached safe directories (app-controlled only)
let cachedSafeDirs: string[] | null = null;

/**
 * Get app-safe directories (not user content directories)
 */
function getSafeDirectories(): string[] {
  if (!cachedSafeDirs) {
    cachedSafeDirs = [
      app.getPath('userData'), // App data directory
      app.getPath('temp'), // Temp directory
    ].map((dir) => path.normalize(dir));
  }
  return cachedSafeDirs;
}

/**
 * Register a user-approved path (from file dialog or recent files)
 * This allows the app to access files the user explicitly opened.
 *
 * @param filePath - Path approved by user action (file or directory)
 * @param approveDirectory - If true, treat path as a directory and approve all contents (use cautiously)
 */
export function approveUserPath(filePath: string, approveDirectory = false): void {
  const normalizedPath = path.normalize(path.resolve(filePath));

  if (approveDirectory) {
    // Treat the path itself as a directory to approve
    // This allows access to the directory and all its contents
    userApprovedPaths.add(normalizedPath);
  } else {
    // Approve only the specific file or directory path
    userApprovedPaths.add(normalizedPath);
  }
}

/**
 * Clear user-approved paths (e.g., on app restart or logout)
 */
export function clearUserApprovedPaths(): void {
  userApprovedPaths.clear();
}

/**
 * Clear cached safe directories (for testing only)
 * @internal
 */
export function clearCachedSafeDirs(): void {
  cachedSafeDirs = null;
}

/**
 * Normalize path for comparison (handles case-insensitive filesystems)
 */
function normalizeForComparison(p: string): string {
  // macOS and Windows have case-insensitive filesystems by default
  if (process.platform === 'darwin' || process.platform === 'win32') {
    return p.toLowerCase();
  }
  return p;
}

/**
 * Check if path is within user-approved paths
 */
function isUserApprovedPath(resolvedPath: string): boolean {
  const normalizedPath = normalizeForComparison(resolvedPath);

  for (const approvedPath of userApprovedPaths) {
    const normalizedApproved = normalizeForComparison(approvedPath);

    // Check for exact match first
    if (normalizedPath === normalizedApproved) {
      return true;
    }

    // Ensure approved path ends with separator to prevent prefix attacks
    const approvedWithSep = normalizedApproved.endsWith(path.sep)
      ? normalizedApproved
      : normalizedApproved + path.sep;

    // Check if path is within approved directory
    if (normalizedPath.startsWith(approvedWithSep)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if path is within app-safe directories
 */
function isSafePath(resolvedPath: string): boolean {
  const safeDirs = getSafeDirectories();
  const normalizedPath = normalizeForComparison(resolvedPath);

  return safeDirs.some((safeDir) => {
    const normalizedSafe = normalizeForComparison(safeDir);
    const safeWithSep = normalizedSafe.endsWith(path.sep)
      ? normalizedSafe
      : normalizedSafe + path.sep;

    // Check if path is exactly the safe directory or within it
    return normalizedPath === normalizedSafe || normalizedPath.startsWith(safeWithSep);
  });
}

/**
 * Validates that a file path is safe to access.
 * Prevents directory traversal and symlink attacks.
 *
 * Allowed paths:
 * - User-approved paths (from file dialogs)
 * - App-safe directories (userData, temp)
 *
 * @param filePath - The file path to validate
 * @returns Resolved real path if valid
 * @throws Error if path is invalid or not approved
 */
export async function validatePath(filePath: string): Promise<string> {
  // Basic input validation
  if (!filePath || typeof filePath !== 'string') {
    throw new SecurityError('Path must be a non-empty string');
  }

  // Check for null bytes (injection attack)
  if (filePath.includes('\0')) {
    throw new SecurityError('Path contains null bytes');
  }

  // Normalize and resolve symlinks to prevent bypass attacks
  const normalizedPath = path.normalize(path.resolve(filePath));

  let resolvedPath: string;
  try {
    // Resolve symlinks to get real path
    resolvedPath = await realpath(normalizedPath);
  } catch (error) {
    // Only handle ENOENT (file not found) - re-throw permission errors, I/O errors, etc.
    // This prevents masking security-relevant errors like EACCES or symlink loops (ELOOP)
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      throw error;
    }

    // File doesn't exist yet (e.g., for write operations) - validate parent directory
    const parentDir = path.dirname(normalizedPath);
    const basename = path.basename(normalizedPath);

    // Validate basename doesn't contain directory separators (defense-in-depth)
    if (basename.includes('/') || basename.includes('\\') || basename.includes(path.sep)) {
      throw new SecurityError('Filename contains directory separators');
    }

    try {
      // Resolve parent directory (handles symlinks in parent path)
      const resolvedParent = await realpath(parentDir);

      // CRITICAL: Validate parent directory is approved BEFORE constructing path
      if (!isUserApprovedPath(resolvedParent) && !isSafePath(resolvedParent)) {
        throw new SecurityError('Parent directory not approved');
      }

      // Construct path using validated parent + basename
      resolvedPath = path.join(resolvedParent, basename);
    } catch (err) {
      if (err instanceof SecurityError) {
        throw err;
      }
      // Only catch ENOENT on parent directory lookup
      const parentErr = err as NodeJS.ErrnoException;
      if (parentErr.code === 'ENOENT') {
        throw new SecurityError(`Directory does not exist: ${parentDir}`);
      }
      // Re-throw permission errors, I/O errors, etc.
      throw err;
    }
  }

  // Check if path is in user-approved paths or app-safe directories
  if (isUserApprovedPath(resolvedPath) || isSafePath(resolvedPath)) {
    return resolvedPath;
  }

  // Path not approved - deny access
  throw new SecurityError(
    'Path not approved. Files must be opened via File dialog or be in app storage.'
  );
}

/**
 * Validates path for write operations (stricter than read)
 * Only allows writing to user-approved directories or app-safe directories
 */
export async function validateWritePath(filePath: string): Promise<string> {
  const resolvedPath = await validatePath(filePath);

  // Additional check: Ensure we're not writing to root directories
  const root = path.parse(resolvedPath).root;
  if (resolvedPath === root) {
    throw new SecurityError('Cannot write to root directory');
  }

  return resolvedPath;
}
