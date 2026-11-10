// Applies the branch rulesets in .github/rulesets/ to the GitHub repository.
// Creates a ruleset if none with that name exists, otherwise updates it, so
// running it again is safe. Requires the GitHub CLI with admin access.
//
// Usage: node scripts/apply-rulesets.mjs
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(import.meta.dirname, '../.github/rulesets');

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' });
const repo = gh('repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner').trim();
const existing = JSON.parse(gh('api', `repos/${repo}/rulesets`));

for (const file of readdirSync(DIR).filter((name) => name.endsWith('.json'))) {
  const path = join(DIR, file);
  const { name } = JSON.parse(readFileSync(path, 'utf8'));
  const match = existing.find((ruleset) => ruleset.name === name);
  if (match) {
    gh('api', '-X', 'PUT', `repos/${repo}/rulesets/${match.id}`, '--input', path);
    process.stdout.write(`updated ${name}\n`);
  } else {
    gh('api', '-X', 'POST', `repos/${repo}/rulesets`, '--input', path);
    process.stdout.write(`created ${name}\n`);
  }
}
