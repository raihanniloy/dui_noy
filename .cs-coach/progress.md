# CS Coach Progress
Goal: not set yet (ask next session)
Language: Python (default; Java comparison shown once)
Weekly hours: not set yet

## Levels by track
| Track | Level | Notes |
|-------|-------|-------|
| OS / Concurrency | L2 | knows mutex basics; semaphores reaching L3 |

## Topics
| Topic | Track | Level | Score (0-5) | Last studied | Next review | Weak spots |
|-------|-------|-------|-------------|--------------|-------------|------------|
| Semaphores | OS / Concurrency | L3 | 3 | 2026-10-02 | 2026-10-09 | needed hints for signaling pattern (init 0); imprecise wording (mutex vs slot); weak 30-sec explanation (omitted counter, ops, ownership) |
| Distributed locking (shared file across services) | OS / Distributed systems | L3 | 3 | 2026-10-02 | 2026-10-09 | gave answers without stating the reason; missed availability/SPOF and idempotency; needed hint for lease expiry vs fencing token |

## Interview log
| Date | Type | Topic | Score | Key feedback |
|------|------|-------|-------|--------------|
| 2026-10-02 | Topic interview (5 Qs) | Semaphores | 3/5 | Spotted check-then-act race twice and the permit leak unaided. Needed hints for init-0 signaling and the second bounded-buffer semaphore. Use precise terms (mutex held vs slot). |

## Next up
- Review semaphores on 2026-10-09
- Leader election, idempotency, at-least-once delivery
- Mutex vs condition variables / monitors
- Deadlock (Coffman conditions, lock ordering)
- Classic problems: readers-writers, dining philosophers
