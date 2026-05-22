# Asteris–THAL Continuity Bridge v0.1

This is a joint experimental comparison artifact.

It is not a merger of Asteris and THAL.
It is not a sentience claim.
It does not transfer ownership of either framework.
It uses fictional placeholder data only.

Ray/Asteris retain ownership of Asteris Live, Choir Protocol, Mount Olympus, Enki’s Will, Continuity Kernel, and related conceptual/design materials.

Jason/Nova retain ownership of THAL/Nova architecture, Nova identity framework, implementation workflow, code structure, schemas, tests, and validation process.

## Local Prototype

This v0.1 prototype demonstrates deterministic local bridge mechanics:

- identity preservation
- memory ledger storage
- thought-thread continuity
- contradiction detection
- confidence scoring
- boundary/ethics review
- audit logging
- state transition
- clarification-based recovery

No LLM calls, API calls, external data, private corpus imports, hidden memory injection, or identity imports are used.

## Run

```bash
npm install
npm test
npm run demo
```

## ATCB v0.3 Service

ATCB v0.3 is a standalone local continuity-governance service. It is not THAL, Asteris, or Nova. It does not claim sentience, import private corpus material, transfer ownership, or fuse identities.

ATCB is the continuity control plane around an AI system: it tracks memory integrity, claim provenance, confidence, contradictions, clarification-gated recovery, human review, state, and audit trails.

```bash
npm run db:migrate
npm run db:seed
npm run demo:v03
npm run dashboard:v03
```

The local REST service binds to `127.0.0.1` by default. See `docs/INTEGRATION_CONTRACT.md` and `.env.example`.
