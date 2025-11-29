// src/pages/Customer/CustomerBrowse.jsx
import React, { useEffect, useState, useCallback } from "react";
import CategoryScroller from "../../components/CategoryScroller";
import ProductCarousel from "../../components/ProductCarousel";
import ProductCard from "../../components/ProductCard";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { haversineKm } from "../../utils/distance";
import * as cart from "../../services/cart";
import { Link } from "react-router-dom";

/**
 * CustomerBrowse v2 — With ProductCarousel
 * Mimics Blinkit home UI.
 */

const CATEGORIES = [
  { id: "fruits-veg", title: "Fruits & Vegetables", iconUrl: `${process.env.PUBLIC_URL}/assets/cat-fruits.png` },
  { id: "dairy-bakery", title: "Dairy, Bread & Eggs", iconUrl: `${process.env.PUBLIC_URL}/assets/cat-dairy.png` },
  { id: "snacks", title: "Snacks & Munchies", iconUrl: `${process.env.PUBLIC_URL}/assets/cat-snacks.png` },
  { id: "beverages", title: "Cold Drinks & Juices", iconUrl: `${process.env.PUBLIC_URL}/assets/cat-bev.png` },
  { id: "breakfast", title: "Breakfast & Instant Food", iconUrl: `${process.env.PUBLIC_URL}/assets/cat-breakfast.png` },
  { id: "personal-care", title: "Personal Care", iconUrl: `${process.env.PUBLIC_URL}/assets/cat-personal.png` },
  { id: "household", title: "Cleaning Essentials", iconUrl: `${process.env.PUBLIC_URL}/assets/cat-house.png` },
  { id: "pet-care", title: "Pet Care", iconUrl: `${process.env.PUBLIC_URL}/assets/cat-pet.png` },
];

