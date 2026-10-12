<p align="center"><img src="frontend/src/media/nova/nova-wordmark.svg" width="280" alt="NOVA by Inverso Labs"></p>

# NOVA — AnythingLLM Beta

**An experimental local-agent workbench from Inverso Labs, built on AnythingLLM.** Focused on readable long tool sessions, resumable projects, and a tested Qwen 27B harness configuration.

Public source fork of [Mintplex Labs' AnythingLLM](https://github.com/Mintplex-Labs/anything-llm), under its MIT license. Upstream authorship and copyright are preserved. NOVA is independent and is not an official AnythingLLM release or endorsed by Mintplex Labs.

**Beta 0.1 is a source release, not a packaged desktop installer.** Upstream provider, document, workspace, agent, and MCP features remain available. Read the preserved [upstream README](README.upstream.md), [bare-metal guide](BARE_METAL.md), and upstream security documentation for the underlying application.

## NOVA additions

| Area | Change |
| --- | --- |
| Chat layout | Composer stays in the chat pane at narrow widths. Its height and viewport offset reserve space below messages. Long reasoning/tool labels wrap. |
| Tool groups | A group checkbox disables its tools and remembers individual choices for restoration, including items hidden by search. Interrupted updates retain the restore snapshot and show an error. |
| Branding | NOVA / Inverso Labs wordmarks, symbol, favicon, and animated filling logo in the full-screen loader. Custom instance logos can override defaults. |
| Project memory | Optional [Project Checkpoint MCP](https://github.com/InversoLabs/project-checkpoint-mcp) integration attaches a compact handoff, captures bounded tool results, and saves compaction summaries. |
| Qwen context | Opt-in 32K guard counts formatted prompts and schemas through llama.cpp, summarizing older results while preserving the task and recent exchanges. |
| Tool recovery | Opt-in Generic OpenAI handling converts a single Qwen XML call only when its name and arguments match an active schema. Native calls pass through; reasoning stays enabled. |

The overlapping JSON project registry and tool-filtering helper are retired. Durable state belongs to the standalone service.

## Tested Qwen profile

Our installed desktop pilot used **Qwen 27B GSQ-RCO IQ3_XXS with MTP**, alias `qwen27-mtp`, served by llama.cpp with **32,768 context**. Filename: `Qwen3.8-27B-GSQ-RCO-IQ3_XXS-mtp.gguf`. One RTX 3060 12 GB was used in the accepted inference configuration. This repository does not reproduce or promise a particular GPU allocation or tokens-per-second result.

These are **harness improvements**, not new weights, training, quantization, CUDA kernels, or GPU speed optimizations. No weights are distributed. MTP is configured in your llama.cpp launch, not enabled by this fork.

Compaction starts at **28,000 counted input tokens**, uses a 1,536-token summary budget, reserves 512 tokens beyond requested output, and rejects unsafe oversized requests. It enforces at most 24K after summarization. Registered project sessions use a bounded 120-call budget with a handoff warning near the end; this is not unlimited autonomous execution.

Compaction is gated by the configured alias/endpoint and a live Qwen 27B path with 32K context. It **does not pin or verify the exact quant filename**. The profile above is what was tested; other quants, context lengths, GPUs, and models need independent validation. Other models bypass NOVA-specific context and XML handling. Ordinary non-agent chat is outside these hooks.

## Getting started

```sh
git clone https://github.com/InversoLabs/nova-anythingllm.git
cd nova-anythingllm
```

Follow [BARE_METAL.md](BARE_METAL.md) or the [upstream setup instructions](README.upstream.md) to install the separate server, collector, and frontend packages. Existing Docker files are retained, but a full Docker/desktop release has not been validated for this fork.

Run the small NOVA checks without installing the entire application:

```sh
npm ci --prefix novalabs
# Linux/macOS:
NODE_PATH="$PWD/novalabs/node_modules" npm test --prefix novalabs
npm run check --prefix novalabs
```

PowerShell:

```powershell
$env:NODE_PATH = Join-Path (Get-Location) 'novalabs/node_modules'
npm test --prefix novalabs
npm run check --prefix novalabs
```

The check script parses changed JSX/backend source; it is not a complete application build. Build the frontend and complete upstream server/database setup before deployment. Node 24 was used for our NOVA tests. The external checkpoint service requires Node 22.13+ with SQLite support.

## Enable Qwen beta hooks

Inference hooks are disabled until explicitly enabled. Start llama.cpp separately with the model and a native tool-compatible template. Configure AnythingLLM's Generic OpenAI provider to that service. Example server environment:

```dotenv
NOVA_QWEN_BETA=true
NOVA_QWEN_MODEL_ALIAS=qwen27-mtp
NOVA_LLAMA_BASE_URL=http://127.0.0.1:8080
NOVA_OPENAI_BASE_URL=http://127.0.0.1:8080/v1
NOVA_CHECKPOINT_ROOT=/absolute/path/project-checkpoint-mcp
NOVA_CHECKPOINT_DB=/absolute/path/private/checkpoints.db
NOVA_CHECKPOINT_NODE=/absolute/path/node
NOVA_TRANSCRIPT_DIR=/absolute/path/private/nova-transcripts
```

`NOVA_OPENAI_BASE_URL` must match the actual Generic OpenAI client URL. Token counting requires HTTP access to llama.cpp `/props`, `/apply-template`, and `/tokenize`. Keep inference private; this example provides no authentication, SSH tunnel, or remote-machine setup.

Install the checkpoint repository with `npm ci` and register its five tools as a stdio MCP server in AnythingLLM, pointing to `src/server.cjs` and the same private database. See its [setup guide](https://github.com/InversoLabs/project-checkpoint-mcp#install). Without `NOVA_CHECKPOINT_ROOT`, the context guard can run without durable project integration. Restart your self-hosted server after changing environment settings.

For project tasks, ask the model to list/create or resume a checkpoint and save milestones:

> Resume project `my-project` using projects_resume. Follow its nextAction, preserve files, verify stale results, and save remaining work before stopping. Do not restart discovery.

Checkpoint text and tool/browser results are fallible data. They never override the user or authorize publishing, execution, messaging, or secret access.

## Validation and known limits

- Standalone checkpoint service: eight tests for persistence, conflicts, paths/provenance, transport, bounded evidence, and the adapter.
- Installed desktop Qwen pilot: validation module on an isolated real-site copy, resumed implementation, seven passing Node tests, and independent headless browser acceptance.
- One long run timed out after compaction before saving its final checkpoint. An explicit recovery action and a fresh session completed it. Saved state survives; unsent intentions do not.
- Public source port: isolated tests for group restoration/failure, opt-in scope, circular schema serialization, compaction preservation, XML gating, and streaming. Full desktop binary and end-to-end self-hosted deployment remain unverified.
- The installed pilot included compiled Electron patches and separate machine plugins. Its binaries, private configs, connection details, and deployment scripts are not included. This source port is based on the upstream commit in [novalabs/STATUS.md](novalabs/STATUS.md), not a byte-for-byte installation copy.
- Group snapshots are browser-local, not account-synchronized. API failure can leave a partly disabled group; retrying restores saved choices. Upstream permissions still apply.
- MCP cannot force tool use, truthful claims, or saving progress. Inspect actual evidence and files.

## Privacy, contributions, and license

No private databases, conversations, project snapshots, credentials, weights, or machine settings are published. Keep checkpoints/transcripts outside public repositories. Redaction is best effort; never submit secrets.

Issues and pull requests are welcome with synthetic reproductions and sanitized logs. See [NOVA contribution notes](novalabs/CONTRIBUTING.md), upstream [SECURITY.md](SECURITY.md), and [TERMS_SELF_HOSTED.md](TERMS_SELF_HOSTED.md).

MIT license with upstream copyright retained in [LICENSE](LICENSE). NOVA additions copyright 2026 Inverso Labs. Model/dependency licenses are separate; trademarks belong to their owners.
