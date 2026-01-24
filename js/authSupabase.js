import { supabase } from "./supabaseClient.js";

export async function signUp(email, password, fullName) {
  // Guardamos fullName en metadata (opcional, útil)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });

  if (error) throw error;
  return data;
}


export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function ensureProfile() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;

  // ¿ya existe profile?
  const { data: existing, error: e1 } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (e1) throw e1;
  if (existing) return existing;

  // crear profile con metadata si existe
  const fullName = user.user_metadata?.full_name || "";

  const { data: inserted, error: e2 } = await supabase
    .from("profiles")
    .insert({ id: user.id, full_name: fullName })
    .select("id, full_name")
    .single();

  if (e2) throw e2;
  return inserted;
}
