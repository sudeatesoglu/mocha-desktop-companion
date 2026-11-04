# Contributing to Mocha

Thanks for your interest in Mocha! This guide explains how work flows through the repository.

## Workflow

1. **Open an issue first.** Use the issue forms: describe the problem, the proposed solution and acceptance criteria.
2. **Branch from `dev`**, named `<type>/<issue-number>-<short-description>`, e.g. `feat/42-idle-detection`.
3. **Make small, focused commits** that each leave the project in a working state (see [Commit messages](#commit-messages)).
4. **Run the checks locally** before pushing:

   ```bash
   pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build
   ```

5. **Open a pull request into `dev`** and fill in every section of the PR template. Link the issue with `Closes #<number>`.
6. **Address review feedback** in new commits. Update the PR description if the final change differs from the original.
7. Pull requests into `dev` are **squash-merged**, so the PR title becomes the commit message and must follow the commit convention.

## Branches and releases

| Branch | Role | Receives | Merge method |
| --- | --- | --- | --- |
| `dev` | Integration, default branch | Feature and fix pull requests | Squash (one commit per pull request, linear history) |
| `main` | Production, every commit is releasable | Pull requests from `dev` (and `hotfix/*`) | Merge commit (keeps the `dev` history) |

Both branches are protected by repository rulesets, defined as code in [`.github/rulesets/`](.github/rulesets): no direct pushes, no force pushes, no deletion, a pull request with both CI checks green and up to date with its base, and resolved review conversations. Apply changes to these files with `node scripts/apply-rulesets.mjs` (requires the GitHub CLI with admin access).

Releasing:

1. Update `CHANGELOG.md` and the package versions on `dev` (Semantic Versioning).
2. Open a pull request from `dev` to `main` and merge it with a merge commit.
3. Tag the merge commit on `main` as `vX.Y.Z` and publish a GitHub Release with the DMGs from `pnpm package` and their SHA-256 checksums.

Merging to `main` never deploys anything by itself; only publishing a release does.

## Commit messages

Commits follow [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/). This is enforced by [commitlint](https://commitlint.js.org) in a `commit-msg` Git hook and in CI.

```text
<type>(<scope>): <summary>

Why:
<the problem or motivation>

What:
- <notable change>
- <notable change>

Closes #<issue>
```

- **Header:** a scope is required.
- **Summary:** imperative mood ("add", not "added"), no trailing period, at most 72 characters.
- **Body (required):** explain *why* the change is needed and *what* changed at a high level; the diff shows the details. Wrap lines at 72 characters. Keep `Why:` and `What:` on their own lines: `Why: text` on a single line looks like a [Git trailer](https://git-scm.com/docs/git-interpret-trailers) (`Key: value`) and is parsed as a footer, leaving the body empty.
- **Footer:** `Closes #N` / `Refs #N`; `BREAKING CHANGE: <description>` for breaking changes, together with a `!` after the scope (`feat(api)!: ...`).

A commit template is included. Enable it once per clone:

```bash
git config commit.template .gitmessage
```

### Types

| Type | Use for |
| --- | --- |
| `feat` | A new user-facing feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting with no code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests, test tooling |
| `build` | Build system, tooling configuration, dependencies |
| `ci` | CI/CD workflows |
| `chore` | Other maintenance |
| `revert` | Reverting a previous commit |

### Scopes

Allowed scopes are defined in [`commitlint.config.ts`](commitlint.config.ts), the single source of truth. Add a new scope there when a new area of the codebase appears.

## Git hooks

[Lefthook](https://lefthook.dev) installs these hooks automatically on `pnpm install`:

| Hook | What it does |
| --- | --- |
| `pre-commit` | Runs Biome on staged files and re-stages any fixes |
| `commit-msg` | Validates the commit message with commitlint |

In an emergency you can bypass hooks with `git commit --no-verify`. CI re-runs the same checks on every pull request, so a bypassed problem is still caught before merging.

Hooks are not installed when there is no `.git` directory (e.g. a source tarball) or when the `CI` environment variable is set.

## Continuous integration

The [CI workflow](.github/workflows/ci.yml) runs on every pull request into `dev` or `main` and on pushes to those branches:

| Job | Checks |
| --- | --- |
| Lint, typecheck, test, build | `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage` (80% thresholds), `pnpm build` |
| Commit messages and PR title | commitlint on every commit in the pull request and on its title (pull requests only) |

A pull request can only be merged when all checks pass.

Workflow security: every action is pinned to a full commit SHA, the job token is read-only, checkout credentials are not persisted, and untrusted text such as the PR title reaches scripts only through environment variables.

## Dependencies

- Add a dependency to the package that uses it: `pnpm --filter <package> add <name>`. Shared tooling (TypeScript, Biome, Vitest, commitlint) lives in the root `package.json`.
- `@mocha/core` must stay free of runtime dependencies on Electron, the DOM or Node APIs.
- Dependency lifecycle scripts (`postinstall`, etc.) are **blocked by default**. A package that ships one must be listed in `pnpm-workspace.yaml` under `allowBuilds` with a short justification. Prefer denying (`false`) unless the script is essential.
- Tooling packages whose output must be stable (formatter, test runner, Git hooks) are pinned to exact versions.
