import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-knowledge-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  const expectedSecret = Deno.env.get("KNOWLEDGE_REMINDER_CRON_SECRET");
  const suppliedSecret = req.headers.get("x-knowledge-cron-secret");
  if (!expectedSecret || !suppliedSecret || suppliedSecret !== expectedSecret) {
    return response({ error: "unauthorized" }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return response({ error: "server_configuration_missing" }, 500);

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date();
  const nowIso = now.toISOString();
  const { data: rows, error } = await supabase
    .from("knowledge_reminders")
    .select("id,workspace_id,item_id,title,reminder_type,due_at,status,snoozed_until,delivery_channel,created_by")
    .in("status", ["pending", "snoozed"])
    .eq("delivery_channel", "in_app")
    .lte("due_at", nowIso)
    .order("due_at", { ascending: true })
    .limit(100);

  if (error) return response({ error: "reminder_query_failed", detail: error.message }, 500);

  let delivered = 0;
  let skipped = 0;
  let failed = 0;
  for (const reminder of rows ?? []) {
    if (reminder.status === "snoozed" && reminder.snoozed_until && new Date(reminder.snoozed_until) > now) {
      skipped++;
      continue;
    }
    if (!reminder.created_by) {
      await supabase.from("knowledge_reminders").update({
        status: "failed",
        last_error: "Reminder has no recipient (created_by is null)",
        updated_at: nowIso,
      }).eq("id", reminder.id).eq("status", reminder.status);
      failed++;
      continue;
    }

    const { error: insertError } = await supabase.from("knowledge_notifications").upsert({
      workspace_id: reminder.workspace_id,
      recipient_user_id: reminder.created_by,
      reminder_id: reminder.id,
      title: reminder.title,
      body: `نوع التذكير: ${reminder.reminder_type} • موعده: ${reminder.due_at}`,
    }, { onConflict: "workspace_id,reminder_id", ignoreDuplicates: true });

    if (insertError) {
      await supabase.from("knowledge_reminders").update({
        status: "failed",
        last_error: insertError.message.slice(0, 500),
        updated_at: nowIso,
      }).eq("id", reminder.id).eq("status", reminder.status);
      failed++;
      continue;
    }

    const { error: updateError } = await supabase.from("knowledge_reminders").update({
      status: "sent",
      delivered_at: nowIso,
      last_error: null,
      updated_at: nowIso,
    }).eq("id", reminder.id).eq("status", reminder.status);

    if (updateError) {
      failed++;
    } else {
      delivered++;
    }
  }

  return response({ ok: true, scanned: rows?.length ?? 0, delivered, skipped, failed, delivery: "in_app_only" });
});
