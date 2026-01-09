import * as Updates from 'expo-updates';

/**
 * OTA Update Safety Wrapper
 *
 * Provides safe interface for EAS Updates with:
 * - Automatic update checking
 * - Safe error handling
 * - Update state management
 */

export interface UpdateState {
  isAvailable: boolean;
  isDownloading: boolean;
  isChecking: boolean;
  error: string | null;
  lastChecked: Date | null;
}

let updateState: UpdateState = {
  isAvailable: false,
  isDownloading: false,
  isChecking: false,
  error: null,
  lastChecked: null,
};

/**
 * Check for available updates
 * Safe to call from app startup or user action
 */
export async function checkForUpdates(): Promise<boolean> {
  // Don't check in development mode
  if (__DEV__) {
    console.log('[Updates] Skipping check in development mode');
    return false;
  }

  // Don't check if already checking
  if (updateState.isChecking) {
    console.log('[Updates] Already checking for updates');
    return false;
  }

  updateState.isChecking = true;
  updateState.error = null;

  try {
    const update = await Updates.checkForUpdateAsync();
    updateState.isAvailable = update.isAvailable;
    updateState.lastChecked = new Date();

    if (update.isAvailable) {
      console.log('[Updates] Update available! Download with fetchUpdate()');
    } else {
      console.log('[Updates] App is up to date');
    }

    return update.isAvailable;
  } catch (error) {
    console.error('[Updates] Failed to check for updates:', error);
    updateState.error = error instanceof Error ? error.message : 'Unknown error';
    return false;
  } finally {
    updateState.isChecking = false;
  }
}

/**
 * Fetch and install available update
 * Requires app reload to apply
 */
export async function fetchAndApplyUpdate(): Promise<boolean> {
  if (__DEV__) {
    console.log('[Updates] Skipping fetch in development mode');
    return false;
  }

  if (updateState.isDownloading) {
    console.log('[Updates] Already downloading update');
    return false;
  }

  updateState.isDownloading = true;
  updateState.error = null;

  try {
    const result = await Updates.fetchUpdateAsync();

    if (result.isNew) {
      console.log('[Updates] New update downloaded! Reloading app...');
      await Updates.reloadAsync();
      return true;
    } else {
      console.log('[Updates] No new update found');
      return false;
    }
  } catch (error) {
    console.error('[Updates] Failed to fetch update:', error);
    updateState.error = error instanceof Error ? error.message : 'Unknown error';
    return false;
  } finally {
    updateState.isDownloading = false;
  }
}

/**
 * Get current update state
 */
export function getUpdateState(): Readonly<UpdateState> {
  return { ...updateState };
}

/**
 * Check for updates on app startup (safe auto-check)
 * Only checks, does not auto-download
 */
export async function checkOnStartup(): Promise<void> {
  if (__DEV__) return;

  try {
    // Wait 5 seconds after startup to avoid blocking
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const hasUpdate = await checkForUpdates();

    if (hasUpdate) {
      console.log('[Updates] Update available! User can manually trigger download.');
      // Don't auto-download - let user decide
      // You can show a UI prompt here
    }
  } catch (error) {
    console.error('[Updates] Startup check failed:', error);
  }
}
