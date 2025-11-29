// src/pages/Vendor/EditProduct.jsx
import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";

const CATEGORY_OPTIONS = [
  { id: "dairy-bakery", label: "Dairy, Bread & Eggs" },
  { id: "fruits-veggies", label: "Fruits & Vegetables" },
  { id: "snacks", label: "Snacks & Munchies" },
  { id: "beverages", label: "Cold Drinks & Juices" },
  { id: "personal-care", label: "Personal Care" },
  { id: "household", label: "Cleaning & Household" },
  { id: "other", label: "Other" },
];

export default function EditProduct() {
  const { id } = useParams(); // product id
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/vendor/login");
        return;
      }

      try {
        // ensure vendor owns a shop
        const vdoc = await getDoc(doc(db, "vendors", user.uid));
        if (!vdoc.exists()) {
          alert("Vendor profile missing");
          navigate("/vendor");
          return;
        }
        setShopId(vdoc.data().shopId);

        // load product
        const pdoc = await getDoc(doc(db, "products", id));
        if (!pdoc.exists()) {
          alert("Product not found");
          navigate("/vendor/dashboard");
          return;
        }
        const pdata = pdoc.data();
        // simple ownership check: product.shopId must match vendor's shopId
        if (pdata.shopId !== vdoc.data().shopId) {
          alert("You are not allowed to edit this product");
          navigate("/vendor/dashboard");
          return;
        }

        setForm({
          name: pdata.name || "",
          description: pdata.description || "",
          price: pdata.price || "",
          unit: pdata.unit || "",
          category: pdata.category || CATEGORY_OPTIONS[0].id,
          quantity: pdata.quantity || 0,
          available: pdata.available !== undefined ? pdata.available : true,
          imageUrl: pdata.imageUrl || "",
        });
      } catch (err) {
        console.error("Failed loading product", err);
        alert("Failed to load product");
        navigate("/vendor/dashboard");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [id, navigate]);

  function updateField(e) {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, "products", id), {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        unit: form.unit.trim(),
        category: form.category,
        quantity: Number(form.quantity || 0),
        available: !!form.available,
        imageUrl: form.imageUrl.trim(),
        updatedAt: serverTimestamp(),
      });
      alert("Product updated");
      navigate("/vendor/dashboard");
    } catch (err) {
      console.error("Update error", err);
      alert("Failed to update: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-4">Loading product…</div>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h2 className="text-xl font-semibold mb-4">Edit Product</h2>

      <form onSubmit={submit} className="space-y-3">
        <input name="name" value={form.name} onChange={updateField} placeholder="Product name" className="w-full p-2 border rounded" />

        <div className="grid grid-cols-2 gap-2">
          <input name="unit" value={form.unit} onChange={updateField} placeholder="Unit (e.g. 500 ml)" className="p-2 border rounded" />
          <select name="category" value={form.category} onChange={updateField} className="p-2 border rounded">
            {CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <textarea name="description" value={form.description} onChange={updateField} placeholder="Description" className="w-full p-2 border rounded" />

        <div className="flex gap-2">
          <input name="price" value={form.price} onChange={updateField} placeholder="Price" type="number" className="p-2 border rounded flex-1" />
          <input name="quantity" value={form.quantity} onChange={updateField} placeholder="Quantity" type="number" className="p-2 border rounded w-32" />
        </div>

        <input name="imageUrl" value={form.imageUrl} onChange={updateField} placeholder="Image URL" className="w-full p-2 border rounded" />

        <label className="flex items-center gap-2">
          <input type="checkbox" name="available" checked={form.available} onChange={updateField} />
          <span>Available</span>
        </label>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-brand-500 text-white rounded" disabled={loading}>Save changes</button>
          <button type="button" onClick={() => navigate("/vendor/dashboard")} className="px-4 py-2 border rounded">Cancel</button>
        </div>
      </form>
    </div>
  );
}

