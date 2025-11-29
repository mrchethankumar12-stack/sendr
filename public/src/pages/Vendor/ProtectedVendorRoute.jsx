// src/components/ProtectedVendorRoute.jsx
import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { Navigate } from "react-router-dom";

export default function ProtectedVendorRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setLoading(false);
      setOk(!!user);
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="p-4">Checking auth…</div>;
  if (!ok) return <Navigate to="/vendor/login" replace />;
  return children;
}

