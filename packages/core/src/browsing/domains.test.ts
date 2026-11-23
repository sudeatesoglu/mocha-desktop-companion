import { describe, expect, it } from 'vitest';
import { matchesDomain, registrableDomain } from './domains.ts';

describe('registrableDomain', () => {
  it.each([
    ['github.com', 'github.com'],
    ['gist.github.com', 'github.com'],
    ['www.bbc.co.uk', 'bbc.co.uk'],
    ['www.hepsiburada.com.tr', 'hepsiburada.com.tr'],
    ['music.youtube.com', 'youtube.com'],
    ['Docs.Python.org.', 'python.org'],
    ['localhost', 'localhost'],
  ])('finds the registered domain of %s', (hostname, expected) => {
    expect(registrableDomain(hostname)).toBe(expected);
  });
});

describe('matchesDomain', () => {
  it('matches the domain and its subdomains, not look-alikes', () => {
    expect(matchesDomain('youtube.com', 'youtube.com')).toBe(true);
    expect(matchesDomain('music.YouTube.com', 'youtube.com')).toBe(true);
    expect(matchesDomain('notyoutube.com', 'youtube.com')).toBe(false);
    expect(matchesDomain('youtube.com.evil.example', 'youtube.com')).toBe(false);
  });
});
