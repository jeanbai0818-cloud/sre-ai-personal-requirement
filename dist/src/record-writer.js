import { FIELD_NAMES } from "./table-manager.js";
export class RecordWriter {
    teable;
    constructor(teable) {
        this.teable = teable;
    }
    async writeRecord(input, table) {
        // Validation
        if (!input.title?.trim()) {
            throw new Error("title is required and must be non-empty");
        }
        if (!input.description?.trim()) {
            throw new Error("description is required and must be non-empty");
        }
        if (!input.original_message?.trim()) {
            throw new Error("original_message is required and must be non-empty");
        }
        if (!input.counterpart_name?.trim()) {
            throw new Error("counterpart_name is required and must be non-empty");
        }
        // Defaults
        const status = input.status ?? "已登记";
        const priorityHint = input.priority_hint ?? "未知";
        // Teable date fields expect ISO 8601 strings.
        const foundAtIso = input.found_at ?? new Date().toISOString();
        const fields = {
            [FIELD_NAMES.TITLE]: input.title.trim(),
            [FIELD_NAMES.DESCRIPTION]: input.description.trim(),
            [FIELD_NAMES.COUNTERPART_NAME]: input.counterpart_name.trim(),
            [FIELD_NAMES.ORIGINAL_MESSAGE]: input.original_message.trim(),
            [FIELD_NAMES.STATUS]: status,
            [FIELD_NAMES.PRIORITY_HINT]: priorityHint,
            [FIELD_NAMES.FOUND_AT]: foundAtIso,
        };
        if (input.counterpart_org != null) {
            fields[FIELD_NAMES.COUNTERPART_ORG] = input.counterpart_org;
        }
        if (input.item_type != null) {
            fields[FIELD_NAMES.ITEM_TYPE] = input.item_type;
        }
        if (input.linked_task_id != null) {
            fields[FIELD_NAMES.LINKED_TASK_ID] = input.linked_task_id;
        }
        if (input.linked_task_record_id != null) {
            fields[FIELD_NAMES.LINKED_TASK_RECORD_ID] = input.linked_task_record_id;
        }
        const record = await this.teable.createRecord(table.datasheetId, fields);
        return {
            recordId: record.id,
            datasheetId: table.datasheetId,
            tableName: table.name,
        };
    }
}
//# sourceMappingURL=record-writer.js.map