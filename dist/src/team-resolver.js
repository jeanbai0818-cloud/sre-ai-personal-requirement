// Teable field names in the member mapping table.
const MEMBER_FIELDS = {
    WORK_CODE: "工号",
    NAME: "姓名",
    YACH_ID: "YachID",
    GROUP_ID: "组ID",
};
const REQUIRED_MEMBER_FIELDS = [
    MEMBER_FIELDS.WORK_CODE,
    MEMBER_FIELDS.NAME,
    MEMBER_FIELDS.YACH_ID,
    MEMBER_FIELDS.GROUP_ID,
];
const CACHE_TTL_MS = 60_000;
export class TeamResolver {
    teable;
    config;
    cachedRecords = null;
    cacheExpiresAt = 0;
    constructor(teable, config) {
        this.teable = teable;
        this.config = config;
    }
    async getMembers() {
        const now = Date.now();
        if (this.cachedRecords !== null && now < this.cacheExpiresAt) {
            return this.cachedRecords;
        }
        const raw = await this.teable.listRecords(this.config.member_table_id);
        // Validate schema against required fields using the first record as a sample.
        if (raw.length > 0) {
            const firstFields = raw[0].fields;
            const missing = REQUIRED_MEMBER_FIELDS.filter((f) => !(f in firstFields));
            if (missing.length > 0) {
                throw new Error(`Member table ${this.config.member_table_id} is missing required fields: ${missing.join(", ")}. ` +
                    `Update MEMBER_FIELDS in src/team-resolver.ts if the field names differ.`);
            }
        }
        const records = raw
            .filter((rec) => rec.fields["是否启用"] === "是")
            .map((rec) => {
            const f = rec.fields;
            return {
                recordId: rec.id,
                workCode: String(f[MEMBER_FIELDS.WORK_CODE] ?? "").trim(),
                name: String(f[MEMBER_FIELDS.NAME] ?? "").trim(),
                yachId: String(f[MEMBER_FIELDS.YACH_ID] ?? "").trim(),
                group: String(f[MEMBER_FIELDS.GROUP_ID] ?? "").trim(),
                raw: f,
            };
        });
        this.cachedRecords = records;
        this.cacheExpiresAt = now + CACHE_TTL_MS;
        return records;
    }
    async resolveByWorkCode(workCode) {
        const members = await this.getMembers();
        const wc = workCode.trim();
        return (members.find((m) => m.workCode === wc ||
            m.workCode.replace(/^0+/, "") === wc.replace(/^0+/, "")) ?? null);
    }
    async resolveByYachId(yachId) {
        const members = await this.getMembers();
        const id = yachId.trim();
        return members.find((m) => m.yachId === id) ?? null;
    }
    resolveTeamBase(teamCode) {
        return this.config.teams[teamCode] ?? null;
    }
}
//# sourceMappingURL=team-resolver.js.map