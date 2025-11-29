// src/pages/Vendor/VendorDashboard.jsx
import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  query,
  where,
  collection,
  onSnapshot,
  runTransaction,
  updateDoc
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { Link, useNavigate } from "react-router-dom";
import { deleteProduct as deleteProductById } from "../../services/productService";

export default function VendorDashboard() {
  const [vendor, setVendor] = useState(null);
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openMenuFor, setOpenMenuFor] = useState(null); // productId for which menu is open
  const navigate = useNavigate();

  useEffect(() => {
    let unsubProducts = null;
    let unsubOrders = null;
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (!user) {
        navigate("/vendor/login");
        return;
      }

      try {
        const vdoc = await getDoc(doc(db, "vendors", user.uid));
        if (!vdoc.exists()) {
          setVendor(null);
          setShop(null);
          setProducts([]);
          setOrdersCount(0);
          setLoading(false);
          return;
        }

        const vendorData = vdoc.data();
        setVendor(vendorData);

        if (!vendorData.shopId) {
          setShop(null);
          setProducts([]);
          setOrdersCount(0);
          setLoading(false);
          return;
        }

        const sdoc = await getDoc(doc(db, "shops", vendorData.shopId));
        setShop(sdoc.exists() ? sdoc.data() : null);

        // live products query
        const pq = query(collection(db, "products"), where("shopId", "==", vendorData.shopId));
        unsubProducts = onSnapshot(pq, (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setProducts(docs);
        }, (err) => {
          console.error("Products snapshot error:", err);
        });

        // live orders count
        const oq = query(collection(db, "orders"), where("shopId", "==", vendorData.shopId));
        unsubOrders = onSnapshot(oq, (snap) => {
          setOrdersCount(snap.size);
        }, (err) => {
          console.error("Orders snapshot error:", err);
        });

      } catch (err) {
        console.error("Error loading vendor dashboard:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      if (unsubProducts) unsubProducts();
      if (unsubOrders) unsubOrders();
      unsubAuth();
    };
  }, [navigate]);

  async function handleDelete(productId) {
    const ok = window.confirm("Delete this product? This action cannot be undone.");
    if (!ok) return;
    try {
      await deleteProductById(productId);
      alert("Product deleted");
    } catch (err) {
      console.error("Failed to delete product", err);
      alert("Failed to delete product: " + (err.message || err));
    }
  }

  // Atomic quantity update using transaction (delta can be +1 or -1 or any integer)
  async function changeQuantityAtomic(productId, delta) {
    try {
      const prodRef = doc(db, "products", productId);
      await runTransaction(db, async (tx) => {
        const prodSnap = await tx.get(prodRef);
        if (!prodSnap.exists()) throw new Error("Product not found");
        const data = prodSnap.data();
        const currentQty = Number(data.quantity || 0);
        const newQty = Math.max(0, currentQty + delta);
        tx.update(prodRef, { quantity: newQty });
      });
      // onSnapshot will update UI automatically
    } catch (err) {
      console.error("Failed to update quantity", err);
      alert("Failed to update quantity: " + (err.message || err));
    }
  }

  async function toggleAvailable(productId, newValue) {
    try {
      const prodRef = doc(db, "products", productId);
      await updateDoc(prodRef, { available: !!newValue });
      // onSnapshot updates UI
    } catch (err) {
      console.error("Failed to toggle availability", err);
      alert("Failed to toggle availability: " + (err.message || err));
    }
  }

  if (loading) return <div className="p-6">Loading dashboard…</div>;

  if (!vendor) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h2 className="text-2xl font-semibold mb-3">Vendor dashboard</h2>
        <div className="text-sm text-gray-600">Vendor profile not found. Please register your shop.</div>
        <Link to="/vendor/register" className="mt-3 inline-block px-3 py-2 bg-brand-500 text-white rounded">Register shop</Link>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h2 className="text-2xl font-semibold mb-3">Vendor dashboard</h2>
        <div className="text-sm text-gray-600">Your account is not linked to a shop. Please register a shop.</div>
        <Link to="/vendor/register" className="mt-3 inline-block px-3 py-2 bg-brand-500 text-white rounded">Register shop</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{shop?.name || "Your shop"}</h2>
          <div className="text-sm text-gray-600">{shop?.address}</div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/vendor/add" className="px-3 py-2 bg-brand-500 text-white rounded">Add Product</Link>
          <Link to="/vendor/orders" className="px-3 py-2 border rounded">Orders ({ordersCount})</Link>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-3">Products</h3>
      {products.length === 0 ? (
        <div className="text-gray-600">No products found for this shop. Add some below.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map(p => {
            const inStock = (Number(p.quantity || 0) > 0) && (p.available !== false);
            return (
              <div key={p.id} className="relative border rounded p-3 bg-white">
                {/* three-dot menu (top-right) */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => setOpenMenuFor(openMenuFor === p.id ? null : p.id)}
                    className="p-1 rounded hover:bg-gray-100"
                    aria-label="Open menu"
                  >
                    <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>

                  {openMenuFor === p.id && (
                    <div className="mt-2 w-36 bg-white rounded shadow-lg border">
                      <button
                        onClick={() => { setOpenMenuFor(null); navigate(`/vendor/edit/${p.id}`); }}
                        className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                      >
                        Edit product
                      </button>
                      <button
                        onClick={() => { setOpenMenuFor(null); handleDelete(p.id); }}
                        className="block w-full text-left px-3 py-2 text-red-600 hover:bg-gray-50"
                      >
                        Delete product
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-36 flex items-center justify-center">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="text-sm text-gray-400">No image</div>
                  )}
                </div>

                <div className="mt-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-gray-500">{p.unit}</div>
                  </div>

                  {/* stock badge */}
                  <div className="text-xs">
                    <div className={`inline-block px-2 py-1 rounded-full text-white font-semibold ${inStock ? "bg-green-500" : "bg-red-500"}`}>
                      {inStock ? "In stock" : "Out of stock"}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="font-bold">₹{p.price}</div>

                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-600">{p.quantity} left</div>

                    {/* quick +/- buttons */}
                    <button
                      onClick={() => changeQuantityAtomic(p.id, -1)}
                      className="px-2 py-1 border rounded hover:bg-gray-50"
                      title="Decrease quantity"
                    >
                      −
                    </button>
                    <button
                      onClick={() => changeQuantityAtomic(p.id, +1)}
                      className="px-2 py-1 border rounded hover:bg-gray-50"
                      title="Increase quantity"
                    >
                      +
                    </button>

                    {/* toggle availability */}
                    <button
                      onClick={() => toggleAvailable(p.id, !(p.available !== false))}
                      className={`px-2 py-1 rounded border text-sm ${p.available ? "bg-white" : "bg-gray-50"}`}
                      title="Toggle availability"
                    >
                      {p.available ? "Visible" : "Hidden"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

