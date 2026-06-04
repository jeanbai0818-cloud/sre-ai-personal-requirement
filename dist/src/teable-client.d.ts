/**
 * Minimal Teable API client.
 *
 * Uses the global `fetch` available in Node 22+. No external HTTP dependencies.
 *
 * Rate limit enforcement: ≥ 250 ms between requests (≤ 4 req/sec ceiling),
 * serialised through a simple promise queue.
 *
 * Teable response: direct body (no envelope). Failures return { status, message, code }.
 *
 * Known quirks:
 *   - After createTable, Teable auto-inserts 3 placeholder records; callers must
 *     delete them immediately (the table-manager handles this).
 *   - API may return success with null/empty id as a fake success —
 *     callers must validate that returned ids are non-empty.
 */
/**
 * Thrown when a Teable API call fails (non-2xx response, network error, or
 * a "fake success" with a null/empty id).
 */
export declare class TeableApiError extends Error {
    /** HTTP status code of the response. */
    readonly status: number;
    /** Teable application-level error code (from error body), if present. */
    readonly code: number | undefined;
    /** Raw parsed response body (if available). */
    readonly body: unknown;
    constructor(message: string, status: number, code: number | undefined, body: unknown);
}
/** A single Teable record as returned by list/create record endpoints. */
export interface TeableRecord {
    /** Record ID (Teable uses `id`, not `recordId`). */
    id: string;
    fields: Record<string, unknown>;
}
/** Field definition used when creating a table. */
export interface TeableFieldDef {
    /** Field display name. */
    name: string;
    /**
     * Teable field type string, e.g. "singleLineText", "longText", "date",
     * "singleSelect", etc.
     */
    type: string;
    /** Type-specific field options (e.g. choices for singleSelect, formatting for date). */
    options?: unknown;
}
/** Table descriptor (id + name). */
export interface TeableTableInfo {
    id: string;
    name: string;
}
/** Base descriptor (id + name). */
export interface TeableBaseInfo {
    id: string;
    name: string;
}
/** Space descriptor (id + name). */
export interface TeableSpaceInfo {
    id: string;
    name: string;
}
/**
 * Minimal Teable API client.
 *
 * All public methods:
 *  - return parsed, typed data on success
 *  - throw {@link TeableApiError} on API-level errors, fake successes, or HTTP errors
 *  - are serialised to enforce ≤ 4 requests/second (≥ 250 ms gap)
 */
export declare class TeableClient {
    private readonly token;
    private readonly apiBase;
    /** Timestamp (ms) when the last request was dispatched. */
    private lastRequestAt;
    /** Serial promise chain — every request appends to this. */
    private queue;
    /**
     * @param opts.token   Personal API token (never logged by this client).
     * @param opts.apiBase Teable API base URL
     *                     (default: "https://yach-teable.zhiyinlou.com/api").
     */
    constructor(opts: {
        token: string;
        apiBase: string;
    });
    /**
     * Enqueue `fn` so that it runs after the previous request, with at least
     * 250 ms gap between consecutive sends (≤ 4 rps ceiling).
     */
    private enqueue;
    /**
     * Execute an HTTP request and return the parsed body.
     * Throws {@link TeableApiError} if the HTTP status is not 2xx or the call fails.
     */
    private request;
    /**
     * List records in a table (field keys returned as names).
     *
     * @param tableId - Table ID, e.g. "tblx3kjDWlSgoZz3As4".
     * @param opts    - Optional query parameters.
     * @param opts.viewId  - Filter by view ID.
     * @param opts.take    - Max records to return.
     * @param opts.skip    - Number of records to skip (pagination).
     * @param opts.filter  - Teable filter expression string.
     * @returns Array of records with `id` and `fields` (keyed by field name).
     */
    listRecords(tableId: string, opts?: {
        viewId?: string;
        take?: number;
        skip?: number;
        filter?: string;
    }): Promise<Array<TeableRecord>>;
    /**
     * Create a single record in a table.
     *
     * @param tableId - Table ID.
     * @param fields  - Map of field name → value.
     * @returns The created record with `id` and `fields`.
     * @throws {@link TeableApiError} if the API returns a null/empty id.
     */
    createRecord(tableId: string, fields: Record<string, unknown>): Promise<TeableRecord>;
    /**
     * Create multiple records in a table in a single API call.
     *
     * @param tableId    - Table ID.
     * @param fieldsList - Array of field maps (one per record).
     * @returns Array of created records.
     * @throws {@link TeableApiError} if any returned record has a null/empty id.
     */
    createRecords(tableId: string, fieldsList: Array<Record<string, unknown>>): Promise<Array<TeableRecord>>;
    /**
     * Create a new table inside a base.
     *
     * @param baseId           - Base ID.
     * @param opts.name        - Table display name.
     * @param opts.description - Optional table description.
     * @param opts.fields      - Field definitions array.
     * @returns `{ id, name }` of the newly created table.
     * @throws {@link TeableApiError} if the API returns a null/empty id (fake success).
     */
    createTable(baseId: string, opts: {
        name: string;
        description?: string;
        fields: Array<TeableFieldDef>;
    }): Promise<TeableTableInfo>;
    /**
     * Delete a single record from a table.
     *
     * @param tableId  - Table ID.
     * @param recordId - Record ID to delete.
     */
    deleteRecord(tableId: string, recordId: string): Promise<void>;
    /**
     * Delete multiple records from a table in a single API call.
     *
     * Uses query parameters: `?recordIds=X&recordIds=Y&...`
     *
     * @param tableId   - Table ID.
     * @param recordIds - Array of record IDs to delete.
     */
    deleteRecords(tableId: string, recordIds: string[]): Promise<void>;
    /**
     * List all spaces accessible with the current token.
     *
     * @returns Array of `{ id, name }` for each accessible space.
     */
    listSpaces(): Promise<Array<TeableSpaceInfo>>;
    /**
     * List all bases inside a specific space.
     *
     * @param spaceId - Space ID.
     * @returns Array of `{ id, name }` for each base.
     */
    listBasesInSpace(spaceId: string): Promise<Array<TeableBaseInfo>>;
    /**
     * List all tables inside a specific base.
     *
     * @param baseId - Base ID.
     * @returns Array of `{ id, name }` for each table.
     */
    listTablesInBase(baseId: string): Promise<Array<TeableTableInfo>>;
}
