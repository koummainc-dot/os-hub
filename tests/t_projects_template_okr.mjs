import assert from "node:assert/strict";
import { parseObjectiveTemplates, flattenObjectiveTemplates, flattenKeyResultTemplates, objectiveTemplateSummary } from "../src/systems/projects/templateOkr.js";
import { instantiateProjectTemplate, projectToTemplateSeed } from "../src/systems/projects/domain.js";

function makeId() {
  let sequence = 0;
  return () => "new_" + (++sequence);
}

const taskTree = [
  { title: "Build interface" },
  { title: "Test launch" },
  { title: "Publish launch", children: [{ title: "Prepare release notes" }] },
];

{
  const objectivesText = [
    "growth | Accelerate growth | Improve sustainable revenue",
    "delivery | Reliable delivery | Reduce launch risk",
  ].join("\n");
  const keyResultsText = [
    "growth | Increase MRR | Numeric | USD | 100 | 250 | Build interface; Test launch",
    "delivery | Ship launch | Project Based | Publish launch; Prepare release notes",
  ].join("\n");
  const parsed = parseObjectiveTemplates(objectivesText, keyResultsText, taskTree);
  const summary = objectiveTemplateSummary(parsed);
  assert.deepEqual(summary, { objective_count: 2, kr_count: 2, task_link_count: 4 });
  assert.equal(parsed[0].key_results[0].current_value, undefined, "template definitions do not carry live check-in values");
  assert.equal(parsed[0].key_results[0].initial_value, 100);
  assert.equal(parsed[0].key_results[0].target_value, 250);
  assert.deepEqual(parsed[0].key_results[0].task_titles, ["Build interface", "Test launch"]);
  assert.equal(parsed[1].key_results[0].type, "Project Based");
  const reparsed = parseObjectiveTemplates(
    flattenObjectiveTemplates(parsed),
    flattenKeyResultTemplates(parsed),
    taskTree
  );
  assert.deepEqual(reparsed, parsed, "Objective and KR definitions round-trip through the template editor text fields");
}

{
  const parsed = parseObjectiveTemplates(
    "launch | Launch platform |",
    "launch | Complete launch | Project Based | Build interface",
    taskTree
  );
  const ids = makeId();
  const bundle = instantiateProjectTemplate(
    {
      id: "tpl-okr", name: "Launch template", duration_days: 30,
      task_tree: taskTree,
      objective_templates: parsed,
    },
    { name: "Launch project", start_date: "2026-11-01", target_date: "2026-12-01", lead_id: "lead_1" },
    ids
  );
  assert.equal(bundle.objectives.length, 1);
  assert.equal(bundle.krs.length, 1);
  assert.equal(bundle.objectives[0].name, "Launch platform");
  assert.equal(bundle.objectives[0].period_start, "2026-11-01");
  assert.equal(bundle.objectives[0].period_end, "2026-12-01");
  assert.equal(bundle.objectives[0].project_ids, undefined, "Objective must not store a deprecated direct Project relation");
  assert.equal(bundle.krs[0].objective_id, bundle.objectives[0].id);
  assert.deepEqual(bundle.krs[0].project_ids, [bundle.project.id]);
  const linkedTask = bundle.tasks.find((task) => task.title === "Build interface");
  assert.deepEqual(bundle.krs[0].task_ids, [linkedTask.id]);
  assert.equal(bundle.krs[0].owner_id, "lead_1");
}

{
  const parsed = parseObjectiveTemplates(
    "metrics | Improve retention",
    "metrics | Improve retained customers | Numeric | % | 20 | 40 | Test launch",
    taskTree
  );
  const bundle = instantiateProjectTemplate(
    { name: "Numeric template", task_tree: taskTree, objective_templates: parsed },
    { name: "Numeric project", start_date: "2026-11-01", target_date: "2026-12-01" },
    makeId()
  );
  assert.equal(bundle.krs[0].initial_value, 20);
  assert.equal(bundle.krs[0].target_value, 40);
  assert.equal(bundle.krs[0].current_value, 20, "a new Numeric KR begins at its declared baseline, not the source's live value");
  assert.equal(bundle.krs[0].project_ids[0], bundle.project.id);
  assert.equal(bundle.krs[0].task_ids[0], bundle.tasks.find((task) => task.title === "Test launch").id);
}

