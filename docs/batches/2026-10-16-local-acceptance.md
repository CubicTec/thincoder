# Local macOS acceptance — 2026-10-16

Candidate: `d0fd37593c46e284f1de02b6a7114a77eeb2cf16`, plus the fixes below.
Environment: macOS arm64, Node 24.18.0, npm 11.16.0, VS Code 1.141.0.
Electron native smoke used embedded Node 24.21.0.

## Defects reproduced and fixed

- VSIX gate expected 51 tool documents, but baseline commit `22849e5b`
  added `ssh.md` as the 52nd document. Updated the count and comments.
  Exact filename and SHA-256 checks remain enabled. The built VSIX passes
  core/render-core inclusion, version, prompt and tool-document assertions.
- A real ChatGPT plan stream delivered a complete `function_call` through
  `response.output_item.done`, then `response.completed` with `output: []`.
  The parser discarded the completed item, producing an empty agent response
  and unnecessary retries. Empty terminal snapshots now use accumulated stream
  items, as already done for omitted snapshots. A completed response and a
  completed tool item are still required before releasing a tool.
  Nonempty terminal snapshots remain authoritative.
- Two focused regressions failed before the parser fix and passed afterward.
  They cover completed tools/opaque replay and refusal of unfinished calls.
  An agent-loop regression verifies exactly one read and one matching result
  in the next request when terminal snapshots omit the streamed output.

The streaming contract reference is the official [Responses event reference](https://developers.openai.com/api/reference/resources/responses/streaming-events).
The empty terminal snapshot above is observed live behavior; no claim is made
that every Responses endpoint omits its terminal output.

## Verified locally

| Gate | Result |
| --- | --- |
| Core suite | 169 passed |
| CLI suite | 24 passed |
| VS Code suite | 14 passed |
| Desktop suite | 23 passed |
| render-core suite | 3 passed |
| CLI and VS Code syntax; server syntax | Passed |
| Source dependency links | All five correct |
| VSIX packaging and unpack verification | Passed after both fixes |
| Real VS Code development host | Extension active; Open Chat command succeeded |
| Electron macOS native smoke | Primary instance, window opened, SQLite and protocol probes passed, boot OK, no errors |

Core loopback tests require native socket access; sandbox-denied runs are not
counted as product failures or passing evidence. Final native core run passed.

## Real CLI account acceptance

Using an isolated HOME and disposable projects:

- Existing Kimi configuration: one-shot text, TUI read-only file tool and
  context continuation after a process restart passed.
- User completed the system-browser ChatGPT grant. Status distinguished
  signed-in/plan-authorized state from inference verification.
- Account catalog returned seven models. Selected returned slug `gpt-6.1-sol`.
- ChatGPT TUI text completed. Same-process status said `last inference completed`.
- After the stream fix, one read of `hello.txt` completed, its result was
  replayed successfully, and the model reported `CHATGPT-READ-OK`.
- Restart restored the completed tool exchange. A no-tool follow-up recalled
  its content correctly without repeating the read.
- Real ChatGPT one-shot returned `CHATGPT-ONESHOT-OK` and exit code 0.
- Automatic tool approval was not enabled. No production project was used.

Local `thincoder` now launches this source checkout through a Node launcher.
The registry installation remains available through `thincoder-release`.
Original provider settings and default model are preserved, with a private
config backup; only the authorized ChatGPT provider was added. This same-machine
ThinCoder registration was moved from the isolated test HOME to normal storage.
No other application's credentials were imported.

## Remaining limits

This is local CLI acceptance, not a published release or complete cross-platform
acceptance. GUI real-account inference, installed VSIX runtime, distributable
Electron acceptance, Windows ACLs, natural/concurrent real token refresh,
intentional second accounts and real quota exhaustion remain unverified.
Do not manufacture refresh storms or quota exhaustion to close those checks.
The follow-up [three-model compatibility batch](2026-10-16-model-compatibility.md)
adds explicit reasoning/image capabilities while retaining the conservative
128000-token context budget and 32000-token output reserve, not server limits.
An isolated VS Code HOME triggered a macOS keychain prompt. Cancel that prompt;
future isolated host launches must use `--use-inmemory-secretstorage`.
No version bump, npm/Marketplace publication, upstream PR or merge was performed.
