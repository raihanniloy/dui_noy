# CS Coach Progress
Goal: not yet set (ask in next session)
Language: not yet set
Weekly hours: not yet set

## Levels by track
| Track | Level | Notes |
|-------|-------|-------|
| Architecture / distributed systems | L2 (borderline L3) | Good intuition (saga, outbox, idempotency key). Needs precision on mechanisms and failure traces. |
| Data structures & algorithms | ? | not assessed |
| OS / networking / databases | ? | not assessed |

## Topics
| Topic | Track | Level | Score (0-5) | Last studied | Next review | Weak spots |
|-------|-------|-------|-------------|--------------|-------------|------------|
| Microservices architecture | Architecture | L2-L3 | 3 | 2026-10-04 | 2026-10-11 | circuit breaker half-open recovery; naming mechanisms precisely; transactions can't span external systems; consumer-side idempotency (same-DB atomic dedupe) |

## Interview log
| Date | Type | Topic | Score | Key feedback |
|------|------|-------|-------|--------------|
| 2026-10-04 | Topic interview (5 Qs) | Microservices | 6/10 (3/5) | Strong: dedupe-on-consumer instinct, dup-vs-missing email trade-off, outbox naming. Weak: breaker recovery (half-open), try/finally does not survive process kill, atomicity across DB + external system, needed hints to locate both crash points in the stuck-PENDING incident. |

## Next up
- Review in 7 days: circuit breaker states, outbox + idempotent consumer, saga timeouts
- Next topics: API gateway and service discovery, observability (tracing), consistency models / CAP
