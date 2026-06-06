import { type PluginConfig } from "../config.js";
import { TeableClient } from "../teable-client.js";
import { TeamResolver, type MemberRecord } from "../team-resolver.js";
import { TableManager, type TableInfo } from "../table-manager.js";
import { RecordWriter } from "../record-writer.js";
import type { OpenClawPluginApi, OpenClawPluginToolContext } from "openclaw/plugin-sdk/plugin-entry";
/**
 * Key steps to show the user when the Teable token is missing.
 */
export declare const TOKEN_BOOTSTRAP_INSTRUCTIONS: string;
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
