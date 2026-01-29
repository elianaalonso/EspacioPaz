import { supabase } from "./supabaseClient.js";
import { ensureProfile } from "./authSupabase.js";

function moneyFromCents(cents, currency = "USD") {
  const amount = (Number(cents || 0) / 100);

  // formateo simple
  const formatted = amount.toLocaleString("es-UY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  return currency === "USD" ? `USD ${formatted}` : `${formatted} ${currency}`;
}

async function fetchJson(relPath) {
  // Carga JSON usando path relativo al archivo JS (seguro en /html/*)
  const url = new URL(relPath, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${relPath} failed: ${res.status}`);
  return res.json();
}

function normalizeLinkForCuenta(href){
  // cuenta.js ya normaliza, pero dejamos limpio
  return href || "";
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
      total: amount / 100, // convertir centavos a dólares para el cálculo
      total_display: moneyFromCents(amount, currency),
      status: p.status,
      link: c?.link || ""
    };
  });

  /* ==========================
     FAVORITOS (Mi cuenta)
     Mezclados, último primero
  ========================== */

  // QUERY: load favorites rows (ordered desc)
  const { data: favRows, error: fErr } = await supabase
    .from("favorites")
    .select("item_type, item_id, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (fErr) {
    console.error("favorites error:", fErr);
    window.state.favorites = [];
  } else {
    const rows = favRows || [];

    // 2) Resolver cursos / rituales / meditaciones desde JSON (misma estructura)
    let courseMapJson = new Map();
    let ritualMap = new Map();
    let meditationMap = new Map();

    try {
      const cursos = await fetchJson("../datos/cursos.json");
      (cursos || []).forEach(c => courseMapJson.set(c.id, c));
    } catch (e) {
      console.warn("cursos.json load error:", e);
    }

    try {
      const rituales = await fetchJson("../datos/rituales.json");
      (rituales || []).forEach(r => ritualMap.set(r.id, r));
    } catch (e) {
      console.warn("rituales.json load error:", e);
    }

    try {
      const meditaciones = await fetchJson("../datos/meditaciones.json");
      (meditaciones || []).forEach(m => meditationMap.set(m.id, m));
    } catch (e) {
      console.warn("meditaciones.json load error:", e);
    }

    // 3) Construir state.favorites mezclado, en el orden ya traído (desc, uniform: title, link, image.src)
    // Función para normalizar rutas de imagen (desde html/cuenta.html, agregar ../)
    const normImgPath = (imgSrc) => {
      if (!imgSrc) return "";
      // Si ya tiene ../, retornar as-is
      if (imgSrc.startsWith("../")) return imgSrc;
      // Si comienza con /, quitar el slash y agregar ../
      if (imgSrc.startsWith("/")) return "../" + imgSrc.slice(1);
      // En otro caso (img/...), agregar ../
      return "../" + imgSrc;
    };

    window.state.favorites = rows.map(r => {
      const type = r.item_type;
      const id = r.item_id;

      if (type === "course") {
        const it = courseMapJson.get(id);
        return {
          type: "course",
          id,
          title: it?.title || id,
          img: normImgPath(it?.image?.src || ""),
          href: it?.link || ""
        };
      }

      if (type === "ritual") {
        const it = ritualMap.get(id);
        return {
          type: "ritual",
          id,
          title: it?.title || id,
          img: normImgPath(it?.image?.src || ""),
          href: it?.link || ""
        };
      }

      if (type === "meditation") {
        const it = meditationMap.get(id);
        return {
          type: "meditation",
          id,
          title: it?.title || id,
          img: normImgPath(it?.image?.src || ""),
          href: it?.link || ""
        };
      }

      return { type, id, title: id, img: "", href: "" };
    });
  }

  if (typeof window.renderAll === "function") window.renderAll();
}

document.addEventListener("DOMContentLoaded", () => {
  loadCuentaSupabase().catch(console.error);
});

// Quitar favorito desde "Mi cuenta" (evento emitido por cuenta.js)
document.addEventListener("favorites:remove", async (e) => {
  try {
    const { type, id } = e.detail || {};
    if (!type || !id) return;

    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session) return;

    // QUERY: delete favorite from account
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", session.user.id)
      .eq("item_type", type)
      .eq("item_id", id);

    if (error) {
      console.warn("favorites delete error:", error);
      return;
    }

    // Recargar la cuenta para refrescar favoritos (simple y seguro)
    // (si querés después lo optimizamos a "quitar del array y rerender")
    window.location.reload();
  } catch (err) {
    console.error(err);
  }
});
