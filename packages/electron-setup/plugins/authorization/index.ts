import { ipcMain } from 'electron';
import type { ElectronApp, Plugin } from '../../main/types';
import {
  verifyAuthorization,
  checkAuthorizationStatus,
} from '../../shared/auth.js';

/**
 * Authorization plugin options
 */
export interface AuthorizationPluginOptions {
  /**
   * Custom IPC channel prefix
   * @default ''
   */
  ipcPrefix?: string;
}

/**
 * Authorization plugin API
 */
export interface AuthorizationPluginAPI {
  /**
   * Verify license key and activate authorization
   * @param licenseKey - License key
   * @returns Promise with authorization result
   */
  verify(licenseKey: string): Promise<any>;

  /**
   * Check current authorization status
   * @returns Promise with authorization status
   */
  checkStatus(): Promise<boolean>;
}

/**
 * Authorization management plugin
 *
 * Provides license key verification and machine code-based authorization.
 *
 * @example
 * ```ts
 * import { createElectronApp } from '@escrcpy/electron-setup'
 * import { authorizationPlugin } from '@escrcpy/electron-setup/plugins'
 *
 * const app = createElectronApp({ ... })
 * app.use(authorizationPlugin())
 * ```
 */
export function authorizationPlugin(
  options: AuthorizationPluginOptions = {},
): Plugin {
  const { ipcPrefix = '' } = options;

  return {
    name: 'plugin:authorization',
    apply(mainApp: ElectronApp) {
      // Register IPC handlers
      const channelPrefix = ipcPrefix ? `${ipcPrefix}:` : '';

      ipcMain.handle(`${channelPrefix}verify-authorization`, async (event, licenseKey) => {
        try {
          const result = await verifyAuthorization(licenseKey);
          return { success: true, data: result };
        } catch (error: any) {
          return { success: false, message: error.message };
        }
      });

      ipcMain.handle(`${channelPrefix}check-authorization-status`, async () => {
        try {
          const status = await checkAuthorizationStatus();
          return { success: true, data: status };
        } catch (error: any) {
          return { success: false, message: error.message };
        }
      });
    },
  };
}

export default authorizationPlugin;