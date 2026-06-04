import { formatTeableTableName } from "./quarter.js";
/**
 * Canonical Teable field names for the personal-requirement table.
 * Imported by record-writer.ts to keep field names consistent.
 */
export const FIELD_NAMES = {
    TITLE: "title",
    DESCRIPTION: "description",
    COUNTERPART_NAME: "counterpart_name",
    COUNTERPART_ORG: "counterpart_org",
    ORIGINAL_MESSAGE: "original_message",
    ITEM_TYPE: "item_type",
    PRIORITY_HINT: "priority_hint",
    FOUND_AT: "found_at",
    STATUS: "status",
    LINKED_TASK_ID: "linked_task_id",
    LINKED_TASK_RECORD_ID: "linked_task_record_id",
};
const FIELDS = [
    { name: FIELD_NAMES.TITLE, type: "singleLineText" },
    { name: FIELD_NAMES.DESCRIPTION, type: "longText" },
    { name: FIELD_NAMES.COUNTERPART_NAME, type: "singleLineText" },
    { name: FIELD_NAMES.COUNTERPART_ORG, type: "singleLineText" },
    { name: FIELD_NAMES.ORIGINAL_MESSAGE, type: "longText" },
    {
        name: FIELD_NAMES.ITEM_TYPE,
        type: "singleSelect",
        options: {
            choices: [
                { name: "需求" },
                { name: "事项" },
                { name: "问题" },
                { name: "协作请求" },
            ],
        },
    },
    {
        name: FIELD_NAMES.PRIORITY_HINT,
        type: "singleSelect",
        options: {
            choices: [
                { name: "紧急" },
                { name: "高" },
                { name: "中" },
                { name: "低" },
                { name: "未知" },
            ],
        },
    },
    {
        name: FIELD_NAMES.FOUND_AT,
        type: "date",
        options: {
            formatting: {
                date: "YYYY-MM-DD",
                time: "HH:mm",
                timeZone: "Asia/Shanghai",
            },
        },
    },
    {
        name: FIELD_NAMES.STATUS,
        type: "singleSelect",
        options: {
            choices: [
                { name: "待整理" },
                { name: "待分诊" },
                { name: "已登记" },
                { name: "已转任务" },
                { name: "已关闭" },
            ],
        },
    },
    { name: FIELD_NAMES.LINKED_TASK_ID, type: "singleLineText" },
    { name: FIELD_NAMES.LINKED_TASK_RECORD_ID, type: "singleLineText" },
];
export class TableManager {
    teable;
    config;
    constructor(teable, config) {
        this.teable = teable;
        this.config = config;
    }
    /**
     * Locate or create the personal-requirement table for the given owner + quarter.
     *
     * 1. Looks up the team's base_id from config.
     * 2. Lists tables in that base to check if the expected table already exists.
     * 3. If found, returns it with reused=true.
     * 4. If not found, creates it with the full field schema, then immediately
     *    deletes the 3 placeholder records that Teable auto-inserts.
     */
    async ensureQuarterTable(params) {
        const teamConfig = this.config.teams[params.teamCode];
        if (!teamConfig) {
            throw new Error(`Team code "${params.teamCode}" not found in config. ` +
                `Available team codes: ${Object.keys(this.config.teams).join(", ")}`);
        }
        const expectedName = formatTeableTableName(params.name, params.workCode, params.quarterLabel);
        const baseId = teamConfig.base_id;
        const tables = await this.teable.listTablesInBase(baseId);
        const existing = tables.find((t) => t.name === expectedName);
        if (existing) {
            return {
                datasheetId: existing.id,
                name: existing.name,
                baseId,
                created: false,
                reused: true,
            };
        }
        const created = await this.teable.createTable(baseId, {
            name: expectedName,
            fields: FIELDS,
        });
        // Clean up the 3 placeholder records Teable auto-inserts after createTable.
        const placeholders = await this.teable.listRecords(created.id, { take: 10 });
        if (placeholders.length > 0) {
            await this.teable.deleteRecords(created.id, placeholders.map((r) => r.id));
        }
        return {
            datasheetId: created.id,
            name: created.name,
            baseId,
            created: true,
            reused: false,
        };
    }
}
//# sourceMappingURL=table-manager.js.map