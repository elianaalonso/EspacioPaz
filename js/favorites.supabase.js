// js/favorites.supabase.js
import { supabase } from './supabaseClient.js';

/* ================== FAVORITOS (Supabase) ==================
  Favoritos reales por cuenta:
  - item_type: 'course' | 'ritual' | 'meditation'
  - item_id: slug/id desde tus JSON
=========================================================== */

export const FAVORITE_TYPES = new Set(['course','ritual','meditation']);

// Estado en memoria (para UI rápida)
let favKeySet = new Set(); // guarda claves tipo: "course:bio-2026"

function makeKey(type, id){ return `${type}:${id}`; }
export function hasFav(type, id){ return favKeySet.has(makeKey(type, id)); }
export function getFavKeys(){ return new Set(favKeySet); }

export async function getUser(){
  // QUERY: get current user
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user ?? null;
}

export async function loadFavorites(){
  const user = await getUser();
  if (!user) {
    favKeySet = new Set();
    return favKeySet;
  }

  // QUERY: load user favorites
  const { data, error } = await supabase
    .from('favorites')
    .select('item_type,item_id')
    .eq('user_id', user.id);

  if (error) {
    console.warn('[favorites] load error', error);
    favKeySet = new Set();
    return favKeySet;
  }

  favKeySet = new Set((data || []).map(r => makeKey(r.item_type, r.item_id)));
  return favKeySet;
}

export async function addFavorite(type, id){
  if (!FAVORITE_TYPES.has(type)) throw new Error('Invalid favorite type');
  const user = await getUser();
  if (!user) return { ok:false, reason:'NO_SESSION' };

  // QUERY: insert favorite
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: user.id, item_type: type, item_id: id });

  if (error) return { ok:false, reason:'DB_ERROR', error };

  favKeySet.add(makeKey(type, id));
  return { ok:true };
}

export async function removeFavorite(type, id){
  if (!FAVORITE_TYPES.has(type)) throw new Error('Invalid favorite type');
  const user = await getUser();
  if (!user) return { ok:false, reason:'NO_SESSION' };

  // QUERY: delete favorite
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('item_type', type)
    .eq('item_id', id);

  if (error) return { ok:false, reason:'DB_ERROR', error };

  favKeySet.delete(makeKey(type, id));
  return { ok:true };
}

export async function toggleFavorite(type, id){
  if (hasFav(type, id)) return removeFavorite(type, id);
  return addFavorite(type, id);
}

// Esto NO borra DB. Solo limpia memoria/UI.
export function clearFavoriteCache(){
  favKeySet = new Set();
}
