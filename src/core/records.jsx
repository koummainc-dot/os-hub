import { useState, useEffect, useRef, useMemo, useCallback, useReducer } from "react";
import { supabase, SUPABASE_SDK_FAILED } from "./supabase.js";
import { canReplayQueuedWrite } from "./recordQueue.js";

// ════════════════════════════════════════════════════════════════════
// Record store — the data layer for every system that stores one row per entity
// (table public.workspace_records). Features:
//  · load all records of (workspace, system) · optimistic updates
//  · per-record optimistic concurrency (compare-and-set on the server's updated_at)
//  · serialized writes per record · soft delete (tombstones) · record-level privacy (visible_to)
//  · Realtime sync between members + incremental re-sync on focus
//  · in-memory demo mode (same API, nothing touches the database)
// ════════════════════════════════════════════════════════════════════

export function uid() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); });
}
export const nowIso = () => new Date().toISOString();

function reducer(state, a) {
  switch (a.type) {
    case "load": return { ...state, recs: a.recs, ready: true, error: null };
    case "put": { const c = { ...(state.recs[a.coll] || {}) }; c[a.rec.id] = a.rec; return { ...state, recs: { ...state.recs, [a.coll]: c } }; }
    case "drop": { const c = { ...(state.recs[a.coll] || {}) }; delete c[a.id]; return { ...state, recs: { ...state.recs, [a.coll]: c } }; }
    case "merge": { const recs = { ...state.recs }; for (const [coll, list] of Object.entries(a.byColl)) { const c = { ...(recs[coll] || {}) }; list.forEach((r) => { if (r._gone) delete c[r.id]; else c[r.id] = r.rec; }); recs[coll] = c; } return { ...state, recs }; }
    case "error": return { ...state, error: a.error, ready: true };
    case "pending": return { ...state, pending: Math.max(0, state.pending + a.d) };
    case "online": return { ...state, online: a.v };
    default: return state;
  }
}

