import type { SensitiveKind } from '@mocha/core';

/** The sensitive kinds of sites, as the options page names them. */
export const SENSITIVE_KIND_LABELS: Readonly<Record<SensitiveKind, string>> = {
  money: 'Banking and payments',
  health: 'Health',
  government: 'Government and ID',
  messages: 'Mail and messaging',
  passwords: 'Password managers',
  adult: 'Adult sites',
};
