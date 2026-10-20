# Architecture Decision Records

An Architecture Decision Record (ADR) captures one significant technical decision: the context that forced it, what was decided, which alternatives were rejected and what follows from it. ADRs explain *why* the code is shaped the way it is.

## When to write one

Write an ADR when a decision is expensive to reverse or shapes many parts of the codebase, for example a framework, a process model, a storage engine or a cross-cutting pattern. Routine implementation choices do not need one.

## How to add one

1. Copy [`template.md`](template.md) to `NNNN-short-title.md`, using the next free number.
2. Fill in every section. Keep it short: one decision per record.
3. Open a pull request with the status `Proposed`. Once the decision is agreed in review, set it to `Accepted` before merging; the merge makes it final.
4. Add it to the index below.

Accepted records are immutable. When a decision changes, write a new ADR that supersedes the old one, and set the old record's status to `Superseded by ADR-NNNN`.

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-electron-shell-with-overlay-window.md) | Electron shell with a transparent overlay window | Accepted |
| [0003](0003-single-state-in-main-process.md) | One state in the main process, rendered by two windows | Accepted |
| [0004](0004-canvas-2d-renderer-with-fixed-timestep-loop.md) | Hand-written Canvas 2D renderer with a fixed-timestep loop | Accepted |
