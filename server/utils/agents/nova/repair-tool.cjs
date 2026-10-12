// Recover a single Qwen XML call only when its tool and arguments match the active tool schema.
const { randomUUID } = require("node:crypto");
const Ajv = require("ajv");
const ajv = new Ajv({ strict: false, allErrors: true });
module.exports = function repair(result, tools = []) {
  if (result.functionCall || typeof result.textResponse !== "string")
    return result;
  const text = result.textResponse;
  if ((text.match(/<tool_call>/g) || []).length !== 1) return result;
  const match = text.match(
    /<tool_call>\s*<function=([\w-]+)>([\s\S]*?)<\/function>\s*<\/tool_call>/
  );
  if (!match) return result;
  const tool = tools.find((t) => (t.name || t.function?.name) === match[1]);
  if (!tool) return result;
  const schema =
    tool.parameters || tool.inputSchema || tool.function?.parameters;
  if (!schema || schema.type !== "object" || !schema.properties) return result;
  const args = {};
  let remainder = match[2];
  for (const p of match[2].matchAll(
    /<parameter=([\w-]+)>([\s\S]*?)<\/parameter>/g
  )) {
    const key = p[1],
      definition = schema.properties[key];
    if (!definition || Object.hasOwn(args, key)) return result;
    let value = p[2].trim();
    if (definition.type && definition.type !== "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return result;
      }
    }
    args[key] = value;
    remainder = remainder.replace(p[0], "");
  }
  if (remainder.trim()) return result;
  try {
    if (!ajv.validate(schema, args)) return result;
  } catch {
    return result;
  }
  if (
    match[1] === "nova-p1000-nova_image" &&
    ["job", "fetch"].includes(args.action) &&
    !/^[a-f0-9-]{36}$/.test(args.jobId || "")
  )
    return result;
  return {
    ...result,
    textResponse: text.replace(match[0], ""),
    functionCall: {
      id: "call_" + randomUUID(),
      name: match[1],
      arguments: args,
    },
  };
};
