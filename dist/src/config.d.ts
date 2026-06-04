/**
 * Plugin configuration shape matching openclaw.plugin.json configSchema.
 */
export interface PluginConfig {
    /** Teable base URL, e.g. "https://yach-teable.zhiyinlou.com" */
    teable_base_url: string;
    /** Teable API base URL, e.g. "https://yach-teable.zhiyinlou.com/api" */
    teable_api_base: string;
    /** Base ID of the member roster (花名册) base */
    member_base_id: string;
    /** Table ID of the member roster (花名册) table */
    member_table_id: string;
    /** Relative path (from agent workspace root) to the per-user token YAML file */
    token_storage_relpath: string;
    /** Team registry: team code → { base_id, label } */
    teams: Record<string, {
        base_id: string;
        label: string;
    }>;
    /** Month (1–12) when the fiscal year starts. Default 3 (March). */
    fiscal_year_start_month: number;
}
/**
 * Merge a raw plugin config object (possibly partial or undefined) with
 * the schema defaults. Values present in `raw` take precedence.
 *
 * @param raw - The value of `config` passed to the plugin `register()` call.
 * @returns A fully-populated PluginConfig.
 */
export declare function resolveConfig(raw: unknown): PluginConfig;
/**
 * Resolve the absolute path to the token file.
 *
 * - If `relpath` starts with `~/`, expands the leading `~` to the user home directory.
 * - If `relpath` is already absolute, returns it as-is.
 * - Otherwise, joins `agentWorkspaceDir` with `relpath`.
 *
 * @param agentWorkspaceDir - Absolute path to the agent's workspace root.
 * @param relpath           - Relative (or absolute, or `~/`-prefixed) token path.
 * @returns Absolute path to the token file.
 */
export declare function expandTokenPath(agentWorkspaceDir: string, relpath: string): string;
