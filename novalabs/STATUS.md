# Beta source status

Prepared October 12, 2026. Based on upstream `Mintplex-Labs/anything-llm` commit `ce48dbaa95d9462d7da096345f8ef2524fbb50b5`.

Ports the installed desktop pilot's layout, branding, group controls, and Qwen harness into public upstream source. It is not a redistribution of the installed Electron app. Native desktop packaging/startup animation is not in this public tree; the frontend includes its own animated full-screen NOVA loader.

Isolated source tests and JSX/backend parsing are validated locally. Full application build/deployment and broader model coverage remain beta work. Local disk limits prevented installing the full upstream dependency tree during publication; no successful full build is claimed.

Checkpoint service is a separate MIT project. Private state, conversations, keys, API secrets, LAN routes, generated projects, and model weights are excluded.

Hosted CI is not enabled. novalabs/github-actions-template.yml is the tested-suite configuration template; activating it requires GitHub workflow permission.

