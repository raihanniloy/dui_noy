# Curriculum: basic → advanced

Tracks can be studied in parallel. Within a track, respect the order: each
stage assumes the previous one. Levels map to SKILL.md (L1–L5).

## Track 0 — Programming foundations (L1)
1. Variables, types, control flow, functions, recursion
2. Memory model: stack vs heap, references vs values
3. Basic OOP and functional ideas; immutability
4. Testing basics, debugging, reading stack traces
5. Git, command line, build tools

## Track 1 — Data structures & algorithms
**L1–L2**
1. Big-O, Big-Θ, amortized analysis, space complexity
2. Arrays, dynamic arrays, strings
3. Linked lists, stacks, queues, deques
4. Hash tables (hashing, collisions, load factor, resizing)
5. Recursion and backtracking basics
6. Sorting: bubble/insertion → merge, quick, heap; stability; counting/radix
7. Binary search (and on the answer space)
8. Two pointers, sliding window, prefix sums

**L3**
9. Trees: BST, traversals, balanced trees (AVL/red-black idea)
10. Heaps and priority queues; top-K patterns
11. Graphs: representations, BFS, DFS, topological sort, union-find
12. Shortest paths: Dijkstra, Bellman-Ford, 0-1 BFS; MST (Kruskal/Prim)
13. Dynamic programming: memoization, tabulation, classic patterns (knapsack,
    LIS, LCS, interval, grid, bitmask)
14. Greedy algorithms and exchange arguments
15. Tries, monotonic stack/queue, intervals

**L4–L5**
16. Segment trees, Fenwick trees, sparse tables
17. String algorithms: KMP, Z, rolling hash, suffix arrays
18. Advanced graphs: SCC, bridges, max flow, bipartite matching
19. Probabilistic structures: Bloom filters, HyperLogLog, count-min sketch,
    skip lists
20. Complexity theory: P vs NP, reductions, approximation

## Track 2 — Computer architecture & systems
1. Binary, two's complement, floating point (IEEE 754)
2. CPU basics: instructions, registers, pipelines, branch prediction
3. Memory hierarchy: caches, cache lines, locality, false sharing
4. How code runs: compilation, linking, interpreters, JIT, GC
5. Concurrency hardware: atomics, memory ordering (L4)

## Track 3 — Operating systems
1. Processes vs threads, context switching, system calls
2. Scheduling algorithms
3. Virtual memory, paging, TLB, page faults
4. Concurrency: race conditions, mutexes, semaphores, condition variables,
   deadlock (conditions, prevention)
5. File systems, inodes, journaling; I/O models (blocking, non-blocking,
   epoll/kqueue, io_uring)
6. Containers internals: namespaces, cgroups (L4)

## Track 4 — Networking
1. OSI vs TCP/IP model
2. IP, subnetting, routing basics, NAT
3. TCP (handshake, flow/congestion control) vs UDP
4. DNS, HTTP/1.1, HTTP/2, HTTP/3/QUIC, TLS handshake
5. "What happens when you type a URL" (full end-to-end)
6. WebSockets, long polling, SSE, gRPC
7. CDNs, anycast, load balancing (L4/L7)

## Track 5 — Databases
1. Relational model, SQL, joins, normalization
2. Indexes: B-trees, hash indexes, composite indexes, covering indexes
3. Transactions, ACID, isolation levels and anomalies
4. Query planning, EXPLAIN, N+1 problems
5. Storage engines: B-tree vs LSM-tree, WAL
6. NoSQL families: key-value, document, wide-column, graph; when to use which
7. Replication, partitioning/sharding, consistent hashing (L4)
8. MVCC, locking, distributed transactions, 2PC, sagas (L4)

## Track 6 — Software engineering & design
1. Clean code, naming, functions, refactoring
2. SOLID, coupling/cohesion, composition over inheritance
3. Design patterns (strategy, observer, factory, adapter, decorator…) and when
   NOT to use them
4. Testing pyramid, TDD, mocks vs fakes, property-based testing
5. API design: REST, versioning, idempotency, pagination, errors
6. Low-level / object-oriented design interviews (parking lot, LRU cache,
   rate limiter class, elevator)
7. Architecture: layered, hexagonal, monolith vs microservices, event-driven
8. Reliability: logging, metrics, tracing, SLOs, incident response
9. Security basics: OWASP top 10, authN vs authZ, OAuth2/OIDC, secrets
10. Delivery: CI/CD, feature flags, code review, technical writing

## Track 7 — Distributed systems
1. Why distributed is hard: fallacies of distributed computing, partial failure
2. Time and ordering: clocks, Lamport and vector clocks
3. Replication models: leader-follower, multi-leader, leaderless, quorums
4. Consistency models: linearizable, sequential, causal, eventual; CAP & PACELC
5. Consensus: Raft, Paxos (idea), leader election
6. Messaging: queues vs logs (Kafka), delivery semantics, exactly-once myth
7. Fault tolerance: retries, backoff, timeouts, circuit breakers, bulkheads
8. Classic papers (L5): MapReduce, GFS, Dynamo, Bigtable, Spanner, Raft

## Track 8 — System design
See [system-design.md](system-design.md). Prerequisites: Tracks 4, 5 basics
and Track 7 items 1–4.

## Suggested paths
- **Interview in ~3 months**: DSA L1→L3 (daily) + Networking/DB/OS essentials
  (2×/week) + System design from week 4 (2×/week) + weekly mock interview.
- **Fundamentals mastery (6–12 months)**: one systems track per month alongside
  steady DSA; system design after Tracks 3–5.
