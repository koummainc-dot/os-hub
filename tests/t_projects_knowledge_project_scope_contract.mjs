import assert from "node:assert/strict";
import fs from "node:fs";

const repository = fs.readFileSync(new URL("../src/systems/knowledge/repository.js", import.meta.url), "utf8");
const projectsScreen = fs.readFileSync(new URL("../src/systems/projects/screens_c.jsx", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/migrations/20261113210000_knowledge_project_scoped_links.sql", import.meta.url), "utf8");

assert.match(repository, /\.from\("workspace_records"\)/, "Knowledge Projects must read canonical Projects records");
assert.match(repository, /knowledge_list_project_meetings/, "Knowledge repository must use the server-scoped meeting RPC");
assert.match(repository, /if \(projectId\)\s*\{[\s\S]*?project-scoped-query-not-installed/, "Project-scoped reads must fail closed if the RPC is unavailable");
assert.match(projectsScreen, /listKnowledgeMeetings\(ws\.id, selectedProjectId === "all" \? null : selectedProjectId\)/, "Projects Meetings must request the selected project from Knowledge");
assert.doesNotMatch(projectsScreen, /String\(m\.relatedId\) === String\(projectFilter\)/, "Projects must not locally filter an unscoped Knowledge snapshot");
assert.match(migration, /create or replace function public\.knowledge_list_project_meetings/, "Migration must expose server-scoped meeting reads");
assert.match(migration, /knowledge_external_links/, "Migration must canonicalize external project links");
assert.doesNotMatch(migration, /update\s+public\.workspace_records|delete\s+from\s+public\.workspace_records/i, "Migration must not backfill or delete Projects production records");

console.log("t_projects_knowledge_project_scope_contract: OK");
