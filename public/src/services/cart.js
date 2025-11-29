// src/services/cart.js
// Simple client-side cart stored in localStorage.
// Each item: { productId, name, price, qty, imageUrl, shopId }

const STORAGE_KEY = "sendr_cart_v1";

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("cart.read error", e);
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("cart.write error", e);
  }
}

export function getCart() {
  return read();
}

export function clearCart() {
  write([]);
}

export function setCart(items) {
  write(items);
  return items;
}

export function addItem(product, qty = 1) {
  const items = read();
  const idx = items.findIndex(i => i.productId === product.id);
  if (idx >= 0) {
    items[idx].qty += qty;
  } else {
    items.push({
      productId: product.id,
      name: product.name || "Item",
      price: Number(product.price || 0),
      qty,
      imageUrl: product.imageUrl || null,
      shopId: product.shopId || null
    });
  }
  write(items);
  return items;
}

export function updateItemQty(productId, qty) {
  const items = read();
  const idx = items.findIndex(i => i.productId === productId);
  if (idx >= 0) {
    if (qty <= 0) {
      items.splice(idx, 1);
    } else {
      items[idx].qty = qty;
    }
    write(items);
  }
  return items;
}

export function removeItem(productId) {
  const items = read().filter(i => i.productId !== productId);
  write(items);
  return items;
}

// Ensure all items belong to same shop (for single-shop checkout)
export function getCartShopId() {
  const items = read();
  if (items.length === 0) return null;
  return items[0].shopId || null;
}

export function getCartTotals() {
  const items = read();
  const subtotal = items.reduce((s, it) => s + (Number(it.price || 0) * (it.qty || 0)), 0);
  return { items, subtotal, count: items.reduce((s, it) => s + (it.qty || 0), 0) };
}

