// src/pages/Vendor/AddProduct.jsx
import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import { collection, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const CATEGORY_OPTIONS = [
  { id: "dairy-bakery", label: "Dairy, Bread & Eggs" },
  { id: "fruits-veggies", label: "Fruits & Vegetables" },
  { id: "snacks", label: "Snacks & Munchies" },
  { id: "beverages", label: "Cold Drinks & Juices" },
  { id: "personal-care", label: "Personal Care" },
  { id: "household", label: "Cleaning & Household" },
  { id: "other", label: "Other" },
];

export default function AddProduct() {
  const [userUid, setUserUid] = useState(null);
  const [shopId, setShopId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    unit: "",
    category: CATEGORY_OPTIONS[0].id,
    quantity: "",
    available: true,
    imageUrl: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Load vendor + shop
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/vendor/login");
        return;
      }
      setUserUid(user.uid);

      const vdoc = await getDoc(doc(db, "vendors", user.uid));
      if (!vdoc.exists()) {
        alert("Vendor profile missing");
        navigate("/vendor");
        return;
      }

      const vendorData = vdoc.data();
      if (!vendorData.shopId) {
        alert("Shop not found. Register again.");
        navigate("/vendor/register");
        return;
      }

      setShopId(vendorData.shopId);
    });

    return () => unsub();
  }, [navigate]);

  function updateField(e) {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!shopId) return alert("Shop not ready");
    if (!form.name || !form.price) return alert("Name and price are required");

    setLoading(true);

    try {
      const product = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        unit: form.unit.trim(),
        category: form.category,
        quantity: Number(form.quantity || 0),
        available: form.available,
        imageUrl: form.imageUrl.trim(), // <-- DIRECT URL
        shopId,
        vendorUid: userUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "products"), product);

      alert("Product added successfully");
      navigate("/vendor/dashboard");
    } catch (err) {
      console.error(err);
      alert("Failed to add product: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h2 className="text-xl font-semibold mb-4">Add Product</h2>

      <form onSubmit={submit} className="space-y-3">
        <input
          name="name"
          value={form.name}
          onChange={updateField}
          placeholder="Product name"
          className="w-full p-2 border rounded"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            name="unit"
            value={form.unit}
            onChange={updateField}
            placeholder="Unit (e.g. 500 ml)"
            className="p-2 border rounded"
          />

          <select
            name="category"
            value={form.category}
            onChange={updateField}
            className="p-2 border rounded"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <textarea
          name="description"
          value={form.description}
          onChange={updateField}
          placeholder="Description"
          className="w-full p-2 border rounded"
        />

        <input
          name="price"
          value={form.price}
          onChange={updateField}
          placeholder="Price"
          type="number"
          className="w-full p-2 border rounded"
        />

        <input
          name="quantity"
          value={form.quantity}
          onChange={updateField}
          placeholder="Quantity"
          type="number"
          className="w-full p-2 border rounded"
        />

        {/* NEW — DIRECT IMAGE URL FIELD */}
        <input
          name="imageUrl"
          value={form.imageUrl}
          onChange={updateField}
          placeholder="Image URL (paste link)"
          className="w-full p-2 border rounded"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="available"
            checked={form.available}
            onChange={updateField}
          />
          <span>Available</span>
        </label>

        <button
          className="px-4 py-2 bg-brand-500 text-white rounded"
          disabled={loading}
        >
          {loading ? "Adding…" : "Add product"}
        </button>
      </form>
    </div>
  );
}

