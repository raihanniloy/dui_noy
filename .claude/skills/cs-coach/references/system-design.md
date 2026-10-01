# System design: learning path, framework, problem bank, rubric

## 1. Learning path (teach building blocks before full problems)

**Stage A — Fundamentals (L1–L2)**
- Client–server, request lifecycle, latency numbers every engineer should know
- Back-of-the-envelope estimation: QPS, storage, bandwidth, memory
- Vertical vs horizontal scaling, stateless services
- Load balancers (L4 vs L7, algorithms, health checks)
- Caching: where (client, CDN, app, DB), strategies (cache-aside,
  write-through, write-back), eviction (LRU/LFU), invalidation, stampedes
- Databases: SQL vs NoSQL choice, indexes, read replicas
- API design: REST/gRPC, pagination, idempotency keys, rate limiting

**Stage B — Scaling data (L3)**
- Replication (sync/async, leader/follower, leaderless) and lag effects
- Partitioning/sharding: range, hash, consistent hashing, hot keys, resharding
- Consistency models, CAP/PACELC in practice
- Message queues & streams: decoupling, backpressure, delivery semantics,
  ordering, dead-letter queues
- Blob/object storage, CDNs
- Search indexes (inverted index), geospatial indexes (geohash, quadtree)

**Stage C — Reliability & operations (L3–L4)**
- Failure modes, redundancy, failover, multi-region
- Timeouts, retries with jitter, circuit breakers, idempotency
- Observability, SLIs/SLOs, capacity planning
- Security: authN/Z, encryption in transit/at rest, abuse prevention

**Stage D — Advanced (L4–L5)**
- Consensus and coordination (Raft, ZooKeeper/etcd, leases, fencing tokens)
- Distributed transactions, sagas, outbox pattern, CDC
- Stream processing (windows, watermarks), lambda vs kappa
- Real-world architectures from public engineering write-ups (label as
  "publicly described", never invent details)

## 2. Interview framework (teach it, then require it)

| Step | Time | What a strong candidate does |
|------|------|------------------------------|
| 1. Requirements | 5 min | Functional (3–5 core features), non-functional (scale, latency, availability, consistency), explicitly out of scope |
| 2. Estimation | 3–5 min | DAU → QPS (avg/peak), read:write ratio, storage over N years, bandwidth |
| 3. API & data model | 5 min | Key endpoints, entities, access patterns, DB choice justified by access patterns |
| 4. High-level design | 10 min | Boxes & arrows covering every functional requirement end-to-end |
| 5. Deep dives | 10–15 min | 2–3 hardest parts: bottlenecks, scaling, consistency, failure handling |
| 6. Wrap-up | 3–5 min | Trade-offs made, what they'd monitor, future improvements |

Encourage ASCII diagrams in chat, e.g.:
```
client → LB → API svc → cache → DB (primary) → replicas
                     ↘ queue → workers → object store
```

## 3. Playing the interviewer
- Open with a one-line prompt ("Design a URL shortener.") — nothing more.
- When asked, give concrete numbers (e.g. "100M DAU, 10:1 read:write").
- If they skip requirements or estimation, let it go 2 minutes, then ask
  "What scale are we designing for?"
- Push back on hand-waving: "How exactly does the cache stay consistent?",
  "What happens when that node dies?", "Where's the bottleneck at 10× traffic?"
- Inject one curveball in deep dives (hot key, region outage, new feature,
  10× growth, strict ordering requirement).
- Do not design it for them. Hints only if they are stuck > 3 minutes.
- Track time with step markers ("~20 minutes in").

## 4. Problem bank (by level)

**L2 — Starter**
URL shortener · Pastebin · Rate limiter · Key-value store (single node) ·
Unique ID generator · Notification service

**L3 — Standard**
News feed / Twitter timeline · Chat app (WhatsApp/Slack) · Instagram/photo
sharing · Web crawler · Typeahead/autocomplete · Distributed cache ·
Parking lot / ticketing with seat reservation · YouTube/Netflix (video upload &
streaming) · Dropbox/Google Drive (file sync)

**L4 — Hard**
Uber/ride matching (geo) · Google Docs collaborative editing · Payment system
(idempotency, ledgers, reconciliation) · Distributed message queue (Kafka-like)
· Search engine · Ad click aggregation (stream processing) · Stock exchange
matching engine · Leaderboard at global scale

**L5 — Expert**
Globally distributed SQL database · Distributed job scheduler with exactly-once
effects · Multi-region active-active system with conflict resolution · Design
a metrics/monitoring system (Prometheus/Datadog-like) at planet scale

## 5. Rubric (1–4 each)

| Dimension | What 4 looks like |
|-----------|-------------------|
| Requirements & scoping | Asked sharp questions, prioritized, stated assumptions |
| Estimation | Quick, roughly right, actually used numbers to drive decisions |
| High-level design | Complete, coherent, every requirement served |
| Data & storage | Schema and DB choice derived from access patterns; partitioning sound |
| Scalability & performance | Found real bottlenecks, applied caching/sharding/async correctly |
| Reliability & trade-offs | Handled failures; articulated trade-offs, not just "it depends" |
| Communication | Structured, drove the conversation, used diagrams, managed time |

Level expectations: junior/mid ≈ solid steps 1–4; senior ≈ strong deep dives
and trade-offs; staff+ ≈ drives ambiguity, operational/organizational concerns,
evolution over time.

Signal: avg ≥ 3.5 strong hire · 3–3.4 hire · 2.5–2.9 lean no · < 2.5 no hire
(for the stated target level).

## 6. After the mock
Use the feedback format in [interview-guide.md](interview-guide.md), plus:
- A cleaned-up reference design for the problem (diagram + key decisions).
- The 1–2 building blocks to study next (link back to Stage A–D topics).
- Log it in the progress file's interview log.
