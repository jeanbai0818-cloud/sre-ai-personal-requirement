/**
 * Fiscal year and quarter helpers.
 *
 * Fiscal year convention (example: fyStartMonth = 3):
 *   FY27 = 2026-03 through 2027-02
 *
 * Rule:
 *   if month >= fyStartMonth  →  fy = year + 1
 *   if month <  fyStartMonth  →  fy = year
 *
 * Quarters within the fiscal year:
 *   Q1 = [fyStartMonth, fyStartMonth+1, fyStartMonth+2]
 *   Q2 = next 3 months (wrapping around December if needed)
 *   Q3 = next 3 months
 *   Q4 = last 3 months
 *
 * All functions are pure — they never call Date.now() internally.
 */
/** Result returned by {@link getFiscalQuarter}. */
export interface FiscalQuarterResult {
    /** Fiscal year number. E.g. 27 means FY27 (year ending in 2027). */
    fy: number;
    /** Quarter within the fiscal year (1–4). */
    q: 1 | 2 | 3 | 4;
    /** Human-readable label, e.g. "FY27Q1". */
    label: string;
}
/**
 * Compute the fiscal year, quarter, and label for a given calendar date.
 *
 * @param date          - The date to evaluate (caller supplies; never calls Date.now() internally).
 * @param fyStartMonth  - Month number (1–12) when the fiscal year begins. Default is 3 (March).
 * @returns `{ fy, q, label }` where fy is the 4-digit year in which the FY *ends*.
 *
 * @example
 * // With fyStartMonth = 3:
 * getFiscalQuarter(new Date("2026-03-01"), 3) // → { fy: 27, q: 1, label: "FY27Q1" }
 * getFiscalQuarter(new Date("2027-02-28"), 3) // → { fy: 27, q: 4, label: "FY27Q4" }
 * getFiscalQuarter(new Date("2025-12-01"), 3) // → { fy: 26, q: 3, label: "FY26Q3" }
 */
export declare function getFiscalQuarter(date: Date, fyStartMonth: number): FiscalQuarterResult;
/**
 * Format the canonical Vika datasheet table name for a person's quarterly requirement sheet.
 *
 * @param ownerNamePinyin - Owner's full name in Pinyin (spaces allowed; will be lowercased
 *                          and spaces replaced with hyphens).
 * @param ownerWorkCode   - Owner's work code / employee ID (used verbatim).
 * @param quarterLabel    - Quarter label as returned by {@link getFiscalQuarter}, e.g. "FY2027Q1".
 * @returns Formatted table name, e.g. `"zhangsan-039240-FY2027Q1"`.
 *
 * @example
 * formatTableName("Zhang San", "039240", "FY2027Q1")
 * // → "zhang-san-039240-FY2027Q1"
 */
export declare function formatTableName(ownerNamePinyin: string, ownerWorkCode: string, quarterLabel: string): string;
/**
 * Format the Teable table name for a person's quarterly requirement sheet.
 * Uses the person's Chinese name directly (no pinyin conversion).
 *
 * @example
 * formatTeableTableName("王海东", "039240", "FY27Q1") // → "王海东-039240-FY27Q1"
 */
export declare function formatTeableTableName(name: string, workCode: string, quarterLabel: string): string;
