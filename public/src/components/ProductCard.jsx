// src/components/ProductCard.jsx
import React from "react";

/**
 * ProductCard
 * props:
 *  - product: product object from Firestore
 *  - onAdd: function(product) called when Add to cart is clicked
 *  - showQuantity: boolean (optional) show quantity text
 */
export default function ProductCard({ product, onAdd = () => {}, showQuantity = true }) {
  if (!product) return null;

  const qty = Number(product.quantity || 0);
  const availableFlag = product.available !== false; // undefined => true
  const inStock = availableFlag && qty > 0;

  function handleAdd() {
    if (!inStock) {
      alert("This item is out of stock.");
      return;
    }
    onAdd(product);
  }

  return (
    <div className="border rounded p-3 bg-white flex flex-col">
      <div className="h-36 flex items-center justify-center mb-2">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="max-h-full max-w-full object-contain" />
        ) : (
          <div className="h-24 w-full flex items-center justify-center text-gray-400 text-sm">No image</div>
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-sm leading-tight">{product.name}</div>
            {product.unit && <div className="text-xs text-gray-500 mt-1">{product.unit}</div>}
          </div>

          <div className="text-right">
            <div className="font-bold text-sm">₹{product.price}</div>
            {showQuantity && (
              <div className="text-xs text-gray-500 mt-1">
                {qty} left
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          {/* stock badge */}
          <div className="text-xs">
            <span
              className={`inline-block px-2 py-1 rounded-full text-white font-semibold ${
                inStock ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {inStock ? "In stock" : (availableFlag ? "Out of stock" : "Hidden")}
            </span>
          </div>

          {/* add button */}
          <div>
            <button
              onClick={handleAdd}
              disabled={!inStock}
              className={`px-3 py-1.5 rounded font-medium ${
                inStock ? "bg-brand-500 text-white hover:brightness-95" : "bg-gray-200 text-gray-600 cursor-not-allowed"
              }`}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

