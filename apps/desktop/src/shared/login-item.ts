/** Whether Mocha opens when the user logs in, as the settings window shows it. */
export interface LoginItem {
  /** Only the installed app can be a login item; a development build cannot. */
  available: boolean;
  openAtLogin: boolean;
  /** macOS asks the user to allow the login item in System Settings first. */
  needsApproval: boolean;
}

/** The line under the setting: why it cannot change, or what is left to do. */
export function loginItemHint(item: LoginItem): string {
  if (!item.available) return 'Available in the installed app.';
  if (item.needsApproval) return 'Allow Mocha in System Settings → General → Login Items.';
  return 'Mocha starts quietly in the menu bar.';
}
