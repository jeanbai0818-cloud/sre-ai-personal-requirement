/**
 * Agent instructions supplement for personal-requirement plugin.
 *
 * 这段内容会在插件加载后、每次生成 agent system prompt 时，
 * 通过 api.registerMemoryPromptSupplement() 自动注入到 agent 的上下文里。
 *
 * 不需要任何 agent 手动改自己的 AGENTS.md。
 *
 * 注入条件：至少有一个本插件的 tool（requirement_bootstrap / requirement_preview
 * / requirement_record）在当前 agent 可用。全都不可用时不注入（避免无关 agent 被污染）。
 */
/** 本插件注册的 3 个 tool 名字，用于 availableTools 判断。 */
const PLUGIN_TOOL_NAMES = new Set([
    "requirement_bootstrap",
    "requirement_preview",
    "requirement_record",
]);
/**
 * 返回 agent 指令正文。仅当至少有一个本插件 tool 可用时注入。
 *
 * 内容组织原则：
 * - 5 大块：触发场景 / 工作流程 / 反问上限 / 前台话术 / 红线
 * - 每块尽量精炼，避免 system prompt 膨胀
 * - 只讲"什么时候调 / 怎么调 / 不要怎么调"，不讲实现细节
 * - 对话约束（人话 vs API 细节）优先级最高，放前面
 */
export function createAgentInstructionsBuilder() {
    return ({ availableTools }) => {
        // 条件注入：本插件 tool 至少 1 个可用才注入
        if (!hasAnyPluginTool(availableTools)) {
            return [];
        }
        return [
            "## 个人需求登记（personal-requirement 插件）",
            "",
            "### 何时触发",
            "",
            "遇到以下情况，主动提议登记：",
            "- 有人（伙伴/老师/业务方/跨组同事）提出了一件事，让你跟进、处理或排期",
            "- 你答应了某件不在自己主线 OKR 里的事",
            "",
            "不要触发：闲聊、自己 OKR 里程碑、例行 cron 通知、已有独立工单的事项。",
            "",
            "### 固定执行步骤（每次都按顺序走，不要跳）",
            "",
            "**第一步：调 `requirement_bootstrap`**",
            "- 返回 `ok: true` → 做完下面的记录动作，再继续第二步",
            "- 返回 `ok: false, stage: \"token_missing\"` → 把返回值里 `instructions` 字段的文字**一字不改**念给用户。用户把 token 发过来后：(1) 立即写入 workspace 根目录的 .teable-token.yaml；(2) 立即告诉用户：token 已保存，请现在删除刚才那条包含 token 的消息；(3) 再调一次 bootstrap 确认成功",
            "- 返回 `ok: false, stage: \"member_not_found\"` → 告诉用户：花名册里找不到你的工号，请联系 SRE 工具链维护者。停止本次登记",
            "",
            "**bootstrap 成功后：更新本地记录文件（需用户同意后才写）**",
            "- 检查 USER.md 和 MEMORY.md 是否已有工号和插件配置记录",
            "- 如果缺失，告诉用户：我需要把你的工号和插件配置状态写入 USER.md 和 MEMORY.md，这样新 session 启动时不需要重新初始化。这两个文件存在你的 agent workspace 本地，不会上传到任何外部系统。是否同意？",
            "- 用户明确同意后才写入，写入内容：",
            "  USER.md：工号、姓名、所属组（如已有则跳过）",
            "  MEMORY.md：插件已配置状态、当季表名、登记流程说明（不写入 token 内容）",
            "- 用户拒绝则跳过，每次 session 重新 bootstrap 即可，功能不受影响",
            "- 如果 MEMORY.md 里已有 personal-requirement 段落，只更新当季表名，不再询问",
            "",
            "**第二步：调 `requirement_preview`**",
            "- 必须先拿到 `original_message`（对方的原话），没有就反问一次",
            "- 其余必填字段（title/description/counterpart_name）从原话里自己提炼，不要反问",
            "- `item_type` 只能填这四个值之一：需求、事项、问题、协作请求",
            "- `priority_hint` 只能填这五个值之一：紧急、高、中、低、未知",
            "- `title` 控制在 20 字以内，`description` 控制在 100 字以内",
            "",
            "**第三步：向用户确认**",
            "- preview 返回后，把结构化结果用自己的话告诉用户，格式举例：",
            "  帮你整理了一下，是这件事吗？",
            "  来自：[counterpart_name 的值] [如有 counterpart_org 则加上（org 的值）]",
            "  标题：[title 的值]",
            "  内容：[description 的值]",
            "  类型：[item_type 的值]，优先级：[priority_hint 的值]",
            "  ——确认的话我就登记，有要改的告诉我。",
            "- 注意：上面方括号里是你要替换成实际内容的地方，不要原样输出方括号",
            "- 等到用户明确说对、OK、登记、可以等确认词后，才进行第四步",
            "- 如果用户要修改，按要求改完再重新确认，不要直接写入",
            "",
            "**第四步：调 `requirement_record` 写入**",
            "- 写入前告知用户：这条记录将写入你在 Teable 的个人季度表 [table.name 的值]，确认后提交",
            "- 第三步的确认已包含此意，不必重复询问；但如果用户跳过了第三步直接要求写入，必须在此补充告知",
            "- 写入成功后，告诉用户已登记到这个季度的表里，说一下标题即可，不要贴出 record_id 或 table_id",
            "",
            "### 对话规则",
            "",
            "- 不要向用户暴露 tool 名称、API 参数、返回的 JSON、base_id 等技术细节",
            "- 反问次数上限 2 次：original_message 没有时反问一次，其他字段自行补全，超限就用 [未确认] 占位先登",
            "- token 出现在对话里时，只把它写入 .teable-token.yaml，不得存入 memory 或重复提及",
            "",
            "### 绝对禁止（违反会导致数据错误或安全问题）",
            "",
            "- 跳过第三步直接调 record 写入——会写入未经用户确认的错误数据",
            "- 把别人的 token 存到自己的文件——会导致数据写入他人的表",
            "- 登记薪资/绩效/离职/裁员相关内容——这类信息走单独脱敏流程",
            "- 帮其他人（非当前 token 对应用户）代为登记",
        ];
    };
}
function hasAnyPluginTool(available) {
    for (const name of PLUGIN_TOOL_NAMES) {
        if (available.has(name))
            return true;
    }
    return false;
}
//# sourceMappingURL=agent-instructions.js.map