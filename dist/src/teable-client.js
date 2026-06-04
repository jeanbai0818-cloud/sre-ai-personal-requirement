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
// ─── Error class ──────────────────────────────────────────────────────────────
/**
 * Thrown when a Teable API call fails (non-2xx response, network error, or
 * a "fake success" with a null/empty id).
 */
export class TeableApiError extends Error {
    /** HTTP status code of the response. */
    status;
    /** Teable application-level error code (from error body), if present. */
    code;
    /** Raw parsed response body (if available). */
    body;
    constructor(message, status, code, body) {
        super(message);
        this.name = "TeableApiError";
        this.status = status;
        this.code = code;
        this.body = body;
    }
}
// ─── Client ──────────────────────────────────────────────────────────────────
/**
 * Minimal Teable API client.
 *
 * All public methods:
 *  - return parsed, typed data on success
 *  - throw {@link TeableApiError} on API-level errors, fake successes, or HTTP errors
 *  - are serialised to enforce ≤ 4 requests/second (≥ 250 ms gap)
 */
export class TeableClient {
    token;
    apiBase;
    /** Timestamp (ms) when the last request was dispatched. */
    lastRequestAt = 0;
    /** Serial promise chain — every request appends to this. */
    queue = Promise.resolve();
    /**
     * @param opts.token   Personal API token (never logged by this client).
     * @param opts.apiBase Teable API base URL
     *                     (default: "https://yach-teable.zhiyinlou.com/api").
     */
    constructor(opts) {
        this.token = opts.token;
        this.apiBase = opts.apiBase.replace(/\/+$/, ""); // strip trailing slash
    }
    // ─── Rate-limiter ─────────────────────────────────────────────────────────
    /**
     * Enqueue `fn` so that it runs after the previous request, with at least
     * 250 ms gap between consecutive sends (≤ 4 rps ceiling).
     */
    enqueue(fn) {
        const result = this.queue.then(async () => {
            const now = Date.now();
            const wait = 250 - (now - this.lastRequestAt);
            if (wait > 0) {
                await new Promise((resolve) => setTimeout(resolve, wait));
            }
            this.lastRequestAt = Date.now();
            return fn();
        });
        // Keep the chain alive regardless of success/failure
        this.queue = result.then(() => { }, () => { });
        return result;
    }
    // ─── Core fetch ───────────────────────────────────────────────────────────
    /**
     * Execute an HTTP request and return the parsed body.
     * Throws {@link TeableApiError} if the HTTP status is not 2xx or the call fails.
     */
    async request(method, urlPath, body) {
        return this.enqueue(async () => {
            const url = `${this.apiBase}${urlPath}`;
            const headers = {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            };
            const init = { method, headers };
            if (body !== undefined) {
                init.body = JSON.stringify(body);
            }
            let res;
            try {
                res = await fetch(url, init);
            }
            catch (err) {
                throw new TeableApiError(`Network error: ${String(err)}`, 0, undefined, null);
            }
            // 204 No Content — success with no body
            if (res.status === 204) {
                return undefined;
            }
            // Read body as text first so we can distinguish "empty success" from
            // "non-JSON error". Some endpoints (e.g. DELETE table) return 200 with an
            // empty body, which is a legitimate success but would otherwise throw.
            const rawText = await res.text();
            let parsed;
            if (rawText.length === 0) {
                parsed = undefined;
            }
            else {
                try {
                    parsed = JSON.parse(rawText);
                }
                catch {
                    if (res.ok) {
                        // Non-JSON 2xx body — treat as opaque success.
                        parsed = rawText;
                    }
                    else {
                        throw new TeableApiError(`HTTP ${res.status}: non-JSON response`, res.status, undefined, rawText);
                    }
                }
            }
            if (!res.ok) {
                const err = parsed;
                throw new TeableApiError(err.message ?? `API error (HTTP ${res.status})`, res.status, err.code, parsed);
            }
            return parsed;
        });
    }
    // ─── Public API ───────────────────────────────────────────────────────────
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
    async listRecords(tableId, opts) {
        const params = new URLSearchParams({ fieldKeyType: "name" });
        if (opts?.viewId)
            params.set("viewId", opts.viewId);
        if (opts?.take != null)
            params.set("take", String(opts.take));
        if (opts?.skip != null)
            params.set("skip", String(opts.skip));
        if (opts?.filter)
            params.set("filter", opts.filter);
        const data = await this.request("GET", `/table/${tableId}/record?${params.toString()}`);
        return data.records ?? [];
    }
    /**
     * Create a single record in a table.
     *
     * @param tableId - Table ID.
     * @param fields  - Map of field name → value.
     * @returns The created record with `id` and `fields`.
     * @throws {@link TeableApiError} if the API returns a null/empty id.
     */
    async createRecord(tableId, fields) {
        const results = await this.createRecords(tableId, [fields]);
        const rec = results[0];
        if (!rec) {
            throw new TeableApiError("createRecord: API returned empty records array", 200, undefined, null);
        }
        return rec;
    }
    /**
     * Create multiple records in a table in a single API call.
     *
     * @param tableId    - Table ID.
     * @param fieldsList - Array of field maps (one per record).
     * @returns Array of created records.
     * @throws {@link TeableApiError} if any returned record has a null/empty id.
     */
    async createRecords(tableId, fieldsList) {
        const data = await this.request("POST", `/table/${tableId}/record`, {
            records: fieldsList.map((fields) => ({ fields })),
            fieldKeyType: "name",
        });
        const records = data.records ?? [];
        for (const rec of records) {
            if (!rec.id) {
                throw new TeableApiError("createRecords: API returned record with null/empty id (fake success)", 200, undefined, rec);
            }
        }
        return records;
    }
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
    async createTable(baseId, opts) {
        const body = {
            name: opts.name,
            fields: opts.fields,
        };
        if (opts.description != null) {
            body["description"] = opts.description;
        }
        const data = await this.request("POST", `/base/${baseId}/table/`, body);
        if (!data.id) {
            throw new TeableApiError("createTable: API returned null/empty id (fake success)", 200, undefined, data);
        }
        return { id: data.id, name: data.name };
    }
    /**
     * Delete a single record from a table.
     *
     * @param tableId  - Table ID.
     * @param recordId - Record ID to delete.
     */
    async deleteRecord(tableId, recordId) {
        await this.request("DELETE", `/table/${tableId}/record/${recordId}`);
    }
    /**
     * Delete multiple records from a table in a single API call.
     *
     * Uses query parameters: `?recordIds=X&recordIds=Y&...`
     *
     * @param tableId   - Table ID.
     * @param recordIds - Array of record IDs to delete.
     */
    async deleteRecords(tableId, recordIds) {
        if (recordIds.length === 0)
            return;
        const params = new URLSearchParams();
        for (const id of recordIds) {
            params.append("recordIds", id);
        }
        await this.request("DELETE", `/table/${tableId}/record?${params.toString()}`);
    }
    /**
     * List all spaces accessible with the current token.
     *
     * @returns Array of `{ id, name }` for each accessible space.
     */
    async listSpaces() {
        const data = await this.request("GET", "/space");
        return (data ?? []).map(({ id, name }) => ({ id, name }));
    }
    /**
     * List all bases inside a specific space.
     *
     * @param spaceId - Space ID.
     * @returns Array of `{ id, name }` for each base.
     */
    async listBasesInSpace(spaceId) {
        const data = await this.request("GET", `/space/${spaceId}/base`);
        return (data ?? []).map(({ id, name }) => ({ id, name }));
    }
    /**
     * List all tables inside a specific base.
     *
     * @param baseId - Base ID.
     * @returns Array of `{ id, name }` for each table.
     */
    async listTablesInBase(baseId) {
        const data = await this.request("GET", `/base/${baseId}/table`);
        return (data ?? []).map(({ id, name }) => ({ id, name }));
    }
}
//# sourceMappingURL=teable-client.js.map