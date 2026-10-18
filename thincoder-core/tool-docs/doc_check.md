Run a built-in documentation-discipline check on a project and report its findings.
Read-only. In the default `report` mode it is non-gating: it reports, it never blocks, never sets an exit code, and its output is never a reason to refuse a task or a user instruction.

What it checks — exactly two criteria, both driven by the checked project's declarations:
- Anchors — every documentation pointer (a `*.md` token, optionally carrying directory segments, optionally followed by a section
  indicator `§N` / `§N.M` / `§N.M.K`) must resolve: the file must exist on disk (`档缺` when it does not), and when a section
  indicator is given the target file must carry a heading numbered with it (`节缺` when it does not). Line-number coordinates
  (`file.md:12`) are not section references and are not judged as such. Files inside fenced code blocks and executable lines
  (command / pattern code spans) are skipped whole.
- Line width — a line whose character count (CJK counts as 1) exceeds the declared threshold, unless it is a table row, inside a
  fenced code block, an executable line, a quote-block line, or inside an exempt zone.

It cannot — in `report` mode — write anything, gate anything, or turn a finding into a refusal.

Arguments — `target` (optional): the project root to check; defaults to the session anchor, relative paths resolve against it.
A workspace target (several projects below it) is reported with the full candidate list — pass the project root you mean.
`mode` (optional) — `report` (default: the whole declared domain) or `gate` (the delivery gate below).
`docs` (optional, gate only) — the documents this round touched, as paths relative to the project root or absolute; omitted in
gate mode ⇒ the documents this session wrote. Passing `docs` with `mode: "report"` is refused rather than silently ignored.

Delivery gate — `mode: "gate"`, for the end of a design or development round. Every listed doc is judged **whole**: a
pre-existing dangling pointer or overlong line anywhere in it counts, not only this round's edited lines. The first line is the
machine-readable verdict — `DOC-CHECK GATE: PASS` / `DOC-CHECK GATE: REFUSED（命中 K 条）` / `DOC-CHECK GATE: ERROR（reason）` —
and consumers judge by that prefix; the hits are fixed in the same round and are never booked to the ledger. The gate refuses
**one delivery**, not a user instruction: an explicit user go-ahead is followed, with the hits written into the delivery.
The gate narrows the judged set, not the parse baseline: bare-name pointers still resolve across the whole declared domain, so
judging one doc never turns a pointer into a false `档缺`.
Before running the criteria the gate checks engine-version consistency: the five engine files (`doc-check/index.mjs` /
`doc-check/anchors.mjs` / `doc-check/width.mjs` / `agent-tools/doc-check.mjs` / `tool-docs/doc_check.md`) each have their mtime
compared with this process's start time — newer, or unreadable, ⇒ `DOC-CHECK GATE: ERROR（引擎已更新…）` instead of a PASS,
because a session keeps the engine modules it loaded at startup. `ERROR` is fail-closed (no PASS means not passed): restart the
session and re-run; a missing / unreadable manifest ⇒ fix the declaration surface; a multi-project workspace ⇒ name the project
root, per the stated cause.

Do not wire it as a gate or CI step in `report` mode, and do not treat a finding as a reason to refuse an instruction — a
machine check never outranks a user instruction.

Routing — use it when you write or revise a project's documents and want the declared discipline checked in one pass. It is not
a reader: use `doc_search` / `read` to read documents and `grep` to search them; this tool only reports discipline findings.

Side effects and permissions — none. The tool is read-only: no writes, no approval prompt, safe to run in parallel with other calls.

Parameter source and failure shape — every parameter comes from `<target>/PROJECT-MANIFEST.json` `checkConfig` (`scanDirs` /
`lineWidth` / `widthExemptZones` / `anchors.exclude`); no repository path is hard-coded, so another project runs it with its own
declarations. Changing those declarations changes the behavior. A missing or unreadable manifest is surfaced as an error line
naming the file — the check never fabricates a result; in gate mode it yields the `ERROR` first line instead of a PASS.

Consistency — the checks and this description are one core implementation: every end that loads the core tool registry gets the
same semantics.
