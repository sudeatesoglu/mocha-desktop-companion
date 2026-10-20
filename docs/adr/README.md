# Architecture Decision Records

An Architecture Decision Record (ADR) captures one significant technical decision: the context that forced it, what was decided, which alternatives were rejected and what follows from it. ADRs explain *why* the code is shaped the way it is.

## When to write one

Write an ADR when a decision is expensive to reverse or shapes many parts of the codebase, for example a framework, a process model, a storage engine or a cross-cutting pattern. Routine implementation choices do not need one.

## How to add one

1. Copy [`template.md`](template.md) to `NNNN-short-title.md`, using the next free number.
2. Fill in every section. Keep it short: one decision per record.
3. Open a pull request. The record starts as `Proposed` and becomes `Accepted` when merged.
4. Add it to the index below.

Accepted records are immutable. When a decision changes, write a new ADR that supersedes the old one, and set the old record's status to `Superseded by ADR-NNNN`.

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
