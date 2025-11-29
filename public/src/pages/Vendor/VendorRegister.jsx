// src/pages/Vendor/VendorRegister.jsx
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";

export default function VendorRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    shopName: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    pincode: "",
  });
  const [loading, setLoading] = useState(false);

  function updateField(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const { email, password, shopName, name, phone, address, pincode } = form;
    if (!email || !password || !shopName) return alert("Fill required fields");

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // create shop doc
      const shopRef = await addDoc(collection(db, "shops"), {
        name: shopName,
        vendorUid: uid,
        address: address || "",
        pincode: pincode || "",
        createdAt: serverTimestamp(),
      });

      // create vendor profile
      await setDoc(doc(db, "vendors", uid), {
        uid,
        email,
        phone: phone || "",
        name: name || "",
        shopId: shopRef.id,
        createdAt: serverTimestamp(),
      });

      navigate("/vendor/dashboard");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-xl font-semibold mb-4">Vendor Register</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input name="name" value={form.name} onChange={updateField} placeholder="Your name" className="w-full p-2 border rounded" />
        <input name="shopName" value={form.shopName} onChange={updateField} placeholder="Shop name" className="w-full p-2 border rounded" />
        <input name="email" value={form.email} onChange={updateField} placeholder="Email" className="w-full p-2 border rounded" />
        <input name="phone" value={form.phone} onChange={updateField} placeholder="Phone" className="w-full p-2 border rounded" />
        <input name="password" value={form.password} onChange={updateField} type="password" placeholder="Password" className="w-full p-2 border rounded" />
        <input name="address" value={form.address} onChange={updateField} placeholder="Address" className="w-full p-2 border rounded" />
        <input name="pincode" value={form.pincode} onChange={updateField} placeholder="Pincode" className="w-full p-2 border rounded" />

        <div>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-500 text-white rounded">
            {loading ? "Creating…" : "Create account & shop"}
          </button>
        </div>
      </form>
    </div>
  );
}

