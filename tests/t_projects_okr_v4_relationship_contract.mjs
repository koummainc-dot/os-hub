import assert from "node:assert/strict";
import fs from "node:fs";
import * as D from "../src/systems/projects/domain.js";

const screens=fs.readFileSync(new URL("../src/systems/projects/screens_c.jsx",import.meta.url),"utf8");
const parts=fs.readFileSync(new URL("../src/systems/projects/parts.jsx",import.meta.url),"utf8");
const okrs=screens.slice(screens.indexOf("export function Okrs()"),screens.indexOf("// ═════ Stakeholder updates"));
const taskForm=parts.slice(parts.indexOf("export function TaskForm"),parts.indexOf("// ── Task tree"));
const projectScreens=fs.readFileSync(new URL("../src/systems/projects/screens_b.jsx",import.meta.url),"utf8");
const projectOkr=projectScreens.slice(projectScreens.indexOf("function ProjectOkr"),projectScreens.indexOf("function RelatedTab"));

assert.ok(okrs.includes("D.objectiveTaskExecution(o, krs, idx)"),"Objective execution uses the v4 derived domain path");
assert.ok(projectOkr.includes("D.objectivesForProject(p.id, data.objectives, data.krs)"),"Project detail derives Objectives through linked KRs");
assert.ok(!projectOkr.includes("o.project_ids"),"Project detail does not read the forbidden Objective→Project legacy field");
assert.ok(okrs.includes("const linkedTasks = taskExecution.tasks"),"Objective task list uses the same derived relationship");
assert.ok(okrs.includes("startObjectiveTask(o, krs)"),"Objective task creation starts from its linked KR projects");
assert.ok(okrs.includes("allowedProjectIds={taskAllowedProjectIds}"),"Objective task creation is restricted to linked projects");
assert.ok(okrs.includes("taskProjectForm.projectIds"),"Multiple linked projects require explicit project selection");
assert.ok(!okrs.includes("setTaskForm({ objective_id: o.id })"),"Objective task creation no longer writes a direct objective_id");
assert.ok(!taskForm.includes('key: "objective_id"'),"Task form no longer exposes direct Task→Objective storage");
assert.ok(taskForm.includes("allowedProjectIds"),"Task form supports restricting the project picker");
assert.ok(okrs.includes('label: "المشاريع المرتبطة"'),"All KR types can link supporting Projects");
assert.ok(okrs.includes("دون تغيير قياسها"),"Numeric KR measurement remains separate from supporting task execution");
const objective={id:"objective-v4",status:"Active"};
const kr={id:"kr-v4",objective_id:objective.id,status:"Active",project_ids:["project-v4"],type:"Numeric",initial_value:0,target_value:10,current_value:2};
const task={id:"task-v4",project_id:"project-v4",status:"Completed",title:"Task linked through KR project"};
const idx={list:[task],byId:{[task.id]:task},isLeaf:()=>true};
assert.deepEqual(D.objectivesForProject("project-v4",[objective],[kr]).map(item=>item.id),[objective.id],"Project → KR → Objective reverse lookup follows the v4 canonical relation");
const execution=D.objectiveTaskExecution(objective,[kr],idx);
assert.deepEqual(execution.tasks.map(item=>item.id),[task.id],"Objective execution derives Tasks through KR.project_ids → Task.project_id");
assert.equal(execution.progress,1,"derived objective execution progress counts completed leaf tasks");
assert.deepEqual(D.objectivesForProject("unlinked-project",[objective],[kr]),[],"an unlinked Project is not attached to the Objective");

console.log("t_projects_okr_v4_relationship_contract: OK");
