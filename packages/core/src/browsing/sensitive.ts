import { matchesDomain } from './domains.ts';

/** Kinds of sites whose visits are never sent, whatever the user allows (ADR-0012). */
export type SensitiveKind = 'money' | 'health' | 'government' | 'messages' | 'passwords' | 'adult';

/**
 * Well-known sensitive sites, as data, shown to the user and tested. The
 * lists cannot be complete, so host and path patterns below catch more.
 */
export const SENSITIVE_DOMAINS: Readonly<Record<SensitiveKind, readonly string[]>> = {
  money: [
    'paypal.com',
    'wise.com',
    'revolut.com',
    'stripe.com',
    'papara.com',
    'enpara.com',
    'garantibbva.com.tr',
    'isbank.com.tr',
    'akbank.com',
    'ziraatbank.com.tr',
    'yapikredi.com.tr',
    'qnb.com.tr',
    'denizbank.com',
    'chase.com',
    'bankofamerica.com',
    'wellsfargo.com',
    'hsbc.com',
    'barclays.co.uk',
    'coinbase.com',
    'binance.com',
  ],
  health: [
    'mhrs.gov.tr',
    'enabiz.gov.tr',
    'doktortakvimi.com',
    'webmd.com',
    'mayoclinic.org',
    'healthline.com',
    'nhs.uk',
    'mychart.com',
    'betterhelp.com',
  ],
  government: ['turkiye.gov.tr', 'gov.tr', 'gov.uk', 'gov', 'europa.eu', 'login.gov'],
  messages: [
    'mail.google.com',
    'outlook.live.com',
    'outlook.office.com',
    'mail.yahoo.com',
    'proton.me',
    'icloud.com',
    'web.whatsapp.com',
    'whatsapp.com',
    'messenger.com',
    'web.telegram.org',
    'signal.org',
    'slack.com',
    'discord.com',
    'teams.microsoft.com',
    'teams.live.com',
  ],
  passwords: [
    '1password.com',
    'bitwarden.com',
    'lastpass.com',
    'dashlane.com',
    'keepersecurity.com',
    'proton.me',
  ],
  adult: [
    'pornhub.com',
    'xvideos.com',
    'xnxx.com',
    'xhamster.com',
    'onlyfans.com',
    'chaturbate.com',
  ],
};

// Hosts that sound sensitive whatever their name: banks, governments,
// militaries, health care, mail, sign-in and payment hosts, and adult words.
// They catch some harmless sites too, which ADR-0012 accepts.
const SENSITIVE_HOSTS: readonly RegExp[] = [
  /bank/i, // also "banka", "anybank", "bankofexample"
  /\.gov(\.[a-z]{2})?$/i,
  /\.mil(\.[a-z]{2})?$/i,
  /(hospital|hastane|clinic|klinik|pharmacy|eczane)/i,
  /^(mail|webmail|email|inbox)\./i,
  /^(accounts|account|login|signin|auth|id|sso|secure|pay|payment|checkout|billing|wallet)\./i,
  /(porn|xxx|sex)/i,
];

// Pages where people sign in, pay or manage an account, in English and
// Turkish ("giris" sign in, "uye-ol" sign up, "odeme" payment, "hesabim" my
// account, "sifre" password).
const SENSITIVE_PATHS =
  /\/(log-?in|sign-?in|sign-?up|register|auth|oauth|sso|2fa|mfa|verify|password|reset|checkout|payment|pay|billing|account|accounts|wallet|giris|giris-yap|uye-?ol|odeme|hesabim|sifre)(\/|$|[?#.])/i;

/** The sensitive kind of `hostname`, if it is one. */
export function sensitiveKind(hostname: string): SensitiveKind | 'pattern' | undefined {
  for (const [kind, domains] of Object.entries(SENSITIVE_DOMAINS) as [SensitiveKind, string[]][]) {
    if (domains.some((domain) => matchesDomain(hostname, domain))) return kind;
  }
  return SENSITIVE_HOSTS.some((pattern) => pattern.test(hostname)) ? 'pattern' : undefined;
}

/** Whether `pathname` is a sign-in, payment or account page. */
export function isSensitivePath(pathname: string): boolean {
  return SENSITIVE_PATHS.test(pathname);
}
