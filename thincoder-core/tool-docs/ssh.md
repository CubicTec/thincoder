Open and drive a persistent interactive SSH session (remote login shell) on a host. The session survives across tool calls; password hosts get a credential window — the value never appears in tool args, results, or on disk.

**Route to ssh instead of bash:**
- a one-shot non-interactive command over ssh → `bash` with `ssh host <command>` (cheaper, no session)
- an interactive shell that must survive several calls (network device CLI, interactive prompts) → ssh

Parameters:
- action (required): connect | send | read | secret_input | close | list
- host: connect — target host (IP or name)
- user: connect — login user (optional: your local ssh config decides, else the user recorded for this host locally)
- port: connect — TCP port (optional, default 22)
- label: connect — short human label for this session (optional); secret_input — label for the value being sent
- promptPattern: connect — regex that marks the shell prompt as ready (optional): send/read then settle the moment the prompt appears instead of waiting out the silence window
- id: send / read / secret_input / close — session id from connect (`ssh#N`)
- data: send — text to type into the session (a trailing newline is passed as-is; otherwise Enter is sent as `\r`)
- settle: send — wait for the ready verdict before returning (default true); false returns right after the bytes are written
- timeoutMs: send / read — wait budget override (default 10000; the wait then returns partial output with a readable line)
- maxChars: read — return cap override (default 8000; the full output stays in the session log)

Output:
- every result starts with the session status line: `[ssh (ssh#3) 10.0.0.5 — ready · idle 3s]`
- connect returns the first screen; send returns the round's output plus the ready verdict (silence | prompt matched | timeout); read returns what arrived since the last read

Notes:
- Credential discipline: the password is asked for in a window and reaches ssh only through its child-process environment — never in tool args, never echoed in a result, never written to disk. Any captured output containing that value (or a value given to secret_input) is scrubbed from the returned text and from the session log.
- secret_input is for device prompts (enable password, sudo, key passphrases): it opens the same kind of window, writes the value plus Enter, and returns only the output — the value is never shown.
- Sessions: at most 4 live at once (a connect beyond the cap is refused — close one first). A session idle for 600s with no send/read is closed automatically. `close` ends it (stdin EOF → 1.5s grace → the process tree is killed). Ctrl+I (interrupt) does not kill sessions; a user Stop does.
- Output is capped per return (8000 chars, tail kept); the full stream is always in the session log whose path connect returns.
- Not for full-screen terminal UIs (vim/top/screen): output is read as a text stream — paged output such as `--More--` is shown as-is, not driven for you.
- Host keys follow your local ssh config — the tool never rewrites known_hosts. A changed or untrusted key stops the connect with a readable error before any credential is asked for.
- read / list are read-only (no approval prompt); connect / send / secret_input / close pass the approval gate like any side-effecting tool, and secret_input shows a masked placeholder — the value itself is never in the approval text.
- Not for file transfer or port forwarding — run `scp` / `sftp` / `ssh -L` through bash.

Availability: where the end has no UI to collect a credential (headless / ACP), connecting to a password host fails with a readable error — use keys or an ssh-agent there.
