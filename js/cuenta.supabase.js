import { supabase } from "./supabaseClient.js";
import { ensureProfile } from "./authSupabase.js";

async function loadCuentaSupabase() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  // Si no hay sesión -> al index
  if (!session) {
    window.location.href = "/index.html";
    return;
  }

  // Perfil real
  const profile = await ensureProfile();

  const email = session.user.email || "";
  const name =
    profile?.full_name ||
    session.user.user_metadata?.full_name ||
    email.split("@")[0];

  // Guardamos compat para el resto del front
  localStorage.setItem("espaciopaz_user_v1", JSON.stringify({ name, email }));

  // Actualizar state real
  if (window.state?.user) {
    window.state.user.name = name;
    window.state.user.email = email;
  }

  // 1) compras reales (solo del usuario logueado)
  const { data: purchases, error: pErr } = await supabase
    .from("purchases")
    .select("course_id, status, created_at")
    .eq("user_id", session.user.id)
    .eq("status", "approved");

  if (pErr) {
    console.error("purchases error:", pErr);
    return;
  }

  // 2) si no hay compras, mostrar vacío
  const grid = document.getElementById("coursesGrid");
  if (!grid) return;

  if (!purchases?.length) {
    window.state.courses = [];
    if (typeof window.renderAll === "function") window.renderAll();
    return;
  }

  // 3) traer cursos reales
  const ids = purchases.map((p) => p.course_id);

  const { data: courses, error: cErr } = await supabase
    .from("courses")
    .select("id, title, short_desc, image_url, link, price_cents, currency")
    .in("id", ids);

  if (cErr) {
    console.error("courses error:", cErr);
    return;
  }

  // 4) map a estructura que tu cuenta.js ya sabe renderizar
  const byId = new Map((courses || []).map((c) => [c.id, c]));
  const mappedCourses = ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((c) => ({
      id: c.id,
      title: c.title,
      progress: 0,
      cover: c.image_url || "",
      link: c.link || "",
      short_desc: c.short_desc || ""
    }));

  // 5) opcional: transformar purchases a "orders reales" (si mostrás Compras)
  const mappedOrders = (purchases || []).map((p) => ({
    id: p.course_id,
    date: p.created_at,
    total: 0,
    status: p.status,
    items: 1
  }));

  window.state.courses = mappedCourses;
  window.state.orders = mappedOrders;

  // Render final
  if (typeof window.renderAll === "function") window.renderAll();
}

document.addEventListener("DOMContentLoaded", () => {
  loadCuentaSupabase().catch(console.error);
});
