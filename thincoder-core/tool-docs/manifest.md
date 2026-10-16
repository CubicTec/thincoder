Read, initialize, or point-edit the project manifest (PROJECT-MANIFEST.json) — the project-level state file (phase / docRoot / checkConfig / codePaths / index / advisor). Attached to the main agent only; subagents can neither see nor write it.

Actions:
- read [target] — report the manifest state with a stable anchor `state=ok|missing|invalid|workspace|no-project`. The ok state prints the manifest JSON plus missingKeys / unknownKeys / errors rows (only when non-empty). Never throws — a missing manifest is reported, not refused.
- init [target] — create the default manifest where the project root resolves (the target itself when no project is discoverable). Refused when a manifest already exists — init never overwrites.
- write <key> <value> [target] — point-edit one node: read the current manifest, set the node, write it back through the writer gate. The resulting manifest must pass validation (a fault is refused with the disk byte-for-byte unchanged); a missing manifest is refused — run init first (write never creates one).

target — explicit target directory; defaults to the session anchor, relative paths resolve against it. A workspace target (several projects below it) is reported by `read` and refused by `init` / `write` — with the facts, the full candidate list and a next step: name the project root you mean and pass it as target.

key — dot path into the manifest, one of the writable nodes: version / phase / promptsLanding / codePaths, or a sub-key of docRoot / checkConfig / index / advisor (e.g. docRoot.design / index.publicRepos / advisor.docMap). Whole-object writes of those four families are refused, as is any key outside the set (spelling protection).

value — parsed as JSON first (null / true / 5 / ["a","b"]), falling back to a literal string (docs/design). The string "null" is the explicit "no such face" for docRoot.<key>: a legal value, not a deletion.

Refusals throw `manifest <action>: refused — …` and leave the disk unchanged. The written file is picked up by the session's project-state line on the next turn (mtime-gated) — the tool never touches in-memory state.

read is read-only (planMode passes, no approval); init / write are side effects (approval gate). Writes go through writeManifest / initManifest with writer "main" — the fail-closed subagent default is never used.

Key catalog — the writable nodes: what each is; when to change it; wrong ⇒ consequence.
- `version` — schema version (a number); change on file migration; wrong ⇒ validation refuses (disk unchanged).
- `phase` — project stage, `initial-dev` / `production`; change when the stage is crossed; wrong ⇒ validation refuses.
- `promptsLanding` — declared prompt-landing directory; change when it moves; no failure consequence (no shape check, no in-core reader — a registration face).
- `codePaths` — path segment names (replaces the default `["src"]`); change when the layout moves; wrong ⇒ no segment is classified (the fallback still runs).
- `docRoot.requirements` · `docRoot.specs` · `docRoot.design` · `docRoot.modules` · `docRoot.batches` — each doc-layer root path (a string | a multi-root array | `null` = absent); change when a layer moves root; wrong ⇒ validation refuses, or checks / batch landing / review roots point elsewhere.
- `checkConfig.scanDirs` · `checkConfig.lineWidth` · `checkConfig.widthExemptZones` · `checkConfig.anchors` · `checkConfig.exemptions` — machine-check settings (scan dirs / width / exempt zones / anchors / exemptions); change when the check scope changes; wrong ⇒ checks run on a wrong scope silently (missed scans / wrong width / dead exemptions).
- `index.codeExtensions` · `index.docExtensions` — extra code / doc extensions (unioned, add-only); change when a file type is missing from the index; wrong ⇒ that type stays out of the index (extras harmless; a missing entry = a miss).
- `index.excludePaths` — project-root-relative path prefixes (for the index); change to keep a directory out of the index; wrong ⇒ that directory is still indexed, or another is wrongly excluded.
- `index.publicRepos` — public-repo paths (resolvable from this repo root); change when wiring a public repo into the index or cross-repo refs; wrong ⇒ that repo is unreachable for retrieval (empty origin set / wrong path).
- `advisor.docMap` · `advisor.standardsDoc` — review pointers (map file / single standards doc; empty = not declared); change when the review injection face changes; wrong ⇒ review injection lands nothing (an unreadable doc ⇒ review with no doc).
