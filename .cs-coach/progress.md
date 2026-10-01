# CS Coach Progress
Goal: not yet set (ask at next session)
Language: Python
Weekly hours: not yet set

## Levels by track
| Track | Level | Notes |
|-------|-------|-------|
| Concurrency | L2 | Good on lock ordering, RLock, contention. Needs precise definitions, double-checked locking, distributed-lock safety |

## Topics
| Topic | Track | Level | Score (0-5) | Last studied | Next review | Weak spots |
|-------|-------|-------|-------------|--------------|-------------|------------|
| Locks (mutex, spin, RLock, deadlock, contention) | Concurrency | L2 | 3 | 2026-10-01 | 2026-10-08 | Precise race-condition definition; check-then-act fix (double-checked locking); fencing tokens for distributed locks; why spinning on one core is wasteful |

## Interview log
| Date | Type | Topic | Score | Key feedback |
|------|------|-------|-------|--------------|
| 2026-10-01 | Topic interview | Locks | 6/10 | Strong: spin vs mutex trade-off, lock ordering, interleaving once prompted. Weak: answered "how" with "what" (named the problem, not the fix); needed reveal on double-checked locking and fencing tokens |

## Next up
- Condition variables and producer/consumer
- Read-write locks, semaphores in practice
- Atomics / CAS and lock-free basics
- Database transactions and isolation levels (locks in databases)
