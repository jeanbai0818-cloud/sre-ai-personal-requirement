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
            "仅在用户消息同时包含（1）明确登记动词（登记/记一下/记录一下/帮我记）且（2）有明确事项来源/内容时，才主动发起登记流程。",
            "不得对纯转述、纯讨论、提问、闲聊、OKR 里程碑、cron 通知、已有独立工单的事项自动触发。",
            "遇到模糊情况，先问：这件事需要我登记到需求表里吗？等确认后再触发。",
            "",
            "### 固定执行步骤（每次都按顺序走，不要跳）",
            "",
            "**第一步：调 `requirement_bootstrap`**",
            "- 返回 `ok: true` → 做完下面的记录动作，再继续第二步",
            "- 返回 `ok: false, stage: \"token_missing\"` → 把返回值里 `instructions` 字段的文字**一字不改**念给用户。用户把 token 发过来后：(1) 立即写入 workspace 根目录的 .teable-token.yaml；(2) 立即告诉用户：token 已保存，请现在删除刚才那条包含 token 的消息（这是 IM-only 环境的已知限制，无法完全避免日志留存，token 尽快删除可降低风险）；(3) 再调一次 bootstrap 确认成功",
            "- 返回 `ok: false, stage: \"work_code_missing\"` → 告诉用户：未能自动识别你的工号（当前接入环境不支持自动派生），请告诉我你的工号。收到后用 work_code 参数重新调用 requirement_bootstrap",
            "- 返回 `ok: false, stage: \"member_not_found\"` → 告诉用户：花名册里找不到你的工号，请联系 SRE 工具链维护者。停止本次登记",
            "",
            "**bootstrap 成功后：更新本地记录文件**",
            "- 检查 USER.md 和 MEMORY.md 是否已有工号和插件配置记录",
            "- 如果完全没有：告知用户将要写入的内容和目的，征求同意后才写：",
            "  写入内容：工号/姓名/所属组（USER.md）、插件配置状态和当季表名（MEMORY.md），不含 token",
            "  写入目的：让新 session 启动时无需重新初始化，这两个文件只存在本地 workspace",
            "  用户拒绝则跳过，功能不受影响",
            "- 如果 MEMORY.md 里已有 personal-requirement 段落（说明用户之前已同意过持久化）：",
            "  只更新当季表名这一个字段，其他字段不动，不再重复征求同意",
            "  （这是用户首次同意时已授权的维护操作，范围仅限表名更新，不新增任何字段）",
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
            "**第四步：调 `requirement_record` 写入（必须传 dry_run: false）**",
            "- 调用时必须显式传 `dry_run: false`，否则工具只返回预览不写入",
            "- 如果工具返回 dry_run: true，说明参数传错了，补上 dry_run: false 重新调用",
            "- 写入成功（ok: true, dry_run: false）后告诉用户已登记，说一下标题即可，不要贴出 record_id 或 table_id",
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