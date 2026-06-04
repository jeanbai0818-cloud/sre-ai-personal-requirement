import { TeableClient } from "./teable-client.js";
import { PluginConfig } from "./config.js";
export interface MemberRecord {
    recordId: string;
    workCode: string;
    name: string;
    yachId: string;
    group: string;
    raw: Record<string, unknown>;
}
export declare class TeamResolver {
    private readonly teable;
    private readonly config;
    private cachedRecords;
    private cacheExpiresAt;
    constructor(teable: TeableClient, config: PluginConfig);
    private getMembers;
    resolveByWorkCode(workCode: string): Promise<MemberRecord | null>;
    resolveByYachId(yachId: string): Promise<MemberRecord | null>;
    resolveTeamBase(teamCode: string): {
        base_id: string;
        label: string;
    } | null;
}
