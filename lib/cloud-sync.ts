"use client";

import type { Conversation, SavedData } from "@/lib/storage";
import { dateKey, daysBetween } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";

type CloudStateRow = {
  profile: SavedData["profile"];
  days: SavedData["days"];
  swaps: SavedData["swaps"];
  habits: SavedData["habits"];
  settings: SavedData["settings"] & { activeConversationId?: string };
  sync_preferences?: Partial<SyncPreferences>;
  revision: number;
};

export type SyncPreferences = {
  profile: boolean;
  habits: boolean;
  completions: boolean;
  settings: boolean;
  conversations: boolean;
};

export const defaultSyncPreferences: SyncPreferences = { profile: true, habits: true, completions: true, settings: true, conversations: true };

export async function getCloudSyncPreferences(userId: string): Promise<SyncPreferences | null> {
  const { data, error } = await getSupabase().from("user_state").select("sync_preferences").eq("user_id", userId).maybeSingle<{ sync_preferences?: Partial<SyncPreferences> }>();
  if (error) throw error;
  return data ? { ...defaultSyncPreferences, ...(data.sync_preferences ?? {}) } : null;
}

export async function replaceCloudSyncPreferences(userId: string, preferences: SyncPreferences) {
  const supabase = getSupabase();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: current, error: readError } = await supabase.from("user_state").select("revision").eq("user_id", userId).maybeSingle<{ revision: number }>();
    if (readError) throw readError;
    if (!current) return false;
    const patch: Record<string, unknown> = { sync_preferences: preferences, revision: Date.now() };
    if (!preferences.profile) patch.profile = null;
    if (!preferences.habits) patch.habits = [];
    if (!preferences.completions) { patch.days = {}; patch.swaps = {}; }
    if (!preferences.settings) patch.settings = {};
    const { data, error } = await supabase.from("user_state").update(patch).eq("user_id", userId).eq("revision", current.revision).select("revision");
    if (error) throw error;
    if (data?.length) {
      if (!preferences.conversations) {
        const { error: deleteError } = await supabase.from("conversations").delete().eq("user_id", userId);
        if (deleteError) throw deleteError;
      }
      return true;
    }
  }
  throw new Error("Account sync settings changed on another device");
}

function recent(conversation: Conversation, today = dateKey()) {
  const age = daysBetween(conversation.date, today);
  return age >= 0 && age < 7;
}

export function pruneConversations(conversations: Conversation[], today = dateKey()) {
  return conversations.filter((conversation) => recent(conversation, today));
}

export async function pullCloudData(userId: string, local: SavedData, preferences: SyncPreferences): Promise<SavedData> {
  const supabase = getSupabase();
  const { data: state, error: stateError } = await supabase.from("user_state").select("profile,days,swaps,habits,settings,sync_preferences,revision").eq("user_id", userId).maybeSingle<CloudStateRow>();
  if (stateError) throw stateError;
  const threadResult = preferences.conversations
    ? await supabase.from("conversations").select("id,conversation_date,title,messages").eq("user_id", userId).gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()).order("created_at")
    : { data: [], error: null };
  if (threadResult.error) throw threadResult.error;
  const threads = threadResult.data;
  if (!state) {
    await pushCloudData(userId, local, preferences, true);
    return { ...local, conversations: pruneConversations(local.conversations) };
  }

  if (local.updatedAt > state.revision) {
    await pushCloudData(userId, local, preferences);
    return { ...local, conversations: pruneConversations(local.conversations) };
  }

  const conversations = (threads ?? []).map((thread) => ({
    id: String(thread.id),
    date: String(thread.conversation_date),
    title: String(thread.title),
    msgs: Array.isArray(thread.messages) ? thread.messages as Conversation["msgs"] : [],
  }));
  const activeConversationId = state.settings?.activeConversationId;
  const active = conversations.find((item) => item.id === activeConversationId) ?? conversations.at(-1);
  return {
    ...local,
    updatedAt: state.revision,
    profile: preferences.profile ? state.profile ?? local.profile : local.profile,
    days: preferences.completions ? state.days ?? local.days : local.days,
    swaps: preferences.completions ? state.swaps ?? local.swaps : local.swaps,
    habits: preferences.habits ? state.habits ?? local.habits : local.habits,
    settings: preferences.settings ? { ...local.settings, ...(state.settings ?? {}) } : local.settings,
    conversations: preferences.conversations && conversations.length ? conversations : pruneConversations(local.conversations),
    activeConversationId: preferences.conversations ? active?.id ?? local.activeConversationId : local.activeConversationId,
    msgs: preferences.conversations ? active?.msgs ?? local.msgs : local.msgs,
  };
}

export async function pushCloudData(userId: string, data: SavedData, preferences: SyncPreferences, replacePreferences = false) {
  const supabase = getSupabase();
  const conversations = pruneConversations(data.conversations);
  const { data: current, error: readError } = await supabase.from("user_state").select("revision,sync_preferences").eq("user_id", userId).maybeSingle<{ revision: number; sync_preferences?: Partial<SyncPreferences> }>();
  if (readError) throw readError;
  const effectivePreferences = current && !replacePreferences ? { ...defaultSyncPreferences, ...(current.sync_preferences ?? {}) } : preferences;
  if (current && current.revision > data.updatedAt) throw new Error("Cloud state changed on another device");
  const payload = {
    user_id: userId,
    profile: effectivePreferences.profile ? data.profile : null,
    days: effectivePreferences.completions ? data.days : {},
    swaps: effectivePreferences.completions ? data.swaps : {},
    habits: effectivePreferences.habits ? data.habits : [],
    settings: effectivePreferences.settings ? { ...data.settings, activeConversationId: data.activeConversationId } : {},
    sync_preferences: effectivePreferences,
    revision: Date.now(),
  };
  const stateResult = current
    ? await supabase.from("user_state").update(payload).eq("user_id", userId).eq("revision", current.revision).select("revision")
    : await supabase.from("user_state").insert(payload).select("revision");
  const stateError = stateResult.error;
  if (stateError) throw stateError;
  if (!stateResult.data?.length) throw new Error("Cloud state changed on another device");

  if (!effectivePreferences.conversations) {
    const { error } = await supabase.from("conversations").delete().eq("user_id", userId);
    if (error) throw error;
  } else if (conversations.length) {
    const { error } = await supabase.from("conversations").upsert(conversations.map((conversation) => ({
      id: conversation.id,
      user_id: userId,
      conversation_date: conversation.date,
      title: conversation.title,
      messages: conversation.msgs,
    })), { onConflict: "user_id,id" });
    if (error) throw error;
  }
}

export async function clearCloudData(userId: string) {
  const supabase = getSupabase();
  const [{ error: conversationError }, { error: stateError }] = await Promise.all([
    supabase.from("conversations").delete().eq("user_id", userId),
    supabase.from("user_state").delete().eq("user_id", userId),
  ]);
  if (conversationError) throw conversationError;
  if (stateError) throw stateError;
}
