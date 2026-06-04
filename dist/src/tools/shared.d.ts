import { type PluginConfig } from "../config.js";
import { TeableClient } from "../teable-client.js";
import { TeamResolver, type MemberRecord } from "../team-resolver.js";
import { TableManager, type TableInfo } from "../table-manager.js";
import { RecordWriter } from "../record-writer.js";
import type { OpenClawPluginApi, OpenClawPluginToolContext } from "openclaw/plugin-sdk/plugin-entry";
/**
 * Key steps to show the user when the Teable token is missing.
 */
export declare const TOKEN_BOOTSTRAP_INSTRUCTIONS = "\u8BF7\u63D0\u4F9B\u60A8\u7684\u4E2A\u4EBA Teable \u8BBF\u95EE\u4EE4\u724C\u4EE5\u5B8C\u6210\u521D\u59CB\u5316\u3002\n\n\u83B7\u53D6\u6B65\u9AA4\uFF1A\n1. \u6253\u5F00 Teable \u4E2A\u4EBA\u4EE4\u724C\u9875\u9762\uFF1Ahttps://yach-teable.zhiyinlou.com/setting/personal-access-token\n2. \u70B9\u51FB\u300C\u521B\u5EFA\u4EE4\u724C\u300D\n3. \u8BBE\u7F6E\u6709\u6548\u671F\uFF08\u5EFA\u8BAE 365 \u5929\uFF09\n4. \u52FE\u9009\u4EE5\u4E0B 10 \u9879 scope\uFF08\u6743\u9650\u8303\u56F4\uFF09\uFF1A\n\n   \u3010\u57FA\u672C\u8BBF\u95EE\u2014\u2014\u5FC5\u9009\u3011\n   - space|read    \u2014\u2014 \u8BFB\u53D6\u7A7A\u95F4\u4FE1\u606F\uFF08\u8BC6\u522B\u4F60\u5C5E\u4E8E\u54EA\u4E2A\u7EC4\uFF09\n   - base|read     \u2014\u2014 \u8BFB\u53D6\u7EC4 Base\n   - table|read    \u2014\u2014 \u8BFB\u53D6\u8868\u7ED3\u6784\n   - field|read    \u2014\u2014 \u8BFB\u53D6\u5B57\u6BB5\n   - record|read   \u2014\u2014 \u8BFB\u53D6\u5DF2\u767B\u8BB0\u9700\u6C42\n\n   \u3010\u9700\u6C42\u767B\u8BB0\u2014\u2014\u5FC5\u9009\u3011\n   - record|create \u2014\u2014 \u767B\u8BB0\u65B0\u9700\u6C42\uFF08\u4E3B\u8981\u5199\u5165\u52A8\u4F5C\uFF09\n   - record|update \u2014\u2014 \u8865\u586B\u5173\u8054\u4EFB\u52A1 ID \u7B49\u5B57\u6BB5\n\n   \u3010\u5B63\u5EA6\u81EA\u52A8\u5EFA\u8868\u2014\u2014\u5FC5\u9009\u3011\n   - table|create  \u2014\u2014 \u6BCF\u5B63\u5EA6\u7B2C\u4E00\u6B21\u7528\u65F6\u81EA\u52A8\u5EFA\u65B0\u8868\n   - field|create  \u2014\u2014 \u65B0\u5EFA\u8868\u65F6\u5199\u5165 11 \u4E2A\u5B57\u6BB5\n   - field|update  \u2014\u2014 \u672A\u6765\u6269\u5B57\u6BB5\u65F6\u517C\u5BB9\n5. \u300C\u53EF\u8BBF\u95EE\u7684\u7A7A\u95F4\u300D\u9009\u62E9\uFF1A\u57FA\u7840\u670D\u52A1\u4E2D\u53F0-SRE-AI\u5316\u7EC4\u7EC7\n6. \u751F\u6210\u4EE4\u724C\u540E\uFF0C\u590D\u5236\u5B8C\u6574\u5B57\u7B26\u4E32\u53D1\u7ED9\u6211\uFF08\u4EE4\u724C\u53EA\u663E\u793A\u4E00\u6B21\uFF0C\u8BF7\u52A1\u5FC5\u590D\u5236\u4FDD\u5B58\uFF09\n\n\u26A0\uFE0F \u6CE8\u610F\uFF1A\n- \u4EE4\u724C\u5B57\u7B26\u4E32\u4EE5 teable_ \u5F00\u5934\n- \u6BCF\u4E2A\u4EBA\u52A1\u5FC5\u7528\u81EA\u5DF1\u7684\u4EE4\u724C\uFF08\u4E0D\u8981\u590D\u7528\u4ED6\u4EBA\u4EE4\u724C\uFF09\n- \u4EE4\u724C\u7B49\u540C\u4E8E\u8D26\u53F7\u5BC6\u7801\uFF0C\u8BF7\u52FF\u5206\u4EAB\u7ED9\u4ED6\u4EBA";
/**
 * Structured error thrown by resolveContext. Carries a machine-readable `stage`
 * and optional `data` payload so tool-layer catch blocks can map it to jsonResult.
 */
export declare class ContextError extends Error {
    readonly stage: string;
    readonly data?: Record<string, unknown>;
    constructor(message: string, stage: string, data?: Record<string, unknown>);
}
export interface ResolvedContext {
    config: PluginConfig;
    teable: TeableClient;
    teamResolver: TeamResolver;
    tableManager: TableManager;
    recordWriter: RecordWriter;
    member: MemberRecord;
    workCode: string;
    quarterLabel: string;
    table: TableInfo;
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
export declare function resolveContext(api: OpenClawPluginApi, ctx: OpenClawPluginToolContext, overrideWorkCode?: string): Promise<ResolvedContext>;
