import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { registerRequirementTools } from "./src/tools/index.js";
import { createAgentInstructionsBuilder } from "./src/agent-instructions.js";
export default definePluginEntry({
    id: "personal-requirement",
    name: "SRE AI · 个人需求登记",
    description: "SRE AI 化组织：伙伴个人需求登记插件。识别团队、建表、预览、写入一条龙。",
    register: (api) => {
        // 1. 注册 3 个 MCP tool
        registerRequirementTools(api);
        // 2. 自动注入 agent system prompt 指令（装完即生效，零 md 改动）
        //    仅当至少有一个本插件 tool 可用时才注入，避免污染无关 agent。
        api.registerMemoryPromptSupplement(createAgentInstructionsBuilder());
    },
});
//# sourceMappingURL=index.js.map