import * as path from "path";
import * as os from "os";
/** Default values matching openclaw.plugin.json exactly. */
const DEFAULTS = {
    teable_base_url: "https://yach-teable.zhiyinlou.com",
    teable_api_base: "https://yach-teable.zhiyinlou.com/api",
    member_base_id: "bseGOjceaTfP9RSsIR3",
    member_table_id: "tblx3kjDWlSgoZz3As4",
    token_storage_relpath: ".teable-token.yaml",
    teams: {
        sre1: { base_id: "bseujjqSjHo80IHoJSo", label: "业务SRE一组" },
        sre2: { base_id: "bseJnE4Uv0taLrl1YhU", label: "业务SRE二组" },
        dba: { base_id: "bseyYY6pg0xuUFHybPj", label: "数据库组" },
        network: { base_id: "bsewaMgiZ76TzgdM2JK", label: "基础系统服务组" },
        platform: { base_id: "bsergAJm0oSP1tK9QGU", label: "基础服务中台负责人" },
    },
    fiscal_year_start_month: 3,
};
/**
 * Merge a raw plugin config object (possibly partial or undefined) with
 * the schema defaults. Values present in `raw` take precedence.
 *
 * @param raw - The value of `config` passed to the plugin `register()` call.
 * @returns A fully-populated PluginConfig.
 */
export function resolveConfig(raw) {
    if (raw == null || typeof raw !== "object") {
        return { ...DEFAULTS, teams: { ...DEFAULTS.teams } };
    }
    const r = raw;
    return {
        teable_base_url: typeof r["teable_base_url"] === "string"
            ? r["teable_base_url"]
            : DEFAULTS.teable_base_url,
        teable_api_base: typeof r["teable_api_base"] === "string"
            ? r["teable_api_base"]
            : DEFAULTS.teable_api_base,
        member_base_id: typeof r["member_base_id"] === "string"
            ? r["member_base_id"]
            : DEFAULTS.member_base_id,
        member_table_id: typeof r["member_table_id"] === "string"
            ? r["member_table_id"]
            : DEFAULTS.member_table_id,
        token_storage_relpath: typeof r["token_storage_relpath"] === "string"
            ? r["token_storage_relpath"]
            : DEFAULTS.token_storage_relpath,
        teams: r["teams"] != null && typeof r["teams"] === "object"
            ? r["teams"]
            : { ...DEFAULTS.teams },
        fiscal_year_start_month: typeof r["fiscal_year_start_month"] === "number"
            ? r["fiscal_year_start_month"]
            : DEFAULTS.fiscal_year_start_month,
    };
}
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
export function expandTokenPath(agentWorkspaceDir, relpath) {
    if (relpath.startsWith("~/")) {
        return path.join(os.homedir(), relpath.slice(2));
    }
    if (path.isAbsolute(relpath)) {
        return relpath;
    }
    return path.join(agentWorkspaceDir, relpath);
}
//# sourceMappingURL=config.js.map