export default function CustomerBrowse({ search = "" }) {
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);

  const [userLocation, setUserLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(5);

  const [toast, setToast] = useState(null);

  /* ---------------------------------------
        LOAD PRODUCTS + SHOPS
  ----------------------------------------- */
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setLoading(true);
      try {
        const [prodSnap, shopSnap] = await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(collection(db, "shops")),
        ]);

        const prodItems = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const shopItems = shopSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const shopMap = Object.fromEntries(shopItems.map(s => [s.id, s]));

        if (!mounted) return;
        setProducts(prodItems);
        setShops(shopMap);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAll();
    return () => { mounted = false; };
  }, []);

  /* ---------------------------------------
        LISTEN FOR LOCATION
  ----------------------------------------- */
  useEffect(() => {
    function onLocation(e) {
      const { lat, lng } = e.detail || {};
      if (lat && lng) {
        setUserLocation({ lat, lng });
      }
    }
    window.addEventListener("sendr:location", onLocation);
    return () => window.removeEventListener("sendr:location", onLocation);
  }, []);

  /* ---------------------------------------
      PRODUCT META (distance, shop)
  ----------------------------------------- */
  const attachMeta = useCallback(
    (p) => {
      const shop = shops[p.shopId] || null;
      let distance = null;

      if (userLocation && shop && shop.location?.lat) {
        distance = haversineKm(
          userLocation.lat,
          userLocation.lng,
          shop.location.lat,
          shop.location.lng
        );
      }

      return { ...p, shop, distance };
    },
    [shops, userLocation]
  );

  /* ---------------------------------------
      CATEGORY FILTER FUNCTION
  ----------------------------------------- */
  function filterByCategory(categoryId) {
    let list = products.map(attachMeta);

    // Match product.category OR heuristics
    list = list.filter(p => {
      const cat = (p.category || "").toLowerCase();
      if (cat === categoryId) return true;

      const name = (p.name || "").toLowerCase();

      if (categoryId === "fruits-veg")
        return /tomato|potato|banana|apple|veg|vegetable|fruit/.test(name);
      if (categoryId === "dairy-bakery")
        return /milk|bread|cheese|dairy|paneer|cream|egg/.test(name);
      if (categoryId === "snacks")
        return /snack|chips|kurkure|lays|namkeen|biscuit/.test(name);
      if (categoryId === "beverages")
        return /juice|cola|drink|tea|coffee|soda|energy/.test(name);
      if (categoryId === "breakfast")
        return /corn|cereal|maggi|instant|breakfast|oats/.test(name);
      if (categoryId === "personal-care")
        return /soap|shampoo|cream|lotion|toothpaste|deodorant/.test(name);
      if (categoryId === "household")
        return /detergent|clean|floor|phenyl|wash|house/.test(name);
      if (categoryId === "pet-care")
        return /dog|cat|pet|pedigree|whiskas|meo/.test(name);

      return false;
    });

    // search filter
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.shop?.name || "").toLowerCase().includes(q)
      );
    }

    // radius filter
    if (userLocation) {
      list = list.filter(p => p.distance !== null && p.distance <= radiusKm);
    }

    return list;
  }

  /* ---------------------------------------
        ADD TO CART
  ----------------------------------------- */
  function handleAdd(p) {
    const shopId = p.shopId;
    const currentShop = cart.getCartShopId();

    if (currentShop && currentShop !== shopId) {
      if (!window.confirm("Your cart is from another shop. Clear cart?")) return;
      cart.clearCart();
    }

    cart.addItem(
      {
        id: p.id,
        name: p.name,
        price: Number(p.price || 0),
        qty: p.qty,
        imageUrl: p.imageUrl || `${process.env.PUBLIC_URL}/assets/placeholder-product-1.jpg`,
        shopId,
      },
      1
    );

    setToast(`${p.name} added to cart`);
    setTimeout(() => setToast(null), 1400);

    window.dispatchEvent(new Event("storage"));
  }

  /* ---------------------------------------
         UI RENDERING
  ----------------------------------------- */

  const categoryData = CATEGORIES.find((c) => c.id === selectedCategory);
  const selectedProducts = filterByCategory(selectedCategory);

  return (
    <div>
      {/* CATEGORY SCROLLER */}
      <div className="mb-4">
        <CategoryScroller
          categories={CATEGORIES}
          initialActive={selectedCategory}
          onSelect={(id) => setSelectedCategory(id)}
        />
      </div>

      {/* RADIUS CONTROL */}
      <div className="flex items-center justify-between mb-6 text-sm">
        <div className="flex items-center gap-2">
          <span>Radius:</span>
          {[1, 3, 5].map((r) => (
            <button
              key={r}
              onClick={() => setRadiusKm(r)}
              className={`px-3 py-1 rounded ${
                radiusKm === r ? "bg-brand-500 text-white" : "bg-gray-100"
              }`}
            >
              {r} km
            </button>
          ))}
        </div>

        {!userLocation ? (
          <button
            className="underline text-brand-600"
            onClick={() =>
              window.dispatchEvent(new Event("sendr:request_location"))
            }
          >
            Use my location
          </button>
        ) : (
          <span className="text-gray-600">Location active ✓</span>
        )}
      </div>

      {/* SELECTED CATEGORY FIRST */}
      <ProductCarousel
        title={categoryData?.title || "Products"}
        items={selectedProducts}
        renderItem={(p) => (
          <ProductCard
            product={{
              ...p,
              shopName: p.shop?.name || "Local shop",
              imageUrl:
                p.imageUrl ||
                `${process.env.PUBLIC_URL}/assets/placeholder-product-1.jpg`,
            }}
            onAdd={() => handleAdd(p)}
          />
        )}
      />

      {/* SHOW 3 MORE CATEGORIES */}
      {CATEGORIES.filter((c) => c.id !== selectedCategory)
        .slice(0, 3)
        .map((cat) => {
          const list = filterByCategory(cat.id);
          return (
            <ProductCarousel
              key={cat.id}
              title={cat.title}
              items={list}
              renderItem={(p) => (
                <ProductCard
                  product={{
                    ...p,
                    shopName: p.shop?.name || "Local shop",
                    imageUrl:
                      p.imageUrl ||
                      `${process.env.PUBLIC_URL}/assets/placeholder-product-1.jpg`,
                  }}
                  onAdd={() => handleAdd(p)}
                />
              )}
            />
          );
        })}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-white border shadow-lg rounded-md px-4 py-2 text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}

