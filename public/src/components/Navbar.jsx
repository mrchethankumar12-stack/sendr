// src/components/Navbar.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as cart from "../services/cart";

/**
 * Navbar: responsive logo fitting (no forced upscaling), location, login, cart, mobile menu.
 *
 * Logo rules:
 * - Show image as-is if smaller than header
 * - Scale down if it's larger than the header max
 * - Maintain aspect ratio (object-contain)
 */

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const [locationText, setLocationText] = useState("Use my location");
  const [requestingLocation, setRequestingLocation] = useState(false);

  // keep cart count updated
  function refreshCartCount() {
    try {
      const t = cart.getCartTotals();
      setCartCount(t.count || 0);
    } catch {
      setCartCount(0);
    }
  }

  useEffect(() => {
    refreshCartCount();
    const onStorage = () => refreshCartCount();
    window.addEventListener("storage", onStorage);
    const poll = setInterval(refreshCartCount, 1000);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(poll);
    };
  }, []);

  // listen to location requests from other parts of the app
  useEffect(() => {
    const onReq = () => requestLocation();
    window.addEventListener("sendr:request_location", onReq);
    return () => window.removeEventListener("sendr:request_location", onReq);
  }, []);

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocationText("Not supported");
      return;
    }
    setRequestingLocation(true);
    setLocationText("Locating…");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.dispatchEvent(
          new CustomEvent("sendr:location", {
            detail: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          })
        );
        setLocationText("Location set");
        setRequestingLocation(false);
      },
      (err) => {
        console.warn("geo error", err);
        setLocationText(err.code === 1 ? "Permission denied" : "Location error");
        setRequestingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* LEFT: logo + location */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center">
              {/* Responsive logo: no upscaling, only scale down if too big.
                  Place your file at public/assets/logo.png or change the path. */}
              <img
                src={`${process.env.PUBLIC_URL}/assets/logo.png`}
                alt="Sendr logo"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
                style={{
                  // maximum size allowed in navbar (so it never breaks layout)
                  maxHeight: "64px",
                  maxWidth: "240px",
                  // allow natural size if smaller (no forced width/height)
                  height: "auto",
                  width: "auto",
                  // keep aspect ratio
                  objectFit: "contain",
                  display: "block",
                }}
                className="rounded-md"
              />
              {/* accessibility: visually hidden text for screen readers */}
              <span className="sr-only">Sendr — Shop next door, instantly.</span>
            </Link>

            <div className="hidden md:flex flex-col text-sm pl-2">
              <div className="text-xs text-gray-500">
                Delivery in <span className="font-semibold text-gray-900">8 mins</span>
              </div>
              <button
                onClick={requestLocation}
                disabled={requestingLocation}
                className="text-xs text-brand-600 hover:underline"
              >
                {locationText}
              </button>
            </div>
          </div>

          {/* RIGHT: login + cart + mobile toggle */}
          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden sm:block text-sm px-3 py-1.5 rounded hover:bg-gray-50">Login</Link>

            <button
              onClick={() => navigate("/cart")}
              className="relative flex items-center gap-2 px-3 py-2 rounded-full bg-brand-500 text-white hover:brightness-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4" />
                <circle cx="10" cy="20" r="1" fill="white" />
                <circle cx="18" cy="20" r="1" fill="white" />
              </svg>
              <span className="text-sm font-medium">Cart</span>

              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
                {cartCount}
              </span>
            </button>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="sm:hidden p-2 rounded-md hover:bg-gray-100"
              aria-label="Open menu"
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t">
          <div className="px-4 py-3 space-y-2">
            <button onClick={requestLocation} className="block w-full text-left px-3 py-2 hover:bg-gray-50">{locationText}</button>
            <Link to="/" className="block px-3 py-2 hover:bg-gray-50">Home</Link>
            <Link to="/cart" className="block px-3 py-2 hover:bg-gray-50">Cart ({cartCount})</Link>
            <Link to="/auth" className="block px-3 py-2 hover:bg-gray-50">Login</Link>
          </div>
        </div>
      )}
    </header>
  );
}

