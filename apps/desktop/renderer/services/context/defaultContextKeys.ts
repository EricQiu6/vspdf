/**
 * Default Context Keys
 *
 * Initializes platform and application-level context keys.
 * These context keys are available globally and provide information
 * about the platform, application, and environment.
 */

import { contextKeyService } from './ContextKeyService.js';

/**
 * Initialize default context keys
 *
 * Sets up global context keys for:
 * - Platform detection (isMac, isWindows, isLinux)
 * - Application metadata (appName, appVersion)
 * - Environment (isDevelopment, isProduction)
 *
 * Should be called once during application initialization.
 *
 * @example
 * ```typescript
 * // In Workbench.tsx
 * useEffect(() => {
 *   initializeDefaultContextKeys();
 * }, []);
 * ```
 */
export function initializeDefaultContextKeys(): void {
  // Platform detection
  const platform = navigator.platform.toLowerCase();
  const isMac = platform.includes('mac');
  const isWindows = platform.includes('win');
  const isLinux = !isMac && !isWindows;

  contextKeyService.setValue('isMac', isMac);
  contextKeyService.setValue('isWindows', isWindows);
  contextKeyService.setValue('isLinux', isLinux);

  // Application metadata
  contextKeyService.setValue('appName', 'vspdf');
  contextKeyService.setValue('appVersion', '0.1.0');

  // Environment detection
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  contextKeyService.setValue('isDevelopment', isDevelopment);
  contextKeyService.setValue('isProduction', isProduction);

  console.log('[Context] Initialized default context keys', {
    platform: isMac ? 'mac' : isWindows ? 'windows' : 'linux',
    environment: isDevelopment ? 'development' : 'production',
  });
}

/**
 * Common context key names
 *
 * These are context keys that are commonly used throughout the application.
 * Import these constants instead of using string literals to avoid typos.
 */
export const ContextKeys = {
  // Platform
  IS_MAC: 'isMac',
  IS_WINDOWS: 'isWindows',
  IS_LINUX: 'isLinux',

  // Application
  APP_NAME: 'appName',
  APP_VERSION: 'appVersion',

  // Environment
  IS_DEVELOPMENT: 'isDevelopment',
  IS_PRODUCTION: 'isProduction',

  // UI State (set by components)
  EDITOR_FOCUS: 'editorFocus',
  INPUT_FOCUS: 'inputFocus',
  ACTIVE_GROUP_ID: 'activeGroupId',
  VIEWER_TYPE: 'viewerType',
  VIEWER_URI: 'viewerUri',
} as const;
