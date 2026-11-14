import fs from "node:fs";
import assert from "node:assert/strict";

const files=[
  "src/systems/projects/documentation/DocumentationCenter.jsx",
  "src/systems/projects/documentation/documentationCatalog.js",
  "src/systems/projects/documentation/documentation.css",
  "docs/projects-documentation/README_AR.md",
  "docs/projects-documentation/01-navigation-and-screens.md",
  "docs/projects-documentation/02-buttons-and-actions.md",
  "docs/projects-documentation/03-fields-and-forms.md",
  "docs/projects-documentation/04-workflows.md",
  "docs/projects-documentation/05-relationships-and-data-flow.md",
  "docs/projects-documentation/06-integrations.md",
  "docs/projects-documentation/07-states-permissions-and-errors.md",
  "docs/projects-documentation/08-technical-reference.md",
  "docs/projects-documentation/09-coverage-report.md",
  "docs/projects-documentation/10-complete-operating-manual.md",
  "docs/projects-documentation/11-field-and-form-dictionary.md",
  "docs/projects-documentation/12-daily-work-portfolio-operating-guide.md",
  "docs/projects-documentation/13-project-workspace-operating-guide.md",
  "docs/projects-documentation/12-release-acceptance-checklist.md",
  "docs/projects-documentation/traceability-index.json"
];
for(const file of files) assert.ok(fs.existsSync(file),`missing ${file}`);
const index=fs.readFileSync("src/systems/projects/index.jsx","utf8");
assert.match(index,/DocumentationCenter/);
assert.match(index,/documentation:\s*DocumentationPage/);
assert.match(index,/id:\s*"help"/);
const catalog=fs.readFileSync("src/systems/projects/documentation/documentationCatalog.js","utf8");
for(const id of ["screen-dashboard","project-header-actions","workspace-tabs","objective-kr-project-task","prd-task-output","knowledge-integration","finance-integration","outputs-storage","complete-operating-manual","field-and-form-dictionary","release-acceptance-checklist","project-workspace-operating-guide"]) assert.match(catalog,new RegExp(id));
const component=fs.readFileSync("src/systems/projects/documentation/DocumentationCenter.jsx","utf8");
for(const token of ["بحث التوثيق","targetPage","initialArticleId","DOCUMENTATION_STATUS","DOCUMENTATION_SECTIONS"]) assert.match(component,new RegExp(token));
const css=fs.readFileSync("src/systems/projects/documentation/documentation.css","utf8");
assert.match(css,/\\.projects-documentation/);
assert.match(css,/max-width:760px/);
console.log("t_projects_documentation_center: PASS");
