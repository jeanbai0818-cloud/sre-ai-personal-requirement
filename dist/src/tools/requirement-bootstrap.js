import { Type } from "@sinclair/typebox";
import { jsonResult } from "openclaw/plugin-sdk/agent-runtime";
import { ContextError, TOKEN_BOOTSTRAP_INSTRUCTIONS, resolveContext } from "./shared.js";
export function createBootstrapTool(api, ctx) {
    return {
        name: "requirement_bootstrap",
        label: "需求登记·初始化",
        description: "伙伴个人需求登记·初始化。首次调用会：(1) 检查 Teable token 是否已配置（缺失返回引导话术）；" +
            "(2) 根据当前用户工号从花名册识别所属组；(3) 在对应组 Base 下建立/复用当季个人需求表（表名：姓名-工号-季度）。" +
            "后续 preview/record 内部会自动复用相同逻辑。",
        parameters: Type.Object({
            work_code: Type.Optional(Type.String({
                description: "工号（可选，用于覆盖自动派生）。不填时从当前用户 ID 自动解析。",
            })),
        }),
        execute: async (_toolCallId, rawParams) => {
            const params = rawParams;
            try {
                const resolved = await resolveContext(api, ctx, params.work_code);
                const { member, workCode, quarterLabel, table } = resolved;
                return jsonResult({
                    ok: true,
                    member: {
                        work_code: workCode,
                        name: member.name,
                        group: member.group,
                    },
                    quarter: quarterLabel,
                    table: {
                        datasheet_id: table.datasheetId,
                        name: table.name,
                        created: table.created,
                        reused: table.reused,
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
//# sourceMappingURL=requirement-bootstrap.js.map