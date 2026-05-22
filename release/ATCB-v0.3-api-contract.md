# ATCB v0.3 API Contract

Local default: http://127.0.0.1:4317

## Endpoints
- GET /health
- POST /agents
- GET /agents
- GET /agents/:agentId
- GET /agents/:agentId/state
- POST /threads
- GET /threads/:threadId
- POST /memories
- GET /threads/:threadId/memories
- POST /claims
- GET /threads/:threadId/claims
- GET /threads/:threadId/contradictions
- POST /clarifications
- POST /reviews
- GET /threads/:threadId/reviews
- POST /recovery/attempt
- GET /audit
- GET /threads/:threadId/audit

External systems may submit claims, memories, clarifications, review decisions, and boundary profiles. ATCB may return state, contradictions, confidence warnings, recovery blocks, audit trails, and review requirements.
