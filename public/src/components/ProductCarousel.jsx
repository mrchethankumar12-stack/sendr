// src/components/ProductCarousel.jsx
import React, { useRef, useEffect, useState } from "react";

/**
 * ProductCarousel
 *
 * Props:
 *  - items: array of data items to render
 *  - renderItem: function(item, index) => React node (required)
 *  - title: string (optional)
 *  - seeAllHref: string (optional) - link for "see all"
 *  - itemWidth: number (px) optional, default 192 (w-48)
 *  - gap: number (px) optional, default 16
 *  - snap: boolean optional, default true
 *
 * Usage:
 *  <ProductCarousel
 *     title="Popular near you"
 *     items={products}
 *     renderItem={(p)=> <ProductCard product={p} onAdd={()=>...} />}
 *  />
 */

export default function ProductCarousel({
  items = [],
  renderItem,
  title = "",
  seeAllHref = null,
  itemWidth = 192, // px matches w-48
  gap = 16,
  snap = true
}) {
  const scrollerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    function update() {
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollLeft + el.clientWidth + 10 < el.scrollWidth);
    }

    update();
    el.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  // Scroll by one "page" (or by item width * visible count)
  function scrollBy(delta) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }

  // Scroll one item left/right
  function scrollNext() {
    const el = scrollerRef.current;
    if (!el) return;
    // calculate visible items count roughly
    const visible = Math.floor(el.clientWidth / (itemWidth + gap)) || 1;
    const delta = visible * (itemWidth + gap);
    scrollBy(delta);
  }
  function scrollPrev() {
    const el = scrollerRef.current;
    if (!el) return;
    const visible = Math.floor(el.clientWidth / (itemWidth + gap)) || 1;
    const delta = -visible * (itemWidth + gap);
    scrollBy(delta);
  }

  // keyboard left/right navigation when scroller focused
  function onKeyDown(e) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollPrev();
    }
  }

  return (
    <section className="mb-8">
      {(title || seeAllHref) && (
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          {seeAllHref && (
            <a href={seeAllHref} className="text-sm text-brand-600 hover:underline">see all</a>
          )}
        </div>
      )}

      <div className="relative">
        {/* Left arrow (desktop) */}
        <button
          onClick={scrollPrev}
          aria-label="Scroll left"
          className={`hidden md:inline-flex absolute left-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm hover:bg-gray-100 focus:outline-none`}
          disabled={!canScrollLeft}
          style={{ opacity: canScrollLeft ? 1 : 0.4 }}
        >
          <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>

        {/* Scroller */}
        <div
          ref={scrollerRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          role="list"
          aria-label={title || "Products carousel"}
          className="flex gap-4 overflow-x-auto py-2 px-1 no-scrollbar"
          style={{
            scrollSnapType: snap ? "x mandatory" : undefined,
            WebkitOverflowScrolling: "touch",
            paddingLeft: 4,
            paddingRight: 4
          }}
        >
          {items.map((it, i) => (
            <div
              key={i}
              role="listitem"
              style={{
                minWidth: itemWidth,
                maxWidth: itemWidth,
                scrollSnapAlign: snap ? "start" : undefined
              }}
              className="flex-shrink-0"
            >
              {renderItem ? renderItem(it, i) : null}
            </div>
          ))}
        </div>

        {/* Right arrow (desktop) */}
        <button
          onClick={scrollNext}
          aria-label="Scroll right"
          className={`hidden md:inline-flex absolute right-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm hover:bg-gray-100 focus:outline-none`}
          disabled={!canScrollRight}
          style={{ opacity: canScrollRight ? 1 : 0.4 }}
        >
          <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </section>
  );
}

