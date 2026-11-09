const clean = (value) => String(value || "").trim();
const numberText = (value) => value == null || value === "" ? "" : String(value);

function taskIndex(tree) {
  const counts = new Map();
  const walk = (nodes) => (nodes || []).forEach((node) => {
    const title = clean(node.title);
    counts.set(title, (counts.get(title) || 0) + 1);
    walk(node.children || []);
  });
  walk(tree || []);
  return counts;
}

export function parseObjectiveTemplates(objectivesText, keyResultsText, tree = []) {
  const objectives = [];
  const byKey = new Map();
  const objectiveNames = new Set();

  for (const [index, raw] of String(objectivesText || "").split("\n").entries()) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split("|").map(clean);
    if (parts.length < 2 || parts.length > 3) {
      throw new Error("سطر الهدف " + (index + 1) + ": الصيغة هي المفتاح | اسم الهدف | لماذا؟ (اختياري).");
    }
    const [key, name, why = ""] = parts;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,39}$/.test(key)) {
      throw new Error("سطر الهدف " + (index + 1) + ": المفتاح يجب أن يكون فريدًا من أحرف وأرقام وشرطة وشرطة سفلية.");
    }
    if (!name) throw new Error("سطر الهدف " + (index + 1) + ": اسم الهدف مطلوب.");
    if (byKey.has(key)) throw new Error("مفتاح الهدف مكرر: " + key);
    if (objectiveNames.has(name)) throw new Error("اسم الهدف مكرر داخل القالب: " + name);
    objectiveNames.add(name);
    const objective = { key, name, why, key_results: [] };
    byKey.set(key, objective);
    objectives.push(objective);
  }

  const taskCounts = taskIndex(tree);
  for (const [index, raw] of String(keyResultsText || "").split("\n").entries()) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split("|").map(clean);
    const [objectiveKey, name, type] = parts;
    const objective = byKey.get(objectiveKey);
    if (!objective) throw new Error("سطر النتيجة " + (index + 1) + ": مفتاح الهدف «" + objectiveKey + "» غير موجود.");
    if (!name) throw new Error("سطر النتيجة " + (index + 1) + ": اسم النتيجة الرئيسية مطلوب.");
    if (!["Project Based", "Numeric"].includes(type)) {
      throw new Error("سطر النتيجة " + (index + 1) + ": النوع المقبول هو Project Based أو Numeric.");
    }

    let unit = "";
    let initialValue = null;
    let targetValue = null;
    let taskText = "";
    if (type === "Project Based") {
      if (parts.length < 3 || parts.length > 4) {
        throw new Error("سطر النتيجة " + (index + 1) + ": صيغة Project Based هي مفتاح الهدف | اسم النتيجة | Project Based | عناوين المهام مفصولة بـ ; (اختياري).");
      }
      taskText = parts[3] || "";
    } else {
      if (parts.length < 6 || parts.length > 7) {
        throw new Error("سطر النتيجة " + (index + 1) + ": Numeric تتطلب الوحدة | القيمة الابتدائية | القيمة المستهدفة | عناوين المهام الاختيارية.");
      }
      unit = parts[3] || "";
      if (!parts[4] || !parts[5] || !Number.isFinite(Number(parts[4])) || !Number.isFinite(Number(parts[5]))) {
        throw new Error("سطر النتيجة " + (index + 1) + ": أدخل قيمتي البداية والهدف رقميًا؛ لن يخترع القالب قيمًا غير محددة.");
      }
      initialValue = Number(parts[4]);
      targetValue = Number(parts[5]);
      if (initialValue === targetValue) throw new Error("سطر النتيجة " + (index + 1) + ": القيمة المستهدفة يجب أن تختلف عن الابتدائية.");
      taskText = parts[6] || "";
    }

    const taskTitles = taskText ? taskText.split(";").map(clean).filter(Boolean) : [];
    if (new Set(taskTitles).size !== taskTitles.length) {
      throw new Error("سطر النتيجة " + (index + 1) + ": لا تكرر عنوان المهمة ضمن مجموعة التنفيذ.");
    }
    for (const title of taskTitles) {
      const count = taskCounts.get(title) || 0;
      if (count !== 1) {
        throw new Error("سطر النتيجة " + (index + 1) + ": المهمة «" + title + "» " + (count ? "مكررة" : "غير موجودة") + " في شجرة المهام.");
      }
    }
    if (objective.key_results.some((item) => item.name === name)) {
      throw new Error("اسم النتيجة الرئيسية مكرر ضمن الهدف «" + objective.name + "»: " + name);
    }
    objective.key_results.push({
      name,
      type,
      ...(type === "Numeric" ? { unit, initial_value: initialValue, target_value: targetValue } : {}),
      task_titles: taskTitles,
    });
  }

  for (const objective of objectives) {
    if (!objective.key_results.length) {
      throw new Error("الهدف «" + objective.name + "» لا يحتوي على نتيجة رئيسية؛ أضف KR واحدًا على الأقل أو أزل الهدف من القالب.");
    }
  }
  return objectives;
}

export function flattenObjectiveTemplates(objectives = []) {
  return objectives.map((objective) =>
    [objective.key, objective.name, objective.why || ""].join(" | ").replace(/\s+$/, "")
  ).join("\n");
}

export function flattenKeyResultTemplates(objectives = []) {
  const lines = [];
  for (const objective of objectives) {
    for (const kr of objective.key_results || []) {
      const tasks = (kr.task_titles || []).join("; ");
      if (kr.type === "Numeric") {
        lines.push([
          objective.key,
          kr.name,
          "Numeric",
          kr.unit || "",
          numberText(kr.initial_value),
          numberText(kr.target_value),
          tasks,
        ].join(" | "));
      } else {
        lines.push([objective.key, kr.name, "Project Based", tasks].join(" | "));
      }
    }
  }
  return lines.join("\n");
}

export function objectiveTemplateSummary(objectives = []) {
  return {
    objective_count: objectives.length,
    kr_count: objectives.reduce((sum, objective) => sum + (objective.key_results || []).length, 0),
    task_link_count: objectives.reduce((sum, objective) =>
      sum + (objective.key_results || []).reduce((count, kr) => count + (kr.task_titles || []).length, 0), 0),
  };
}
