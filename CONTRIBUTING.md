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

## Dependencies

- Dependency lifecycle scripts (`postinstall`, etc.) are **blocked by default**. A package that ships one must be listed in `pnpm-workspace.yaml` under `allowBuilds` with a short justification. Prefer denying (`false`) unless the script is essential.
- Tooling packages whose output must be stable (formatter, test runner, Git hooks) are pinned to exact versions.
