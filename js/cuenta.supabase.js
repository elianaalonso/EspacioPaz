import { supabase } from "./supabaseClient.js";
import { ensureProfile } from "./authSupabase.js";

async function loadCuenta() {
  // 1) sesión
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (!session) {
  window.location.href = "/index.html";
  return;
}

  }

  // 2) asegurar perfil
  const profile = await ensureProfile();

  const email = session.user.email || "";
  const name =
    profile?.full_name ||
    session.user.user_metadata?.full_name ||
    email.split("@")[0];

  // 3) actualizar state global (lo expusiste con window.state = state)
  if (window.state?.user) {
    window.state.user.email = email;
    window.state.user.name = name;
    if (typeof window.renderAccountHeader === "function")
      window.renderAccountHeader();
  }

  // 4) compras aprobadas
  const { data: purchases, error: pErr } = await supabase
    .from("purchases")
    .select("course_id")
    .eq("status", "approved");

  if (pErr) {
    console.error(pErr);
    return;
  }

  const grid = document.getElementById("coursesGrid");
  if (!grid) return;

  if (!purchases?.length) {
    grid.innerHTML = `<div class="empty">Todavía no tenés cursos activos.</div>`;
    return;
  }

  // 5) traer cursos
  const ids = purchases.map((p) => p.course_id);

  const { data: courses, error: cErr } = await supabase
    .from("courses")
    .select("id, title, image_url, link, short_desc")
    .in("id", ids);

  if (cErr) {
    console.error(cErr);
    return;
  }

  // 6) render cards (usa estructura similar a tu cuenta.js)
  grid.innerHTML = (courses || [])
    .map(
      (c) => `
      <article class="course">
        <div class="course__media"
          style="background-image:url(../${c.image_url || ""}); background-size:cover; background-position:center;">
        </div>
        <div class="course__body">
          <h3 class="course__title">${c.title}</h3>
          <div class="course__meta">
            <span>0% completado</span>
            <a class="btn btn--light" href="../${c.link}">Continuar</a>
          </div>
        </div>
      </article>
    `
    )
    .join("");


document.addEventListener("DOMContentLoaded", () => {
  loadCuenta().catch((err) => console.error(err));
});
