const compactor = require("./tool-session-compactor.cjs");
const scoped = (p) =>
  process.env.NOVA_QWEN_BETA === "true" &&
  p?.model === (process.env.NOVA_QWEN_MODEL_ALIAS || "qwen27-mtp");
exports.prepare = async (messages, tools, step, provider, notify) => {
  if (scoped(provider))
    return compactor.compact(messages, tools, step, provider, notify);
  delete provider.novaProject;
  delete provider.novaProjectLimit;
  if (provider.novaOutputCeiling != null) {
    provider.maxTokens = provider.novaOutputCeiling;
    delete provider.novaOutputCeiling;
  }
  return messages;
};
exports.stream = (provider, run, emit, tools) =>
  scoped(provider)
    ? require("./stream-repair.cjs")(run, emit, tools)
    : run(emit);
exports.complete = (provider, result, tools) =>
  scoped(provider) ? require("./repair-tool.cjs")(result, tools) : result;
