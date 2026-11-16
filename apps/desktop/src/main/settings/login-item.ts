import type { LoginItem } from '../../shared/login-item.ts';

/** The part of Electron's login item settings Mocha reads. */
export interface LoginItemSettings {
  openAtLogin: boolean;
  /** macOS 13 and later: "enabled", "requires-approval", "not-registered" or "not-found". */
  status?: string;
}

/**
 * The login item as the settings window shows it. A development build is
 * never one: it would register Electron itself. A login item waiting for
 * the user's approval counts as on, with a hint to allow it.
 */
export function loginItemView(packaged: boolean, settings: LoginItemSettings): LoginItem {
  if (!packaged) return { available: false, openAtLogin: false, needsApproval: false };
  const needsApproval = settings.status === 'requires-approval';
  return { available: true, openAtLogin: settings.openAtLogin || needsApproval, needsApproval };
}
