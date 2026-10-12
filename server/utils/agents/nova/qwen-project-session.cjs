const path = require("node:path");
let adapter;
function getAdapter() {
  if (!process.env.NOVA_CHECKPOINT_ROOT) return null;
  adapter ??= require(
    path.join(process.env.NOVA_CHECKPOINT_ROOT, "src", "anything-adapter.cjs")
  );
  return adapter;
}
exports.prepare = (messages, tools, step, provider, notify) =>
  getAdapter()?.prepare(messages, tools, step, provider, notify) ?? messages;
exports.saveSummary = (provider, summary, archive) =>
  getAdapter()?.saveSummary(provider, summary, archive);
