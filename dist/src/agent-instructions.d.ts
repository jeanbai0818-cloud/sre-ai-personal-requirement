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
/**
 * Builder 类型 inline 定义——与 openclaw plugin-sdk 内部
 * `MemoryPromptSectionBuilder` 鸭子类型兼容。
 * 不从 openclaw 公开 exports 直接取，因为 memory-state 未在公共
 * exports 列表里。
 */
export type AgentInstructionsBuilder = (params: {
    availableTools: Set<string>;
}) => string[];
/**
 * 返回 agent 指令正文。仅当至少有一个本插件 tool 可用时注入。
 *
 * 内容组织原则：
 * - 5 大块：触发场景 / 工作流程 / 反问上限 / 前台话术 / 红线
 * - 每块尽量精炼，避免 system prompt 膨胀
 * - 只讲"什么时候调 / 怎么调 / 不要怎么调"，不讲实现细节
 * - 对话约束（人话 vs API 细节）优先级最高，放前面
 */
export declare function createAgentInstructionsBuilder(): AgentInstructionsBuilder;
