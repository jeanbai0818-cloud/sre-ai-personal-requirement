import { createBootstrapTool } from "./requirement-bootstrap.js";
import { createPreviewTool } from "./requirement-preview.js";
import { createRecordTool } from "./requirement-record.js";
export function registerRequirementTools(api) {
    api.registerTool((ctx) => createBootstrapTool(api, ctx));
    api.registerTool((ctx) => createPreviewTool(api, ctx));
    api.registerTool((ctx) => createRecordTool(api, ctx));
}
//# sourceMappingURL=index.js.map