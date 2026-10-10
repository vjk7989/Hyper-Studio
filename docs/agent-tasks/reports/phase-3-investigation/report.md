# Phase 3 OpenCode test investigation

## Commands run

| Command | Exit | Result |
| --- | ---: | --- |
| `scripts/run-opencode-local.ps1 models` | 0 | Local model catalog loaded. |
| `scripts/run-opencode-local.ps1 run --standalone --agent plan --model openai/gpt-5.6-luna …` | 1 | Authentication rejected before the agent ran a tool. See `opencode-full.log` (credential fragment redacted). |
| `scripts/run-opencode-local.ps1 run --standalone --agent plan --model openrouter/openai/gpt-4.1-mini …` | 1 | OpenRouter refused the minimal probe because the account could not afford the model's default 32,768-token request. See `openrouter-probe.log`. |
| `scripts/run-opencode-local.ps1 run --standalone --agent plan --model anthropic/claude-haiku-4-5 …` | 1 | Anthropic rejected the inherited credential (`invalid x-api-key`). See `anthropic-probe.log`. |

The five requested test/build commands were **not attempted**. The OpenAI and Anthropic credentials were rejected; the single OpenRouter probe failed for insufficient credits. All three sessions stopped before the agent ran a tool. No further model or credential was tried.

## Pass/fail counts

No tests ran. Pass: 0; fail: 0; skipped due to authentication: 5 commands.

## Failing tests

None; test execution did not begin.

## Root cause

The inherited OpenAI API credential was rejected by the provider. The OpenRouter probe reached a credit-limit response for a default 32,768-token request. The final Anthropic probe returned `invalid x-api-key`. Each OpenCode session exited 1 before executing a repository command.

## Changed files (expected: none)

No source edits are attributable to OpenCode. `git status --short` was identical before and after all three runs; snapshots are saved alongside this report. OpenCode's debug paths all resolve under `G:\Hyper-Studio\Hyper-Studio\.tools\opencode`. The observed local writes were its database, WAL, and log files there. Report and diagnostic logs were written under this report directory by the Codex runner.

## Remaining risks

The requested Phase 3 test, typecheck, build, backend, and workflow checks remain unverified by OpenCode. The local path inspection does not constitute a system-wide filesystem trace.
