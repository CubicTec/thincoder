# Three-model ChatGPT compatibility — 2026-10-16

> 后续状态：下文保留首轮兼容测试的实测记录。保守容量策略已由
> [账户规格自动配置](2026-10-16-account-model-info.md) 取代；当前实现按账号目录自动读取窗口和能力。

Scope: local CLI on macOS arm64, Node 24.18.0, using the user's authorized
ThinCoder ChatGPT account. This follows the [local acceptance batch](2026-10-16-local-acceptance.md).
The reported unknown-spec warning was reproduced for `gpt-6-astra`.

## Fix and capacity policy

Added explicit `gpt-6-astra`, `gpt-6.1-sol` and `gpt-6-luna` capability rows.
Before this change, unknown-model fallback blocked `read_image` and offered no
supported reasoning-effort choices, despite the account catalog listing these models.
All three now expose image input and `low`, `medium`, `high`, `xhigh`, `max`.
The shared subset is supported by the official model descriptions
([Astra](https://developers.openai.com/api/docs/models/gpt-6-astra),
[6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol),
[Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)) and the live checks below.

The existing local context budget of 128000 tokens and output reserve of 32000
remain conservative. `budgetSource: "conservative"` makes the CLI describe them
as local budgets, not server limits. Its existing binary K formatter shows
125K / 31K. A configured context override still takes precedence.
ChatGPT requests do not send `max_output_tokens`.

This account's catalog reported context windows of 272000 for Astra and Luna,
and 500000 for 6.1 Sol. These are catalog observations, not tested capacity
boundaries or values assumed for every account/provider. API capacity metadata
is not substituted for the subscription catalog. Account-specific `ultra`
and API-only `none` are not exposed by these shared rows; `/think off` is
rejected instead of claiming that reasoning was disabled.

## Real CLI checks

Each model used an isolated HOME and project. The production AuthService read
the same-machine ThinCoder credential store; tokens were not copied into test
configuration. Automatic tool approval was not enabled.

| Model | One-shot text | One file read + response | Restart restores history | Recall without another tool |
| --- | --- | --- | --- | --- |
| `gpt-6-astra` | Pass | Pass | Pass | Pass |
| `gpt-6.1-sol` | Pass | Pass | Pass | Pass |
| `gpt-6-luna` | Pass | Pass | Pass | Pass |

Each model made exactly four inference requests, all HTTP 200, and exited with
code 0. Each session contained one `read` call and one matching tool result;
the restart follow-up recalled the file marker without repeating the read.
An Astra PTY-close race in the test harness occurred after a successful exit;
only its remaining restart request was run after correcting the harness.

A separate TUI check selected Astra, showed the local-budget explanation with
no unknown-spec warning, accepted `medium`, rejected `off`, and exited with
code 0 without issuing any inference request.

## Reasoning and image probes

All fifteen model/effort combinations completed through the production
Responses transport with the expected text and no tool calls. This verifies
parameter acceptance, not comparative reasoning quality or performance.

The initial 64×32 red/blue PNG was accepted by all three models, but all three
gave incorrect color answers. Those failed assertions remain in the evidence.
A fresh 768×384 fixture with the same two colors passed on all three models.
The `read_image` output was converted through the production request codec;
the decoded request image bytes exactly matched the fixture SHA-256
`a0522ad2ed58590df382ecde64e3c17c74c98937b937ccf11467c0523c27c5b5`.
The larger probe supports image transport compatibility; it does not establish
reliable recognition of very small images or the exact cause of the small-image errors.

The actual CLI agent loop also passed for each model using the larger fixture:
exactly one `read_image` call, one successful matching result, and the correct
left/right colors. Each case made two HTTP 200 requests and exited with code 0.
The prompt contained only the image path and color-identification question,
not the expected answer. This ran in fresh isolated sessions with default
read-only tool permissions and no automatic approval setting.

## Automated regression and local use

Three new regression cases fail on the old missing capabilities and pass with
the new rows. They check `read_image` tool exposure, effort normalization and
request encoding, refusal of unsupported off/none, conservative budget metadata,
and preservation of the configured context override.

| Gate | Result |
| --- | --- |
| Core suite | 172 passed |
| CLI suite | 24 passed |
| VS Code suite | 14 passed |
| Desktop suite | 23 passed |
| CLI syntax | 135 files passed |

The existing local `thincoder` launcher points at this source checkout; no
reinstall or version bump is required. A running TUI must exit and restart to
load changed modules. User provider/default settings and credentials are preserved.

Private local evidence is under `../model-compat/` relative to the repository:
`summary.json`, `environment.json`, `ui-settings-result.json`, `catalog.json`,
`capability-results.json`, `image-results.json`, `image-cli-results.json` and package test logs.
`live_matrix.py`, `image_cli.py`, `capability-probe.mjs`, and `image-probe.mjs` record the actual
commands and assertions; real-account probes consume quota and are not part of
`npm test`. No credentials, private account identifiers or conversation history
are committed to this repository.

The user's `config.json` SHA-256 remained unchanged throughout this batch.
The repository's referenced `scripts/doc-impact.mjs` is absent in the baseline;
the directly affected model-specification design and acceptance notes were updated.

Long-context limits, maximum output, `ultra`, account quota exhaustion and the
previous batch's remaining GUI/platform acceptance are not covered by this batch.
No npm/Marketplace publication, upstream PR or merge was performed.
