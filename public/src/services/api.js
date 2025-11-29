// src/services/api.js
// Centralized Firestore helpers for Sendr
//
// Usage examples:
//   import { getShops, subscribeProductsForShop, placeOrder } from "../services/api";
//
// Functions are written with modular Firebase v9 style and assume `src/firebase.js` exports { db, storage, auth }.

import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";

/* -------------------------
   Shops & Products helpers
   ------------------------- */

export async function getShops() {
  try {
    const q = query(collection(db, "shops"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getShops error", err);
    throw err;
  }
}

export async function getProducts() {
  try {
    const q = query(collection(db, "products"), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getProducts error", err);
    throw err;
  }
}

/**
 * Realtime subscription to products for a shop
 * @param {string} shopId
 * @param {(products: Array) => void} onChange
 * @returns unsubscribe function
 */
export function subscribeProductsForShop(shopId, onChange) {
  if (!shopId) {
    const noopUnsub = () => {};
    return noopUnsub;
  }
  const q = query(
    collection(db, "products"),
    where("shopId", "==", shopId),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(q, snapshot => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onChange(items);
  }, err => {
    console.error("subscribeProductsForShop onSnapshot error", err);
    // onChange can optionally handle errors — not invoking here.
  });
}

/* -------------------------
   Orders helpers & transactions
   ------------------------- */

/**
 * Realtime subscription to orders for a shop
 * @param {string} shopId
 * @param {(orders: Array) => void} onChange
 * @returns unsubscribe function
 */
export function subscribeOrdersForShop(shopId, onChange) {
  if (!shopId) {
    const noopUnsub = () => {};
    return noopUnsub;
  }
  const q = query(
    collection(db, "orders"),
    where("shopId", "==", shopId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, snapshot => {
    const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onChange(orders);
  }, err => {
    console.error("subscribeOrdersForShop onSnapshot error", err);
  });
}

/**
 * Safely place an order:
 *  - items: [{ productId, qty }]  (price is read from product doc)
 *  - Decrements product qty atomically using a Firestore transaction
 *  - Creates an order document if all product quantities are sufficient
 *
 * @param {Object} params
 * @param {string|null} params.customerUid
 * @param {string} params.shopId
 * @param {Array<{productId:string, qty:number}>} params.items
 * @returns {Promise<string>} orderId
 */
export async function placeOrder({ customerUid = null, shopId, items = [] }) {
  if (!shopId) throw new Error("placeOrder: shopId is required");
  if (!Array.isArray(items) || items.length === 0) throw new Error("placeOrder: items required");

  // runTransaction will throw if any step fails
  const orderId = await runTransaction(db, async (tx) => {
    let total = 0;
    const orderItems = [];

    // For each item, read product and verify stock
    for (const it of items) {
      if (!it.productId) throw new Error("placeOrder: productId missing in item");
      const pRef = doc(db, "products", it.productId);
      const pSnap = await tx.get(pRef);
      if (!pSnap.exists()) throw new Error(`Product ${it.productId} not found`);
      const p = pSnap.data();

      const wantQty = Number(it.qty || 0);
      if (!Number.isInteger(wantQty) || wantQty <= 0) throw new Error(`Invalid qty for product ${it.productId}`);

      if (p.qty < wantQty) throw new Error(`Not enough stock for product "${p.name || it.productId}"`);

      // decrement
      const newQty = p.qty - wantQty;
      tx.update(pRef, { qty: newQty, available: newQty > 0, updatedAt: serverTimestamp() });

      const unitPrice = Number(p.price || 0);
      total += unitPrice * wantQty;

      orderItems.push({
        productId: it.productId,
        name: p.name || null,
        qty: wantQty,
        price: unitPrice
      });
    }

    // create order doc
    const orderRef = await addDoc(collection(db, "orders"), {
      customerUid: customerUid || null,
      shopId,
      items: orderItems,
      total,
      status: "placed",
      createdAt: serverTimestamp()
    });

    return orderRef.id;
  });

  return orderId;
}

/* -------------------------
   Simple admin helpers
   ------------------------- */

/**
 * Add a shop (simple helper) - returns docRef.id
 * payload: { name, ownerUid, location:{lat,lng}, createdAt? }
 */
export async function addShop(payload = {}) {
  try {
    const docRef = await addDoc(collection(db, "shops"), {
      ...payload,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    console.error("addShop error", err);
    throw err;
  }
}

/**
 * Seed a demo shop + product. Returns { shopId, productId }
 * Use only in dev / test mode.
 */
export async function seedDemo() {
  try {
    // create shop
    const shopRef = await addDoc(collection(db, "shops"), {
      name: "Bala's Fresh Mart",
      ownerUid: "vendor_demo_1",
      location: { lat: 12.9716, lng: 77.5946 },
      createdAt: serverTimestamp()
    });

    // create product
    const prodRef = await addDoc(collection(db, "products"), {
      shopId: shopRef.id,
      name: "Fresh Tomatoes - 1 kg",
      price: 60,
      qty: 10,
      available: true,
      imageUrl: null,
      updatedAt: serverTimestamp()
    });

    return { shopId: shopRef.id, productId: prodRef.id };
  } catch (err) {
    console.error("seedDemo error", err);
    throw err;
  }
}

