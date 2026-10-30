import { supabase } from "../../core/supabase.js";

const MISSING_OBJECT_CODES = new Set(["PGRST202","PGRST205","42883","42P01","42703"]);
const MISSING_OBJECT_MESSAGE = /could not find the function|function .* does not exist|relation .* does not exist|schema cache/i;
const missingObject = error => !!error && (MISSING_OBJECT_CODES.has(error.code) || MISSING_OBJECT_MESSAGE.test(error.message || ""));
const hasLearningContent = snapshot => !!snapshot && ["areas","courses","units","lessons","sessions","skills","assessments","careerGoals","vocabulary","reviewLogs"].some(key=>Array.isArray(snapshot[key])&&snapshot[key].length>0);

export async function loadNormalizedLearning(workspaceId) {
  if(!workspaceId||!supabase||typeof supabase.rpc!=="function") return {available:false,reason:"supabase-client-unavailable"};
  try {
    const {data,error}=await supabase.rpc("learning_load_snapshot",{p_workspace_id:workspaceId});
    if(error) {
      if(missingObject(error)) return {available:false,reason:"migration-not-applied"};
      return {available:true,error};
    }
    return {available:true,data:data?.data||null,updatedAt:data?.updatedAt||null,hasContent:hasLearningContent(data?.data)};
  } catch(error) { return {available:true,error}; }
}

export async function saveNormalizedLearning(workspaceId,snapshot,expectedUpdatedAt=null) {
  if(!workspaceId||!supabase||typeof supabase.rpc!=="function") return {available:false,reason:"supabase-client-unavailable"};
  try {
    const {data,error}=await supabase.rpc("learning_save_snapshot",{
      p_workspace_id:workspaceId,
      p_snapshot:snapshot,
      p_expected_updated_at:expectedUpdatedAt,
    });
    if(error) {
      if(missingObject(error)) return {available:false,reason:"migration-not-applied"};
      return {available:true,ok:false,error};
    }
    return {available:true,ok:!!data?.ok,conflict:!!data?.conflict,updatedAt:data?.updatedAt||null};
  } catch(error) { return {available:true,ok:false,error}; }
}
