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
export function getFiscalQuarter(date, fyStartMonth) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // convert 0-based to 1-based
    // Fiscal year: the year in which the FY *ends*.
    // If we are at or past the FY start month, we are in the FY that ends next year.
    const fy = month >= fyStartMonth ? year + 1 : year;
    // Offset in months from the start of the fiscal year (0 = first month of Q1).
    let offset = month - fyStartMonth;
    if (offset < 0)
        offset += 12;
    // Map offset [0–11] → quarter [1–4]
    const q = (Math.floor(offset / 3) + 1);
    // Use 2-digit short year for label (e.g. FY27Q1), fy field keeps 4-digit year.
    const fyShort = fy % 100;
    return { fy, q, label: `FY${String(fyShort).padStart(2, "0")}Q${q}` };
}
/**
 * Format the Teable table name for a person's quarterly requirement sheet.
 * Uses the person's Chinese name directly (no pinyin conversion).
 *
 * @example
 * formatTeableTableName("王海东", "039240", "FY27Q1") // → "王海东-039240-FY27Q1"
 */
export function formatTeableTableName(name, workCode, quarterLabel) {
    return `${name.trim()}-${workCode}-${quarterLabel}`;
}
//# sourceMappingURL=quarter.js.map