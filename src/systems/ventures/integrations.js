import { supabase } from "../../core/supabase.js";

const asList = (rows) => Array.isArray(rows) ? rows : [];

export async function loadVenturesSourceSnapshot(workspaceId) {
  if (!workspaceId || !supabase) return { ok:false, reason:"workspace-required", sources:{} };
  const sources = {};
  const errors = {};

  async function records(systemId) {
    const { data, error } = await supabase
      .from("workspace_records")
      .select("collection,id,data,deleted,updated_at")
      .eq("workspace_id", workspaceId)
      .eq("system_id", systemId)
      .eq("deleted", false)
      .order("updated_at", { ascending:false })
      .limit(1000);
    if (error) throw error;
    return (data||[]).map(row => ({ ...(row.data||{}), id:row.id, collection:row.collection, updated_at:row.updated_at }));
  }

  async function workspaceData(systemId) {
    const { data, error } = await supabase
      .from("workspace_data")
      .select("data,updated_at")
      .eq("workspace_id", workspaceId)
      .eq("system_id", systemId)
      .eq("part", "main")
      .maybeSingle();
    if (error) throw error;
    return { data:data?.data||{}, updatedAt:data?.updated_at||null };
  }

  const jobs = [
    ["projects", async()=>records("projects")],
    ["content", async()=>records("content")],
    ["finance", async()=>workspaceData("finance")],
    ["knowledge", async()=>{ const {data,error}=await supabase.rpc("knowledge_load_snapshot",{p_workspace_id:workspaceId}); if(error) throw error; return data?.data||{}; }],
  ];

  await Promise.all(jobs.map(async ([key,fn]) => {
    try { sources[key]=await fn(); } catch (error) { errors[key]={message:error?.message||String(error),code:error?.code||null}; }
  }));

  return { ok:Object.keys(sources).length>0, sources, errors };
}

export function requestVenturesSourceWrite({workspaceId, systemId, action, recordId=null, payload={}}={}) {
  if (!systemId || typeof window === "undefined") return false;
  try {
    window.dispatchEvent(new CustomEvent("os:source-write", {
      detail: { workspaceId: workspaceId || null, systemId, action: action || "update", recordId: recordId || null, payload: payload || {}, source: "ventures" }
    }));
    return true;
  } catch { return false; }
}

export function requestVenturesSourceNavigation({workspaceId, systemId, section, recordId=null}={}) {
  if (!systemId || typeof window === "undefined") return false;
  try {
    window.dispatchEvent(new CustomEvent("os:goto", {
      detail: { workspaceId: workspaceId || null, view: "system", system: systemId, section: section || null, recordId: recordId || null, source: "ventures" }
    }));
    return true;
  } catch { return false; }
}

export function sourceSummary(snapshot={}) {
  const projects=asList(snapshot.sources?.projects);
  const content=asList(snapshot.sources?.content);
  const finance=snapshot.sources?.finance?.data||{};
  const knowledge=snapshot.sources?.knowledge||{};
  const financeRows=Object.values(finance).flatMap(v=>Array.isArray(v)?v:[]);
  const knowledgeRows=["resources","ideas","notes","meetings","events","inbox"].flatMap(k=>asList(knowledge[k]));
  return {
    projects:projects.length,
    content:content.length,
    finance:financeRows.length,
    knowledge:knowledgeRows.length,
    errors:Object.keys(snapshot.errors||{}),
  };
}
