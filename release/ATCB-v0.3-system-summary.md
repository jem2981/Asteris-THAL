# ATCB v0.3 System Summary

Generated: 2026-05-22T01:57:40.063Z
Commit: bd723ae
Tag: pre-tag export

ATCB v0.3 is a standalone local continuity-governance service.

It is not THAL.
It is not Asteris.
It is not Nova.
It does not claim sentience.
It does not import private corpus.
It provides memory integrity, contradiction handling, review, recovery, state, and audit infrastructure.

## Implemented
- generic Agent, Thread, Memory, Claim, Contradiction, Clarification, Review, BoundaryRule, AuditEvent, and AgentStateSnapshot records
- SQLite local persistence using node:sqlite
- core continuity-governance service functions
- local REST API bound to 127.0.0.1 by default
- operator dashboard
- contract-based integration boundary
- fictional Solace / Project Helios / Project Icarus / Project Meridian seed data
- v0.3 service demo and tests
