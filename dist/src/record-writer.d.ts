import { TeableClient } from "./teable-client.js";
import { TableInfo } from "./table-manager.js";
export interface PersonalRequirementInput {
    title: string;
    description: string;
    counterpart_name: string;
    counterpart_org?: string;
    original_message: string;
    item_type?: string;
    priority_hint?: string;
    found_at?: string;
    status?: string;
    linked_task_id?: string;
    linked_task_record_id?: string;
}
export interface WriteResult {
    recordId: string;
    datasheetId: string;
    tableName: string;
}
export declare class RecordWriter {
    private readonly teable;
    constructor(teable: TeableClient);
    writeRecord(input: PersonalRequirementInput, table: TableInfo): Promise<WriteResult>;
}
