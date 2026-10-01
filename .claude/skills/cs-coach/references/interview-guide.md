# Interview guide (topic & coding interviews)

## Question ladder (use after teaching a topic)
Escalate one rung at a time; stop climbing when the user struggles twice.

1. **Recall** — "What is X?" / "Define X in one sentence."
2. **Explain** — "Explain X to a junior engineer. Why does it exist?"
3. **Apply** — "Use X to solve this small problem."
4. **Analyze** — "What's the time/space cost? What breaks at scale?"
5. **Compare** — "X vs Y — when would you pick each?"
6. **Edge cases / failure** — "What happens when … (empty input, concurrent
   writers, node crashes, cache is cold)?"
7. **Design / extend** — "How would you modify X to support …?"

Example for hash tables: define → why O(1) average → implement get/put with
chaining → what happens as load factor grows → hash table vs balanced BST →
adversarial keys / resizing pauses → design a concurrent hash map.

## Topic interview format (15–20 min)
- 5–8 questions from the ladder, mixed with one "debug this" or
  "predict the output" snippet.
- Follow-up on vague answers: "Can you be more precise?", "Why?", "What would
  you measure?"
- Score each answer 0–2 (0 wrong/missing, 1 partially correct, 2 precise and
  complete). Convert to 0–5 for the progress file.

## Coding interview format (45 min)
Play the interviewer. Pick a problem at the user's current level (or the
requested company style). Do not reveal the pattern.

1. **Problem statement (2 min)** — give it slightly under-specified.
2. **Clarify (3–5 min)** — answer questions; note whether they asked about
   input size, constraints, edge cases.
3. **Approach (5–10 min)** — expect brute force first, then optimization.
   Ask for complexity before coding.
4. **Code (15–20 min)** — user writes code in the chat. Do not fix it for them.
   Allow up to 2 escalating hints (nudge → direction → near-solution); each hint
   lowers the problem-solving score.
5. **Test (5 min)** — ask them to dry-run an example and edge cases.
6. **Follow-up (5 min)** — variant or scale-up question.

### Coding rubric (1–4 each)
| Dimension | 1 | 4 |
|-----------|---|---|
| Problem solving | needed full solution | found optimal independently |
| Communication | silent / unclear | narrated reasoning, checked assumptions |
| Code quality | buggy, messy | correct, clean, idiomatic |
| Testing | none | proactive edge cases, found own bugs |
| Complexity | wrong / missing | correct time and space, justified |

Signal: avg ≥ 3.5 strong hire · 3–3.4 hire · 2.5–2.9 lean no · < 2.5 no hire.

## Feedback format (after any interview)
```
## Result: <score> — <signal> for <level>
**What went well:** 2–3 specific points
**What hurt you:** 2–3 specific points, each with what a strong candidate says
**Model answer:** for the weakest part
**Drill next:** 1–3 concrete exercises
```

## Behavioral add-on (optional)
If requested, run STAR-format behavioral questions (conflict, failure,
ownership, ambiguity, influencing without authority). Score on specificity,
personal impact ("I" not "we"), measurable results, and reflection.
