import * as fs from "fs";
import * as yaml from "js-yaml";
import { resolveConfig, expandTokenPath } from "../config.js";
import { TeableClient } from "../teable-client.js";
import { TeamResolver } from "../team-resolver.js";
import { TableManager } from "../table-manager.js";
import { RecordWriter } from "../record-writer.js";
import { getFiscalQuarter } from "../quarter.js";
/**
 * Key steps to show the user when the Teable token is missing.
 */
export const TOKEN_BOOTSTRAP_INSTRUCTIONS = `需要先完成 Teable token 配置才能使用本插件。

── 第一步：申请 token ──

1. 打开：https://yach-teable.zhiyinlou.com/setting/personal-access-token
2. 点击「创建令牌」，设置有效期（建议 14 天，到期续期只需重发一次）
3. 勾选以下 scope（最小权限原则，只勾必要项）：

   【基本访问】space|read / base|read / table|read / field|read / record|read
   【需求登记】record|create / record|update
   【建表】   table|create / field|create / field|update

4. 可访问空间选择：基础服务中台-SRE-AI化组织
5. 生成后立即复制，页面关闭后无法再查看

── 第二步：把 token 发给我 ──

直接把 teable_xxx... 字符串发到这里。

⚠️ 安全说明：
- 本系统为公司内部系统，IM 通道和日志均在公司管控范围内
- token 有效期仅 14 天，过期自动失效，降低泄露窗口
- 我收到后会立即写入本地配置文件，请在发送后删除那条消息
- token 只存在本地 .teable-token.yaml，不会写入对话记录或 memory`;
/**
 * Structured error thrown by resolveContext. Carries a machine-readable `stage`
 * and optional `data` payload so tool-layer catch blocks can map it to jsonResult.
 */
export class ContextError extends Error {
    stage;
    data;
    constructor(message, stage, data) {
        super(message);
        this.name = "ContextError";
        this.stage = stage;
        this.data = data;
    }
}
/**
 * Shared bootstrap logic used by both requirement_bootstrap and requirement_record.
 *
 * Performs steps 1-7 from the bootstrap spec:
 *   1. Resolve PluginConfig
 *   2. Read + parse token file (throws ContextError stage="token_missing" if absent/invalid)
 *   3. Derive workCode from override or ctx.requesterSenderId
 *   4. Instantiate TeableClient / TeamResolver / TableManager / RecordWriter
 *   5. Resolve member record (throws stage="member_not_found" if unknown)
 *   6. Compute fiscal quarter label
 *   7. Ensure quarter table exists
 *
 * @throws ContextError on any failure — tool layer maps stage → jsonResult.
 */
export async function resolveContext(api, ctx, overrideWorkCode) {
    // Step 1: Resolve config
    const config = resolveConfig(api.pluginConfig);
    // Step 2: Read token file
    const workspaceDir = ctx.workspaceDir ?? process.cwd();
    const tokenPath = expandTokenPath(workspaceDir, config.token_storage_relpath);
    if (!fs.existsSync(tokenPath)) {
        throw new ContextError(`Token file not found at: ${tokenPath}`, "token_missing");
    }
    let token;
    try {
        const raw = fs.readFileSync(tokenPath, "utf-8");
        const parsed = yaml.load(raw);
        const teableSection = parsed?.["teable"];
        const apiToken = teableSection?.["api_token"];
        if (!apiToken || typeof apiToken !== "string") {
            throw new ContextError("teable.api_token is missing or empty in token file", "token_missing");
        }
        token = apiToken;
    }
    catch (err) {
        if (err instanceof ContextError)
            throw err;
        throw new ContextError(`Failed to read token file: ${String(err)}`, "token_missing");
    }
    // Step 3: Derive workCode
    let workCode = overrideWorkCode?.trim() ?? "";
    if (!workCode && ctx.requesterSenderId) {
        workCode = ctx.requesterSenderId.replace(/^yach/i, "").trim();
    }
    if (!workCode) {
        throw new ContextError("Cannot derive work_code: no override provided and requesterSenderId is empty", "work_code_missing");
    }
    // Step 4: Instantiate clients
    const teable = new TeableClient({ token, apiBase: config.teable_api_base });
    const teamResolver = new TeamResolver(teable, config);
    const tableManager = new TableManager(teable, config);
    const recordWriter = new RecordWriter(teable);
    // Step 5: Resolve member
    const member = await teamResolver.resolveByWorkCode(workCode);
    if (!member) {
        throw new ContextError(`Member not found for work_code: ${workCode}`, "member_not_found", { work_code: workCode });
    }
    // Step 6: Compute quarter label
    const { label: quarterLabel } = getFiscalQuarter(new Date(), config.fiscal_year_start_month);
    // Step 7: Ensure quarter table
    const table = await tableManager.ensureQuarterTable({
        teamCode: member.group,
        name: member.name,
        workCode,
        quarterLabel,
    });
    return {
        config,
        teable,
        teamResolver,
        tableManager,
        recordWriter,
        member,
        workCode,
        quarterLabel,
        table,
    };
}
//# sourceMappingURL=shared.js.map