// Second-level suffixes where the registrable domain has three labels, like
// "bbc.co.uk" or "hepsiburada.com.tr". A short list instead of the whole
// Public Suffix List: wrong only by showing one label too many or too few.
const TWO_LABEL_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.tr',
  'org.tr',
  'net.tr',
  'gov.tr',
  'edu.tr',
  'com.au',
  'net.au',
  'org.au',
  'co.jp',
  'co.kr',
  'co.nz',
  'co.za',
  'co.in',
  'com.br',
  'com.mx',
  'com.ar',
  'com.cn',
  'com.sg',
]);

/** The domain a site registered, like "github.com" for "gist.github.com". */
export function registrableDomain(hostname: string): string {
  const labels = hostname.toLowerCase().replace(/\.$/, '').split('.');
  const lastTwo = labels.slice(-2).join('.');
  return labels.slice(TWO_LABEL_SUFFIXES.has(lastTwo) ? -3 : -2).join('.');
}

/** Whether `hostname` is `domain` or one of its subdomains. */
export function matchesDomain(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase();
  const wanted = domain.toLowerCase();
  return host === wanted || host.endsWith(`.${wanted}`);
}
