// js/checkout.rpc.supabase.js
import { supabase } from "./supabaseClient.js";

const payNowBtn = document.getElementById("pay-now");

function getSelectedPayMethod() {
  const r = document.querySelector('input[name="pay"]:checked');
  return r ? r.value : null; // "card" | "transfer" | "mercadopago"
}

function getBilling() {
  return {
    name: (document.getElementById("name")?.value || "").trim(),
    email: (document.getElementById("email")?.value || "").trim(),
    country: (document.getElementById("country")?.value || "").trim(),
    city: (document.getElementById("city")?.value || "").trim(),
  };
}

function getInvoice() {
  const need = !!document.getElementById("need-invoice")?.checked;
  if (!need) return { needInvoice: false };

  return {
    needInvoice: true,
    doc: (document.getElementById("doc")?.value || "").trim(),
    addr: (document.getElementById("addr")?.value || "").trim(),
  };
}

function readCartItemsRobusto() {
  const keys = ["espaciopaz_cart_v1", "espaciopaz_cart", "carrito", "cart", "cartItems"];
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (_) {}
  }
  return [];
}

function mapToRpcItems(cartItems) {
  return cartItems.map((it) => ({
    course_id: String(it.id ?? it.course_id ?? it.slug ?? ""),
    title: String(it.name ?? it.title ?? "Curso"),
    unit_price: Number(it.price ?? it.unit_price ?? it.priceUSD ?? 0),
    qty: Number(it.qty ?? it.quantity ?? 1),
  }));
}

function calcTotal(items) {
  return items.reduce((sum, it) => sum + Number(it.unit_price || 0) * Number(it.qty || 1), 0);
}

function goToStep(stepNum) {
  document.querySelectorAll("#steps [data-step-indicator]").forEach((li) => {
    const n = Number(li.getAttribute("data-step-indicator"));
    li.classList.toggle("is-active", n === stepNum);
  });
  document.querySelectorAll(".co-step[data-step]").forEach((p) => {
    const n = Number(p.getAttribute("data-step"));
    p.hidden = n !== stepNum;
  });
}

function setConfirmation(orderId, email) {
  const idEl = document.getElementById("order-id");
  const emailEl = document.getElementById("order-email");
  if (idEl) idEl.textContent = "#" + String(orderId).slice(0, 8).toUpperCase();
  if (emailEl) emailEl.textContent = email || "—";
}

async function ensureLoggedIn() {
  const { data } = await supabase.auth.getUser();
  return !!data?.user;
}

// Función para crear orden en Supabase (llamada desde checkout.js)
async function createOrderInSupabase() {
  const method = getSelectedPayMethod();
  if (!method) throw new Error("No payment method selected");

  const billing = getBilling();
  const invoice = getInvoice();
  const cartRaw = readCartItemsRobusto();
  const items = mapToRpcItems(cartRaw);

  if (!items.length) throw new Error("Cart is empty");

  const total = calcTotal(items);

  const { data: orderId, error } = await supabase.rpc("create_order_with_items", {
    p_payment_method: method,
    p_currency: "USD",
    p_total: total,
    p_billing: billing,
    p_invoice: invoice,
    p_items: items,
  });

  if (error) {
    console.error("[create_order_with_items]", error);
    throw error;
  }

  return orderId;
}

// Exponer función globalmente para que checkout.js la use
window.createOrderInSupabase = createOrderInSupabase;
