import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import {
  readGroup,
  toggleGroup,
} from "../../frontend/src/components/WorkspaceChat/ChatContainer/PromptInput/ToolsMenu/Tabs/AgentSkills/groupToggle.mjs";
const require = createRequire(import.meta.url);
process.env.NOVA_TRANSCRIPT_DIR = fs.mkdtempSync(
  path.join(os.tmpdir(), "nova-transcript-")
);
const c = require("../../server/utils/agents/nova/tool-session-compactor.cjs");
test("Group disable/restore keeps mixed choices, uses every item and survives reloading", async () => {
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k),
      setItem: (k, v) => values.set(k, v),
    };
  const state = { a: true, b: false, c: true };
  const getItems = () =>
    Object.entries(state).map(([id, enabled]) => ({
      id,
      enabled,
      onToggle: async () => {
        state[id] = !state[id];
      },
    }));
  await toggleGroup({ storage, key: "group", getItems });
  assert.deepEqual(state, { a: false, b: false, c: false });
  assert.equal(readGroup(storage, "group").disabled, true);
  await toggleGroup({ storage, key: "group", getItems });
  assert.deepEqual(state, { a: true, b: false, c: true });
  assert.equal(readGroup(storage, "group").disabled, false);
});
test("Failed group update preserves the restore snapshot", async () => {
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k),
      setItem: (k, v) => values.set(k, v),
    };
  await assert.rejects(
    toggleGroup({
      storage,
      key: "group",
      getItems: () => [
        {
          id: "a",
          enabled: true,
          onToggle: async () => {
            throw Error("API down");
          },
        },
      ],
    })
  );
  assert.equal(readGroup(storage, "group").selection.a, true);
  assert.equal(readGroup(storage, "group").disabled, true);
});
test("Normal models bypass the opt-in runtime", async () => {
  process.env.NOVA_QWEN_BETA = "true";
  const runtime = require("../../server/utils/agents/nova/runtime.cjs");
  const m = [{ role: "user", content: "Hello" }];
  assert.strictEqual(await runtime.prepare(m, [], 0, { model: "gemma" }), m);
  delete process.env.NOVA_QWEN_BETA;
  assert.strictEqual(
    await runtime.prepare(m, [], 0, { model: "qwen27-mtp" }),
    m
  );
});
test("Compaction preserves task, recent results and serializes circular tool schemas safely", async () => {
  const client = {};
  client.completions = { _client: client };
  const tool = {
    name: "read",
    parameters: { type: "object", properties: { path: { type: "string" } } },
    super: { client },
  };
  const m = [
    { role: "system", content: "Rules" },
    { role: "user", content: "Continue example project" },
  ];
  for (let i = 0; i < 20; i++)
    m.push(
      { role: "assistant", content: "Read" },
      { role: "function", name: "read", content: "x".repeat(3000) }
    );
  const provider = {
    maxTokens: 8192,
    countContext: async (x, t) => c.estimate(x, t),
    complete: async () => ({
      textResponse: "CURRENT STEP\nFiles inspected\nNEXT ACTION\nRun tests",
    }),
  };
  const out = await c.compact(m, [tool], 20, provider);
  assert(out.length < m.length);
  assert.equal(out[0], m[0]);
  assert.equal(out[1], m[1]);
  assert.equal(out.at(-1), m.at(-1));
  const file = out[2].content.match(/Full prior transcript: ([^\n]+)/)[1];
  const saved = JSON.parse(fs.readFileSync(file));
  assert.equal(saved.tools[0].name, "read");
  assert(!saved.tools[0].super);
});
test("Malformed and unregistered XML is not promoted to a tool call", () => {
  const repair = require("../../server/utils/agents/nova/repair-tool.cjs");
  const tools = [
    {
      name: "read",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  ];
  const xml =
    "<tool_call><function=read><parameter=path>example.txt</parameter></function></tool_call>";
  assert.equal(
    repair({ textResponse: xml }, tools).functionCall.arguments.path,
    "example.txt"
  );
  assert(!repair({ textResponse: xml }, []).functionCall);
  assert(!repair({ textResponse: xml + xml }, tools).functionCall);
  assert(
    !repair(
      { textResponse: xml.replace("parameter=path", "parameter=unknown") },
      tools
    ).functionCall
  );
});
test("Stream recovery preserves reasoning and hides repaired XML across chunk boundaries", async () => {
  const stream = require("../../server/utils/agents/nova/stream-repair.cjs");
  const tools = [
    {
      name: "read",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  ];
  const xml =
    "<tool_call><function=read><parameter=path>example.txt</parameter></function></tool_call>";
  let shown = "";
  const result = await stream(
    async (cb) => {
      for (let i = 0; i < xml.length; i += 3)
        cb("reportStreamEvent", {
          type: "textResponseChunk",
          content: xml.slice(i, i + 3),
        });
      return { textResponse: xml };
    },
    (_, d) => (shown += d.content),
    tools
  );
  assert(result.functionCall);
  assert.equal(shown, "");
  await stream(
    async (cb) => {
      cb("reportStreamEvent", {
        type: "textResponseChunk",
        content: "Reasoning stays enabled.",
      });
      return { textResponse: "Reasoning stays enabled." };
    },
    (_, d) => (shown += d.content),
    tools
  );
  assert.equal(shown, "Reasoning stays enabled.");
});
