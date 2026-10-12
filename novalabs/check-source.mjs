import { transform } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "frontend/src/LogoContext.jsx",
  "frontend/src/components/Preloader.jsx",
  "frontend/src/components/WorkspaceChat/ChatContainer/index.jsx",
  "frontend/src/components/WorkspaceChat/ChatContainer/PromptInput/index.jsx",
  "frontend/src/components/WorkspaceChat/ChatContainer/PromptInput/ToolsMenu/Tabs/AgentSkills/index.jsx",
  "frontend/src/components/WorkspaceChat/ChatContainer/PromptInput/ToolsMenu/Tabs/AgentSkills/SkillSection/index.jsx",
];
async function main() {
  for (const file of files) {
    await transform(fs.readFileSync(path.join(root, file), "utf8"), {
      loader: "jsx",
      jsx: "automatic",
    });
    console.log("JSX parsed: " + file);
  }
  for (const file of [
    "server/utils/agents/aibitat/index.js",
    "server/utils/agents/aibitat/providers/genericOpenAi.js",
  ])
    await transform(fs.readFileSync(path.join(root, file), "utf8"), {
      loader: "js",
    });
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
