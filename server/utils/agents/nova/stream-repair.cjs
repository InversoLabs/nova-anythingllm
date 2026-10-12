const repair = require("./repair-tool.cjs");
module.exports = async function (run, emit, tools) {
  let pending = "",
    capturing = false,
    last = null;
  const send = (content) => {
    if (content) emit?.("reportStreamEvent", { ...last, content });
  };
  const filtered = (event, data) => {
    if (
      event !== "reportStreamEvent" ||
      data?.type !== "textResponseChunk" ||
      typeof data.content !== "string"
    )
      return emit?.(event, data);
    last = data;
    pending += data.content;
    if (capturing) return;
    const index = pending.indexOf("<tool_call>");
    if (index >= 0) {
      send(pending.slice(0, index));
      pending = pending.slice(index);
      capturing = true;
      return;
    }
    if (pending.length > 11) {
      send(pending.slice(0, -11));
      pending = pending.slice(-11);
    }
  };
  const result = repair(await run(filtered), tools);
  if (capturing && !result.functionCall && tools.length === 0) {
    const message =
      "The tool-call limit for this turn was reached. Send Continue to resume the task.";
    pending = message;
    result.textResponse = message;
    capturing = false;
  }
  if (capturing && result.functionCall)
    pending = pending.replace(
      /<tool_call>\s*<function=[\w-]+>[\s\S]*?<\/function>\s*<\/tool_call>/,
      ""
    );
  send(pending);
  return result;
};
