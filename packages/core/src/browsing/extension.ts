/**
 * The Mocha extension's public key, as in its manifest's `key`. Chrome
 * derives the extension's ID from it, so the ID is the same on every
 * computer and Mocha can recognize the extension by its origin (ADR-0011).
 * A public key is public by nature: it identifies the extension and grants
 * nothing.
 */
export const EXTENSION_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwwH7oJGashgkyhCQ6z5qm2cSIcZQCZygBiFcCn6i0MGzxYzEvXCpAmDs9CAOEmMjVfVV7gBuLVGYpacm/3g71zUnVJIWwIAr+bmXNopv+UHbwhinKNBH26JQ4JsPGFoZt2he7GBc0PJglLLq0Ms59rtKxiidZlDPZBLSMTid5LLXbVWPvNNbdTCEhr5JcqKAfVdi5pxFlK2L+zR7liKjEvEHr1qfdXChk/fGMukpsQasRxAoUY6V3zK6W+U7uQNo/HKg7FaiOg2fKEDlKFB9k6gMmafIftD6llg9uMFIPsnp4aEfn9mZTHzuxZCShKZADaa9ghoLQ3NLCuekBSq4IwIDAQAB';

/** The extension's ID, derived from its key (checked by a test). */
export const EXTENSION_ID = 'bklkopgekhoiendfbkifbpmplojpgipp';

/** The origin of the extension's requests. */
export const EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}`;
