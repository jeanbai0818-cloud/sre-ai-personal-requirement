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
export const TOKEN_BOOTSTRAP_INSTRUCTIONS = `请提供您的个人 Teable 访问令牌以完成初始化。

获取步骤：
1. 打开 Teable 个人令牌页面：https://yach-teable.zhiyinlou.com/setting/personal-access-token
2. 点击「创建令牌」
3. 设置有效期（建议 365 天）
4. 勾选以下 10 项 scope（权限范围）：

   【基本访问——必选】
   - space|read    —— 读取空间信息（识别你属于哪个组）
   - base|read     —— 读取组 Base
   - table|read    —— 读取表结构
   - field|read    —— 读取字段
   - record|read   —— 读取已登记需求

   【需求登记——必选】
   - record|create —— 登记新需求（主要写入动作）
   - record|update —— 补填关联任务 ID 等字段

   【季度自动建表——必选】
   - table|create  —— 每季度第一次用时自动建新表
   - field|create  —— 新建表时写入 11 个字段
   - field|update  —— 未来扩字段时兼容
5. 「可访问的空间」选择：基础服务中台-SRE-AI化组织
6. 生成令牌后，复制完整字符串发给我（令牌只显示一次，请务必复制保存）

⚠️ 注意：
- 令牌字符串以 teable_ 开头
- 每个人务必用自己的令牌（不要复用他人令牌）
- 令牌等同于账号密码，请勿分享给他人`;
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