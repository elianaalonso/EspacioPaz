import { supabase } from "./supabaseClient.js";

async function checkCourseAccess() {
  const buttons = document.querySelectorAll(".js-comprar");
  if (!buttons.length) {
    console.log("[cursoAccess] No se encontraron botones .js-comprar");
    return;
  }

  const courseId = buttons[0].dataset.courseId;
  if (!courseId) {
    console.log("[cursoAccess] No se encontró data-course-id");
    return;
  }

  console.log("[cursoAccess] Verificando acceso al curso:", courseId);

  // 1) sesión
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  // No logueada
  if (!session) {
    console.log("[cursoAccess] Usuario no logueado - mantener botón de compra original");
    // No hacer nada, dejar que carrito.js maneje la compra
    // El usuario verá "Comprar curso" y seguirá el flujo normal
    return;
  }

  console.log("[cursoAccess] Usuario logueado:", session.user.email);

  // 2) verificar compra
  const { data: purchase, error } = await supabase
    .from("purchases")
    .select("status")
    .eq("user_id", session.user.id)
    .eq("course_id", courseId)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    console.error("[cursoAccess] Error al verificar compra:", error);
  }

  console.log("[cursoAccess] Compra encontrada:", purchase);

  // 3) lógica visual
  if (purchase) {
    console.log("[cursoAccess] Curso YA comprado - ocultando botón y precio");
    
    // Ocultar todos los botones de compra
    buttons.forEach(btn => {
      btn.style.display = "none";
    });

    // Ocultar precio
    const priceBox = document.querySelector(".course-price");
    if (priceBox) priceBox.style.display = "none";
    
    // Ocultar también cualquier mención de precio en el botón original
    const priceElements = document.querySelectorAll('[class*="price"], [class*="precio"]');
    priceElements.forEach(el => {
      if (el.textContent.includes("$")) {
        el.style.display = "none";
      }
    });
  } else {
    console.log("[cursoAccess] Curso NO comprado - mantener funcionalidad de compra");
    buttons.forEach(btn => {
      btn.textContent = "Comprar curso";
      // Mantener el comportamiento original del botón (carrito.js)
      // NO sobrescribir onclick
    });
  }
}

document.addEventListener("DOMContentLoaded", checkCourseAccess);
