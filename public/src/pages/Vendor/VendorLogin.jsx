// src/pages/Vendor/VendorLogin.jsx
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";

export default function VendorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/vendor/dashboard");
    } catch (err) {
      console.error(err);
      alert(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h2 className="text-xl font-semibold mb-4">Vendor Login</h2>
      <form onSubmit={submit} className="space-y-3">
        <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border rounded" />
        <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" placeholder="Password" className="w-full p-2 border rounded" />
        <div>
          <button disabled={loading} className="px-4 py-2 bg-brand-500 text-white rounded">{loading ? "Signing in…" : "Sign in"}</button>
        </div>
      </form>
    </div>
  );
}
