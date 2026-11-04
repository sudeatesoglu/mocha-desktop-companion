# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-10-20

## Context

Mocha's architecture is shaped by deliberate trade-offs (process model, state ownership, rendering performance). Without a written record, the reasoning behind them is lost, and later changes can undo a trade-off without anyone noticing.

## Decision

We will record significant architecture decisions as ADRs in `docs/adr/`, using the lightweight format in [`template.md`](template.md). Each record covers a single decision with its context, alternatives and consequences. Accepted records are not edited; a changed decision is captured by a new record that supersedes the old one.

## Alternatives considered

- **Decisions in pull request descriptions only:** hard to find later and scattered across many PRs.
- **A wiki:** lives outside the repository, so it is not reviewed or versioned together with the code.

## Consequences

- Decisions are reviewable in pull requests like any other change.
- New contributors can read the records to understand why the code looks the way it does.
- Writing a record adds a small cost to significant changes, which is intended.