export function useRecordStore({ wsId, systemId, isDemo, demoStore, seed, onToast }) {
  const [state, dispatch] = useReducer(reducer, { recs: {}, ready: false, error: null, pending: 0, online: true });
  const meta = useRef({});          // "coll/id" -> server updated_at (for compare-and-set)
  const chains = useRef({});        // "coll/id" -> promise chain (serialize writes)
  const lastSync = useRef(null);
  const queueKey = "os-record-write-queue:" + wsId + ":" + systemId;
  const queued = useRef([]);
  const replaying = useRef(false);
  const stateRef = useRef(state); stateRef.current = state;
  const readQueue = () => {
    try { const raw = typeof localStorage !== "undefined" ? localStorage.getItem(queueKey) : null; return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  };
  const writeQueue = (items) => {
    queued.current = items;
    try { if (typeof localStorage !== "undefined") { if (items.length) localStorage.setItem(queueKey, JSON.stringify(items)); else localStorage.removeItem(queueKey); } } catch (e) { toast("⚠️ تعذّر حفظ قائمة المزامنة على هذا الجهاز؛ لا تغلق الصفحة قبل عودة الاتصال."); }
  };
  const isNetworkFailure = (e) => {
    const msg = String((e && (e.message || e.details)) || e || "").toLowerCase();
    return typeof navigator !== "undefined" && navigator.onLine === false || /failed to fetch|network|offline|load failed|connection|timeout|timed out|fetch error/.test(msg);
  };
  const toast = onToast || (() => {});

  const key = (coll, id) => coll + "/" + id;
  const toRec = (row) => ({ ...(row.data || {}), id: row.id, _vis: row.visible_to || null, _deleted: !!row.deleted });

  const loadAll = useCallback(async () => {
    if (isDemo) {
      const k = "recs:" + wsId + ":" + systemId;
      if (!demoStore.current[k]) {
        const s = seed ? seed() : {}; const recs = {};
        Object.entries(s).forEach(([coll, list]) => { recs[coll] = {}; list.forEach((r) => { recs[coll][r.id] = r; }); });
        demoStore.current[k] = recs;
      }
      dispatch({ type: "load", recs: demoStore.current[k] });
      return;
    }
    try {
      const recs = {}; let from = 0; const page = 1000; let maxTs = null;
      for (;;) {
        const { data, error } = await supabase.from("workspace_records").select("collection,id,data,deleted,updated_at,visible_to")
          .eq("workspace_id", wsId).eq("system_id", systemId).order("updated_at", { ascending: true }).range(from, from + page - 1);
        if (error) throw error;
        (data || []).forEach((row) => {
          if (!recs[row.collection]) recs[row.collection] = {};
          if (!row.deleted || (row.data && row.data.deleted_at)) recs[row.collection][row.id] = toRec(row);
          meta.current[key(row.collection, row.id)] = row.updated_at;
          if (!maxTs || row.updated_at > maxTs) maxTs = row.updated_at;
        });
        if (!data || data.length < page) break;
        from += page;
      }
      lastSync.current = maxTs;
      const q = readQueue();
      q.forEach((item) => { if (!recs[item.coll]) recs[item.coll] = {}; recs[item.coll][item.rec.id] = { ...item.rec, _syncPending: true }; });
      queued.current = q;
      dispatch({ type: "load", recs });
    } catch (e) {
      console.error("records load failed", e);
      const q = readQueue(); queued.current = q;
      if (q.length) { const recs = {}; q.forEach((item) => { if (!recs[item.coll]) recs[item.coll] = {}; recs[item.coll][item.rec.id] = { ...item.rec, _syncPending: true }; }); dispatch({ type: "load", recs }); toast("⚠️ تعذّر الاتصال بالخادم. عُرضت التعديلات المحلية غير المتزامنة."); }
      else dispatch({ type: "error", error: e });
    }
  }, [wsId, systemId, isDemo]);

  useEffect(() => { dispatch({ type: "load", recs: {} }); stateRef.current = { ...stateRef.current, ready: false }; loadAll(); }, [loadAll]);

  // ── incremental re-sync (focus / reconnect)
  const syncSince = useCallback(async () => {
    if (isDemo || SUPABASE_SDK_FAILED || !lastSync.current) return;
    try {
      let q = supabase.from("workspace_records").select("collection,id,data,deleted,updated_at,visible_to")
        .eq("workspace_id", wsId).eq("system_id", systemId).gt("updated_at", lastSync.current).order("updated_at", { ascending: true }).limit(1000);
      const { data, error } = await q; if (error) throw error;
      if (!data || !data.length) return;
      const byColl = {};
      data.forEach((row) => {
        const k = key(row.collection, row.id);
        if (meta.current[k] === row.updated_at) return;
        meta.current[k] = row.updated_at; if (row.updated_at > lastSync.current) lastSync.current = row.updated_at;
        (byColl[row.collection] = byColl[row.collection] || []).push(row.deleted && !(row.data && row.data.deleted_at) ? { id: row.id, _gone: true } : { id: row.id, rec: toRec(row) });
      });
      if (Object.keys(byColl).length) dispatch({ type: "merge", byColl });
    } catch (e) { console.warn("sync failed", e); }
  }, [wsId, systemId, isDemo]);

  useEffect(() => {
    if (isDemo || SUPABASE_SDK_FAILED) return;
    const f = () => { if (document.visibilityState !== "hidden") syncSince(); };
    window.addEventListener("focus", f); document.addEventListener("visibilitychange", f);
    return () => { window.removeEventListener("focus", f); document.removeEventListener("visibilitychange", f); };
  }, [syncSince, isDemo]);

  // ── Realtime
  useEffect(() => {
    if (isDemo || SUPABASE_SDK_FAILED) return;
    let ch = null;
    try {
      ch = supabase.channel("rec_" + wsId + "_" + systemId)
        .on("postgres_changes", { event: "*", schema: "public", table: "workspace_records", filter: "workspace_id=eq." + wsId }, (p) => {
          const row = p.new && p.new.id ? p.new : p.old; if (!row || row.system_id !== systemId) return;
          if (p.eventType === "DELETE") { const o = p.old; if (o && o.collection) dispatch({ type: "drop", coll: o.collection, id: o.id }); return; }
          const k = key(row.collection, row.id);
          if (meta.current[k] === row.updated_at) return; // our own echo
          meta.current[k] = row.updated_at; if (!lastSync.current || row.updated_at > lastSync.current) lastSync.current = row.updated_at;
          if (row.deleted && !(row.data && row.data.deleted_at)) dispatch({ type: "drop", coll: row.collection, id: row.id });
          else dispatch({ type: "put", coll: row.collection, rec: toRec(row) });
        })
        .subscribe((status) => { dispatch({ type: "online", v: status === "SUBSCRIBED" }); if (status === "SUBSCRIBED") syncSince(); });
    } catch (e) { console.warn("realtime failed", e); }
    return () => { try { if (ch) supabase.removeChannel(ch); } catch (e) {} };
  }, [wsId, systemId, isDemo, syncSince]);

  // ── writes
  const persist = useCallback((coll, rec, prev, fromQueue = false) => {
    const k = key(coll, rec.id);
    const run = async () => {
      const row = { data: stripMeta(rec), deleted: !!rec._deleted, visible_to: rec._vis || null };
      try {
        const ts = meta.current[k];
        if (ts) {
          const { data, error } = await supabase.from("workspace_records").update(row)
            .eq("workspace_id", wsId).eq("system_id", systemId).eq("collection", coll).eq("id", rec.id).eq("updated_at", ts).select("updated_at");
          if (error) throw error;
          if (!data || !data.length) return await conflict(coll, rec.id, prev);
          meta.current[k] = data[0].updated_at;
        } else {
          const { data, error } = await supabase.from("workspace_records").insert({ workspace_id: wsId, system_id: systemId, collection: coll, id: rec.id, ...row }).select("updated_at");
          if (error) { if (error.code === "23505") return await conflict(coll, rec.id, prev); throw error; }
          if (data && data[0]) meta.current[k] = data[0].updated_at;
        }
        return true;
      } catch (e) {
        console.error("record save failed", e);
        if (!fromQueue && isNetworkFailure(e)) {
          const items = readQueue();
          const existing = items.findIndex((x) => x.coll === coll && x.rec.id === rec.id);
          const item = { coll, rec: { ...rec, _syncPending: true }, baseTs: meta.current[k] || null, queuedAt: nowIso() };
          if (existing >= 0) items[existing] = { ...items[existing], rec: item.rec };
          else items.push(item);
          writeQueue(items);
          dispatch({ type: "put", coll, rec: item.rec });
          toast("📴 تم الاحتفاظ بالتعديل محليًا وسيُعاد إرساله عند عودة الاتصال. لم يؤكد الخادم حفظه بعد.");
          return "queued";
        }
        if (prev) dispatch({ type: "put", coll, rec: prev }); else dispatch({ type: "drop", coll, id: rec.id });
        toast("❌ تعذّر الحفظ: " + (e && e.message ? e.message : "خطأ في الاتصال"));
        return false;
      }
    };
    const conflict = async (c, id, prevRec) => {
      const { data } = await supabase.from("workspace_records").select("data,deleted,updated_at,visible_to").eq("workspace_id", wsId).eq("system_id", systemId).eq("collection", c).eq("id", id).maybeSingle();
      if (data) { meta.current[key(c, id)] = data.updated_at; dispatch({ type: "put", coll: c, rec: toRec({ ...data, id }) }); }
      else if (prevRec) dispatch({ type: "put", coll: c, rec: prevRec }); else dispatch({ type: "drop", coll: c, id });
      toast("⚠️ عدّل شخص آخر هذا السجل في نفس الوقت — تم تحميل آخر نسخة، أعد المحاولة");
      return false;
    };
    dispatch({ type: "pending", d: 1 });
    const p = (chains.current[k] || Promise.resolve()).then(run).finally(() => dispatch({ type: "pending", d: -1 }));
    chains.current[k] = p.catch(() => {});
    return p;
  }, [wsId, systemId, toast]);

  const flushQueue = useCallback(async () => {
    if (isDemo || SUPABASE_SDK_FAILED || replaying.current || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    if (!lastSync.current) await loadAll();
    const items = readQueue(); if (!items.length) return;
    replaying.current = true;
    try {
      const remaining = [];
      for (const item of items) {
        const k = key(item.coll, item.rec.id);
        const currentTs = meta.current[k] || null;
        if (!canReplayQueuedWrite(currentTs, item.baseTs)) {
          remaining.push({ ...item, conflict: true });
          continue;
        }
        const rec = { ...item.rec }; delete rec._syncPending;
        const prev = (stateRef.current.recs[item.coll] || {})[rec.id] || null;
        const result = await persist(item.coll, rec, prev, true);
        if (result === true) {
          dispatch({ type: "put", coll: item.coll, rec });
          toast("✅ تمت مزامنة تعديل محفوظ محليًا");
        } else {
          remaining.push(item);
        }
      }
      writeQueue(remaining);
      if (remaining.some((x) => x.conflict)) toast("⚠️ توجد تعديلات محلية تعارضت مع نسخة الخادم. احتفظنا بها ولم نستبدل بيانات الخادم؛ راجعها قبل إعادة المحاولة.");
    } finally { replaying.current = false; }
  }, [isDemo, persist, toast, wsId, systemId, loadAll]);

  useEffect(() => {
    if (isDemo) return;
    const onOnline = async () => { await loadAll(); await flushQueue(); await syncSince(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [loadAll, flushQueue, syncSince, isDemo]);

  // A persisted queue can survive a page reload while the browser is already online.
  // Flush after the initial server snapshot is loaded, not only on the next online event.
  useEffect(() => {
    if (!isDemo && state.ready && state.online) flushQueue();
  }, [isDemo, state.ready, state.online, flushQueue]);

  const put = useCallback((coll, rec) => {
    const prev = (stateRef.current.recs[coll] || {})[rec.id] || null;
    const now = nowIso();
    const next = { ...prev, ...rec, id: rec.id || uid(), v: ((prev && prev.v) || 0) + 1, updated_at: now, created_at: (prev && prev.created_at) || rec.created_at || now };
    dispatch({ type: "put", coll, rec: next });
    if (isDemo) { const k = "recs:" + wsId + ":" + systemId; const m = demoStore.current[k] || (demoStore.current[k] = {}); m[coll] = { ...(m[coll] || {}), [next.id]: next }; return Promise.resolve(next); }
    return persist(coll, next, prev).then((ok) => (ok ? { ...next, _syncPending: ok === "queued" } : null));
  }, [isDemo, persist, wsId, systemId]);

  const softDelete = useCallback((coll, id, by) => {
    const prev = (stateRef.current.recs[coll] || {})[id]; if (!prev) return Promise.resolve(null);
    return put(coll, { ...prev, deleted_at: nowIso(), deleted_by: by || null });
  }, [put]);
  const restore = useCallback((coll, id) => {
    const prev = (stateRef.current.recs[coll] || {})[id]; if (!prev) return Promise.resolve(null);
    return put(coll, { ...prev, deleted_at: null, deleted_by: null });
  }, [put]);
  const putMany = useCallback(async (ops) => { const out = []; for (const o of ops) out.push(await put(o.coll, o.rec)); return out; }, [put]);

  const api = useMemo(() => ({ put, softDelete, restore, putMany, reload: loadAll, sync: syncSince, flushQueue }), [put, softDelete, restore, putMany, loadAll, syncSince, flushQueue]);
  return { ...state, api };
}

export function stripMeta(rec) {
  const o = { ...rec }; delete o._vis; delete o._deleted; delete o._syncPending; return o;
}

// helpers for screens
export const live = (list) => (list || []).filter((r) => !r.deleted_at);
export const byId = (list) => { const m = {}; (list || []).forEach((r) => { m[r.id] = r; }); return m; };
export function arr(recs, coll) { return Object.values((recs && recs[coll]) || {}); }
