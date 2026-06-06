import { Type } from "@sinclair/typebox";
import { jsonResult } from "openclaw/plugin-sdk/agent-runtime";
import { ContextError, TOKEN_BOOTSTRAP_INSTRUCTIONS, resolveContext } from "./shared.js";
export function createRecordTool(api, ctx) {
    return {
        name: "requirement_record",
        label: "需求登记·写入",
        description: "伙伴个人需求登记·写入。伙伴确认字段后调此工具写入当季维格表。" +
            "写入前自动确保表存在（内部会复用 bootstrap 逻辑）。",
        parameters: Type.Object({
            original_message: Type.String({
                description: "伙伴的原始原话（必填）",
            }),
            title: Type.String({
                description: "需求标题（必填）",
            }),
            description: Type.String({
                description: "需求描述（必填）",
            }),
            counterpart_name: Type.String({
                description: "对方姓名（必填）",
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
            work_code: Type.Optional(Type.String({
                description: "工号（可选，用于覆盖自动派生）",
            })),
            dry_run: Type.Optional(Type.Boolean({
                description: "试运行模式（默认 true）。true 时只返回预览，不写入 Teable；false 时才真正写入。必须在用户明确确认后才能传 false。",
            })),
        }),
        execute: async (_toolCallId, rawParams) => {
            const params = rawParams;
            try {
                // Validate required fields upfront
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
                // 干运行门：默认 dry_run=true（预览），只有 dry_run===false 才写入
                const isDryRun = params.dry_run !== false;
                // Steps 1-7: resolve context (config, token, member, quarter, table)
                const resolved = await resolveContext(api, ctx, params.work_code);
                const { recordWriter, member, workCode, quarterLabel, table } = resolved;
                // Build input with defaults
                const input = {
                    title: params.title.trim(),
                    description: params.description.trim(),
                    counterpart_name: params.counterpart_name.trim(),
                    original_message: params.original_message.trim(),
                    counterpart_org: params.counterpart_org?.trim(),
                    item_type: params.item_type?.trim(),
                    priority_hint: params.priority_hint?.trim() ?? "未知",
                    found_at: params.found_at?.trim() ?? new Date().toISOString(),
                    status: params.status?.trim() ?? "已登记",
                    linked_task_id: params.linked_task_id?.trim(),
                    linked_task_record_id: params.linked_task_record_id?.trim(),
                };
                if (isDryRun) {
                    return jsonResult({
                        ok: true,
                        dry_run: true,
                        preview: input,
                        table_name: table.name,
                        quarter: quarterLabel,
                        member: {
                            work_code: workCode,
                            name: member.name,
                        },
                        hint: "dry_run=true：以上内容尚未写入。向用户确认后以 dry_run: false 再次调用以写入。",
                    });
                }
                const writeResult = await recordWriter.writeRecord(input, table);
                return jsonResult({
                    ok: true,
                    dry_run: false,
                    record_id: writeResult.recordId,
                    datasheet_id: writeResult.datasheetId,
                    table_name: writeResult.tableName,
                    quarter: quarterLabel,
                    member: {
                        work_code: workCode,
                        name: member.name,
                    },
                });
            }
            catch (err) {
                if (err instanceof ContextError) {
                    if (err.stage === "token_missing") {
                        return jsonResult({
                            ok: false,
                            stage: "token_missing",
                            instructions: TOKEN_BOOTSTRAP_INSTRUCTIONS,
                        });
                    }
                    if (err.stage === "member_not_found") {
                        return jsonResult({
                            ok: false,
                            stage: "member_not_found",
                            work_code: err.data?.["work_code"] ?? params.work_code,
                        });
                    }
                    return jsonResult({
                        ok: false,
                        stage: err.stage,
                        error: err.message,
                    });
                }
                return jsonResult({ ok: false, error: String(err) });
            }
        },
    };
}
//# sourceMappingURL=requirement-record.js.map