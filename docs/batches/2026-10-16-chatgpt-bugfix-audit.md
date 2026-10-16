# 2026-10-16 ChatGPT integration defect audit

> Follow-up to [the initial implementation](2026-10-15-openai-chatgpt.md).
> Scope: defects in the experimental local OAuth/Responses feature and its existing-provider interactions.
> This is a bounded audit, not evidence that every repository bug has been eliminated.

## Confirmed defects corrected

- Auth: stale login could resurrect a logged-out session; cancellation/init/store races could leave misleading state;
  malformed persisted/discovery/token data and raw host errors needed fail-closed validation and safe public errors.
  Refresh dispatch now rechecks durable intent and shared pause/selection state; unknown rotation cannot replay old tokens.
- Transport: mutable provider bindings could misattribute usage to another account; stateful chains could survive
  endpoint/key/history changes. One immutable request binding now owns transport and outcome attribution.
  Native hosted-tool mirrors, final text suffixes, namespace aliases, duplicate IDs and interrupted callbacks are guarded.
- History: malformed or unacknowledged tool transactions could be reused; failed persistence could appear recovered.
  Journal structure/results/checkpoints and unique fresh outputs are checked before acknowledgment or replay.
  Session/provider changes invalidate complete and partial output; delayed summaries/titles/goal/advisor results cannot
  commit into another history. Context rewrites preserve complete tool batches and reject malformed pairing.
- Selection: deleted, disabled or unbound explicit ChatGPT selections must fail closed instead of using a keyed default.
- CLI: one-shot chat incorrectly required apiKey for OAuth. ACP also rejected OAuth or changed only the provider name
  while retaining old credentials. Cancellation/close remains available after credentials disappear.
  First-run wizard preserves the full saved provider binding and handles terminal EOF without hanging.
- GUI: VS Code/Desktop account status, catalog and action races could accept stale results, show the wrong busy state,
  or overwrite revocation/login outcomes when opening help. Generation/request ownership now guards these paths.
  Restored OAuth sessions are revalidated; shared model menus invalidate stale choices and match provider-specific settings.

The independent follow-up review reproduced three races missed by the initial tests: same-tick provider mutation,
partial output after switching sessions, and cancellation after durable login completion. Each received a focused regression
and a re-review before publication. No real account credentials were used.

## Commit and PR grouping

The original 11-commit stack remains intact. Append reviewable units in this order:

1. Auth lifecycle/store/validation and shared adapter safety; depends on original auth/shared-client and usage-pause fixes.
2. Responses transport/native history/auxiliary ownership; depends on original transport/history fixes and item 1.
3. Explicit OAuth model selection and shared agent readiness; depends on the shared integration.
4. CLI one-shot/ACP/wizard behavior and executable regressions; depends on items 1–3.
5. Shared render-core menu invalidation; independent UI foundation.
6. VS Code host/webview sequencing; depends on auth adapter, selection and shared menu fixes.
7. Desktop main/renderer sequencing and restored-session checks; same dependencies as VS Code.
8. Documentation and verification evidence.

For upstream PRs, include original safety commits 9 (durable usage pauses) and 10 (history boundaries) with their foundations.
Do not cherry-pick UI without its adapter. Reordering or squashing requires rerunning gates at each resulting stack tip.

## Executed verification

Linux, Node 24.19.0, npm 11.9.0. All account/HTTP inference fixtures are synthetic; no real OAuth or paid request.
The CLI executable tests start the actual CJS entry point with temporary HOME/project directories, run real assembly,
codec/SSE and agent loop, and reject unexpected network URLs. They cover successful keyless OAuth, disabled access,
incomplete terminal output and the existing API-key Responses path. Command-module tests also cover TTY/non-TTY branches.

Final package gates: core 166/166, CLI 24/24, VS Code 14/14, Desktop 23/23, render-core 3/3 (230 tests).
CLI/VS Code lint and server syntax passed. Per-commit archive tests avoid allowing later working-tree files to hide dependencies:
auth core124/CLI11; Responses core163; selection core166; CLI24; render-core3; VS Code14; Desktop23, all passing.
The documentation-only final commit changes no executable source. The immutable remote tree is recorded in the local-testing handoff.

The wider historical command still has the same 12 failures as a clean archive of base dbd07a5b (163/175 pass):

```sh
node --test docs/batches/*provider*.test.mjs docs/batches/*responses*.test.mjs \
  docs/batches/*session-carryover*.test.mjs docs/batches/*models-config*.test.mjs
```

The failures are older fixtures/UI payload assumptions, storage/document counters and server static assertions.
The two static checks directly affected by this audit were updated to the new exact secret-resolver consumer list
and unconditional post-restore validation; no new failure names remain. Server local package links must be supplied
separately for this broad command; the existing development link helper only covers the three local clients.

The existing document checker has 25 dangling path anchors, 3 overlong lines and line-count drift on the clean base.
The documented scripts/doc-impact.mjs does not exist there. This audit does not claim unrelated documentation debt is fixed.

## Acceptance still required

Real account eligibility/scope, OAuth/refresh/inference, actual interactive TUI, VS Code/Electron, Windows ACLs,
installed VSIX/platform packages and the core Node 22.13 minimum remain unverified.
A cloud browser smoke attempt was blocked by sandbox socket permissions; it is not a GUI pass.
Synthetic host/component tests are not substitutes for these checks.

Keep the feature experimental and default-off. Existing scope exclusions remain: no OS keychain backend or catalog cache,
no credential migration to remote hosts, no server-native Responses, no automatic crash-result recovery or exactly-once promise.
Missing or corrupt tool journals must not be deleted to bypass a block. No main update, upstream PR or release is part of this audit.
