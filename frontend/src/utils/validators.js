// src/utils/validators.js
export const isRequired = (v) => (v!==null && v!==undefined && String(v).trim()!=='');
export const minLen = (v, n) => String(v||'').trim().length >= n;
export const isEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isURL = (v) => !v || /^(https?:\/\/)[^\s]+$/i.test(v);

export const isPosInt = (v) => Number.isInteger(Number(v)) && Number(v) > 0;
// Alias para tu código que usa isPositiveInt
export const isPositiveInt = (v) => isPosInt(v);

export const isNonNegNumber = (v, allowEmpty=false) => {
  if (allowEmpty && (v==='' || v===null || v===undefined)) return true;
  return !isNaN(v) && Number(v) >= 0;
};

export const inSet = (v, arr) => arr.includes(v);

export const todayISO = () => new Date().toISOString().slice(0,10);
export const notFuture = (d) => !d || d <= todayISO();
export const lte = (a,b) => Number(a) <= Number(b);

export const firstError = (errors) => {
  const k = Object.keys(errors).find(k => errors[k]);
  return k ? errors[k] : '';
};

/* ====== DNI/CUIT (Argentina) y teléfono ====== */
export const onlyDigits = (s) => String(s||'').replace(/\D+/g, '');

export const isDNI = (v) => {
  const d = onlyDigits(v);
  return d.length >= 7 && d.length <= 8;
};

export const isCUIT = (v) => {
  const d = onlyDigits(v);
  if (d.length !== 11) return false;
  const mult = [5,4,3,2,7,6,5,4,3,2];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i],10) * mult[i];
  let mod = 11 - (sum % 11);
  if (mod === 11) mod = 0;
  if (mod === 10) mod = 9;
  return mod === parseInt(d[10],10);
};

export const isDniOrCuit = (v, required=false) => {
  const s = String(v||'').trim();
  if (!s) return !required; // si no es requerido, vacío = OK
  return isDNI(s) || isCUIT(s);
};

export const isPhone = (v) => !v || /^[0-9+()\s-]{6,20}$/.test(String(v));

/* ====== helpers de items ====== */
export const hasMinItems = (arr, n) => Array.isArray(arr) && arr.filter(Boolean).length >= n;
