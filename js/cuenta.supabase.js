import { supabase } from "./supabaseClient.js";
import { ensureProfile } from "./authSupabase.js";

function money(amount, currency="USD") {
  // En tu tabla hoy "price_cents" está en dólares (180, 205, etc).
  // Si algún día pasás a centavos reales, lo ajustamos.
  return currency === "USD" ? `$${amount}` : `${amount} ${currency}`;
}

async function loadCuentaSupabase() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (!session) {
    window.location.href = "/index.html";
    return;
  }

  const profile = await ensureProfile();
  const email = session.user.email || "";
  const name =
    profile?.full_name ||
    session.user.user_metadata?.full_name ||
    email.split("@")[0];

  // state real
  if (window.state?.user) {
    window.state.user.name = name;
    window.state.user.email = email;
  }

  // 1) compras reales del usuario
  const { data: purchases, error: pErr } = await supabase
    .from("purchases")
    .select("course_id, status, created_at")
    .eq("user_id", session.user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (pErr) {
    console.error("purchases error:", pErr);
    return;
  }

  // 2) cursos reales correspondientes
  const ids = (purchases || []).map(p => p.course_id);
  let courses = [];

  if (ids.length) {
    const { data: cData, error: cErr } = await supabase
      .from("courses")
      .select("id, title, link, short_desc, image_url, price_cents, currency")
      .in("id", ids);

    if (cErr) {
      console.error("courses error:", cErr);
      return;
    }
    courses = cData || [];
  }

  const byId = new Map(courses.map(c => [c.id, c]));

  // 3) state.courses (Mis cursos)
  window.state.courses = ids
    .map(id => byId.get(id))
    .filter(Boolean)
    .map(c => ({
      id: c.id,
      title: c.title,
      progress: 0,
      cover: c.image_url || "",
      link: c.link || "",
      short_desc: c.short_desc || ""
    }));

  // 4) state.orders (Compras)
  window.state.orders = (purchases || []).map(p => {
    const c = byId.get(p.course_id);
    const amount = c?.price_cents ?? 0;
    const currency = c?.currency ?? "USD";
    return {
      id: p.course_id,
      title: c?.title || p.course_id,
      date: p.created_at,
      total: amount,
      total_display: money(amount, currency),
      status: p.status,
      link: c?.link || ""
    };
  });

  if (typeof window.renderAll === "function") window.renderAll();
}

document.addEventListener("DOMContentLoaded", () => {
  loadCuentaSupabase().catch(console.error);
});
