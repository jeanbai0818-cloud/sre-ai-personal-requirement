import { TeableClient } from "./teable-client.js";
import { PluginConfig } from "./config.js";
export interface TableInfo {
    datasheetId: string;
    name: string;
    baseId: string;
    created: boolean;
    reused: boolean;
}
/**
 * Canonical Teable field names for the personal-requirement table.
 * Imported by record-writer.ts to keep field names consistent.
 */
export declare const FIELD_NAMES: {
    readonly TITLE: "title";
    readonly DESCRIPTION: "description";
    readonly COUNTERPART_NAME: "counterpart_name";
    readonly COUNTERPART_ORG: "counterpart_org";
    readonly ORIGINAL_MESSAGE: "original_message";
    readonly ITEM_TYPE: "item_type";
    readonly PRIORITY_HINT: "priority_hint";
    readonly FOUND_AT: "found_at";
    readonly STATUS: "status";
    readonly LINKED_TASK_ID: "linked_task_id";
    readonly LINKED_TASK_RECORD_ID: "linked_task_record_id";
};
export declare class TableManager {
    private readonly teable;
    private readonly config;
    constructor(teable: TeableClient, config: PluginConfig);
    /**
     * Locate or create the personal-requirement table for the given owner + quarter.
     *
     * 1. Looks up the team's base_id from config.
     * 2. Lists tables in that base to check if the expected table already exists.
     * 3. If found, returns it with reused=true.
     * 4. If not found, creates it with the full field schema, then immediately
     *    deletes the 3 placeholder records that Teable auto-inserts.
     */
    ensureQuarterTable(params: {
        teamCode: string;
        name: string;
        workCode: string;
        quarterLabel: string;
    }): Promise<TableInfo>;
}