{
  const seed = projectToTemplateSeed(
    {
      id: "source-project", name: "Source project", type: "business",
      start_date: "2026-10-01", target_date: "2026-11-01",
    },
    {
      tasks: [
        { id: "source-task-1", project_id: "source-project", title: "Build interface" },
        { id: "source-task-2", project_id: "source-project", title: "Test launch" },
        { id: "other-task", project_id: "other-project", title: "Do not include" },
      ],
      objectives: [
        { id: "objective-1", name: "Growth objective", why: "Scale sustainably" },
        { id: "unrelated-objective", name: "Unrelated objective" },
      ],
      krs: [
        {
          id: "numeric-source", objective_id: "objective-1", name: "Increase MRR",
          type: "Numeric", unit: "USD", initial_value: 100, target_value: 250,
          current_value: 190, project_ids: ["source-project"], task_ids: ["source-task-1"],
        },
        {
          id: "project-source", objective_id: "objective-1", name: "Ship project",
          type: "Project Based", project_ids: ["source-project"],
          task_ids: ["source-task-2"],
        },
        {
          id: "unrelated-kr", objective_id: "unrelated-objective", name: "Other project KR",
          type: "Project Based", project_ids: ["other-project"], task_ids: ["other-task"],
        },
      ],
      prds: [], outputs: [], risks: [],
    }
  );
  assert.equal(seed.objective_templates.length, 1, "only Objectives reached through a supporting KR.project_ids link are converted");
  assert.equal(seed.objective_templates[0].key_results.length, 2);
  const numeric = seed.objective_templates[0].key_results.find((kr) => kr.name === "Increase MRR");
  assert.equal(numeric.current_value, undefined, "source KR live progress is not copied into the template");
  assert.equal(numeric.initial_value, 100);
  assert.equal(numeric.target_value, 250);
  assert.deepEqual(numeric.task_titles, ["Build interface"]);
  const projectBased = seed.objective_templates[0].key_results.find((kr) => kr.name === "Ship project");
  assert.deepEqual(projectBased.task_titles, ["Test launch"]);
  assert.ok(!JSON.stringify(seed.objective_templates).includes("Do not include"));
}

{
  assert.throws(() => parseObjectiveTemplates(
    "growth | Growth\n growth | Duplicate",
    "growth | KR | Project Based",
    taskTree
  ), /مكرر/);
  assert.throws(() => parseObjectiveTemplates(
    "growth | Growth",
    "missing | KR | Project Based",
    taskTree
  ), /غير موجود/);
  assert.throws(() => parseObjectiveTemplates(
    "growth | Growth",
    "growth | KR | Numeric | USD | 0 | 0",
    taskTree
  ), /تختلف/);
  assert.throws(() => parseObjectiveTemplates(
    "growth | Growth",
    "growth | KR | Project Based | Unknown task",
    taskTree
  ), /غير موجود/);
  assert.throws(() => parseObjectiveTemplates(
    "growth | Growth",
    "",
    taskTree
  ), /لا يحتوي على نتيجة رئيسية/);
  assert.throws(() => parseObjectiveTemplates(
    "growth | Growth",
    "growth | KR | Project Based | Build interface",
    [{ title: "Build interface" }, { title: "Build interface" }]
  ), /مكررة/);
}

{
  const parsed = parseObjectiveTemplates(
    "growth | Growth",
    "growth | KR | Project Based | Build interface",
    taskTree
  );
  assert.throws(() => instantiateProjectTemplate(
    { name: "No dates", task_tree: taskTree, objective_templates: parsed },
    { name: "No dates project", start_date: "2026-11-01" },
    makeId()
  ), /موعد مستهدف/);
  assert.deepEqual(parseObjectiveTemplates("", "", taskTree), [], "templates without OKRs remain valid");
}

console.log("PASS Projects Objective/KR template parser, conversion and instantiation");
