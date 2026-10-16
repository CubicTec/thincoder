Run a built-in documentation-discipline check on a project and report its findings.
Read-only and non-gating: it reports, it never blocks, never sets an exit code, and its output is never a reason to refuse a task or a user instruction.

What it checks — exactly two criteria, both driven by the checked project's declarations:
- Anchors — every documentation pointer (a `*.md` token, optionally carrying directory segments, optionally followed by a section
  indicator `§N` / `§N.M` / `§N.M.K`) must resolve: the file must exist on disk (`档缺` when it does not), and when a section
  indicator is given the target file must carry a heading numbered with it (`节缺` when it does not). Line-number coordinates
  (`file.md:12`) are not section references and are not judged as such. Files inside fenced code blocks and executable lines
  (command / pattern code spans) are skipped whole.
- Line width — a line whose character count (CJK counts as 1) exceeds the declared threshold, unless it is a table row, inside a
  fenced code block, an executable line, a quote-block line, or inside an exempt zone.

It cannot: write anything, gate anything, or turn a finding into a refusal.

Arguments — `target` (optional): the project root to check; defaults to the session anchor, relative paths resolve against it.
A workspace target (several projects below it) is reported with the full candidate list — pass the project root you mean.

Routing — use it when you write or revise a project's documents and want the declared discipline checked in one pass. It is not
a reader: use `doc_search` / `read` to read documents and `grep` to search them; this tool only reports discipline findings.
Do not wire it as a gate or CI step, and do not treat a finding as a reason to refuse an instruction — a machine check never
outranks a user instruction.

Side effects and permissions — none. The tool is read-only: no writes, no approval prompt, safe to run in parallel with other calls.

Parameter source and failure shape — every parameter comes from `<target>/PROJECT-MANIFEST.json` `checkConfig` (`scanDirs` /
`lineWidth` / `widthExemptZones` / `anchors.exclude`); no repository path is hard-coded, so another project runs it with its own
declarations. Changing those declarations changes the behavior. A missing or unreadable manifest is surfaced as an error line
naming the file — the check never fabricates a result.

Consistency — the checks and this description are one core implementation: every end that loads the core tool registry gets the
same semantics.
