import { Type } from "@sinclair/typebox";
import { jsonResult } from "openclaw/plugin-sdk/agent-runtime";
export function createPreviewTool(_api, _ctx) {
    return {
        name: "requirement_preview",
        label: "需求登记·预览",
        description: "伙伴个人需求登记·预览。把伙伴原话解析成结构化字段并返回预览，**不写入维格表**。" +
            "预览字段由 LLM 填充（title/description/counterpart_name 等），此工具只做字段校验和默认值填充。" +
            "需要人工确认后再调 requirement_record。",
        parameters: Type.Object({
            original_message: Type.String({
                description: "伙伴的原始原话（必填，是结构化解析的信息来源）",
            }),
            title: Type.String({
                description: "需求标题（必填，LLM 从原话中提炼）",
            }),
            description: Type.String({
                description: "需求描述（必填，LLM 从原话中提炼）",
            }),
            counterpart_name: Type.String({
                description: "对方姓名（必填，需求来源方的称呼）",
            }),
            counterpart_org: Type.Optional(Type.String({ description: "对方组织/团队（可选）" })),
            item_type: Type.Optional(Type.String({
                description: "事项类型（可选）：需求 / 事项 / 问题 / 协作请求",
            })),
            priority_hint: Type.Optional(Type.String({
                description: "优先级提示（可选）：紧急 / 高 / 中 / 低 / 未知（默认未知）",
            })),
            found_at: Type.Optional(Type.String({
                description: "登记时间，ISO 8601 格式（可选，默认为当前时间）",
            })),
            status: Type.Optional(Type.String({
                description: "状态（可选）：已登记 / 待整理 / 待分诊 / 已转任务 / 已关闭（默认已登记）",
            })),
            linked_task_id: Type.Optional(Type.String({ description: "关联任务 ID（可选）" })),
            linked_task_record_id: Type.Optional(Type.String({ description: "关联任务记录 ID（可选）" })),
        }),
        execute: async (_toolCallId, rawParams) => {
            try {
                const params = rawParams;
                // Validate required fields
                const missing = [];
                if (!params.title?.trim())
                    missing.push("title");
                if (!params.description?.trim())
                    missing.push("description");
                if (!params.counterpart_name?.trim())
                    missing.push("counterpart_name");
                if (!params.original_message?.trim())
                    missing.push("original_message");
                if (missing.length > 0) {
                    return jsonResult({
                        ok: false,
                        error: `缺少必填字段：${missing.join(", ")}`,
                    });
                }
                // Fill defaults
                const preview = {
                    title: params.title.trim(),
                    description: params.description.trim(),
                    counterpart_name: params.counterpart_name.trim(),
                    counterpart_org: params.counterpart_org?.trim() ?? undefined,
                    original_message: params.original_message.trim(),
                    item_type: params.item_type?.trim() ?? undefined,
                    priority_hint: params.priority_hint?.trim() ?? "未知",
                    found_at: params.found_at?.trim() ?? new Date().toISOString(),
                    status: params.status?.trim() ?? "已登记",
                    linked_task_id: params.linked_task_id?.trim() ?? undefined,
                    linked_task_record_id: params.linked_task_record_id?.trim() ?? undefined,
                };
                return jsonResult({
                    ok: true,
                    preview,
                    hint: "请与伙伴确认以上字段无误后再调 requirement_record 写入",
                });
            }
            catch (err) {
                return jsonResult({ ok: false, error: String(err) });
            }
        },
    };
}
//# sourceMappingURL=requirement-preview.js.map