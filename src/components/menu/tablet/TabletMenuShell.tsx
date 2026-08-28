"use client";

import { useRef, useState, useEffect, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, RotateCcw, BellRing, X, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { menuThemeVars } from "@/lib/menu-theme";
import CoverPage from "./CoverPage";
import CoverLeftPage from "./CoverLeftPage";
import CategoryIndexPage from "./CategoryIndexPage";
import MenuPage from "./MenuPage";
import BackCoverPage from "./BackCoverPage";
import FlipControls from "./FlipControls";
import TabletCartPanel from "./TabletCartPanel";
import TabletFloatingButtons from "./TabletFloatingButtons";
import TabletVideoModal from "./TabletVideoModal";
import { useFlyToCartStore } from "@/store/flyToCart";
import FlyToCartOverlay from "@/components/menu/FlyToCartOverlay";
import type { IBranding, ILocation, MenuMode } from "@/types";
import type { FlipbookPageData } from "@/app/menu/page";

interface Props {
  branding: IBranding | null;
  pages: FlipbookPageData[];
  location: ILocation | null;
  mode: MenuMode;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--menu-accent)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

// react-pageflip requires forwardRef pages
const FlipPage = forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className?: string }
>(({ children, className = "" }, ref) => (
  <div
    ref={ref}
    className={`w-full h-full overflow-hidden ${className}`}
    style={{
      background: "#FAF9F6",
      backgroundImage:
        "linear-gradient(to right, #EDE4D8 0%, #FAF9F6 3.5%, #FAF9F6 96.5%, #EDE4D8 100%)",
      boxShadow:
        "inset -2px 0 8px rgba(217,119,6,0.05), inset 2px 0 8px rgba(217,119,6,0.05)",
    }}
  >
    {children}
  </div>
));
FlipPage.displayName = "FlipPage";

export default function TabletMenuShell({
  branding,
  pages,
  location,
  mode,
}: Props) {
  const isRoom = mode === "room";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flipBookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 550, height: 780 });
  const [flipbookReady, setFlipbookReady] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<ILocation | null>(location);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [locationsList, setLocationsList] = useState<ILocation[]>([]);
  const [locationFilter, setLocationFilter] = useState<"all" | "table" | "room">("all");
  const { totalItems, setLocation } = useCartStore();

  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLocationsList(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (location) {
      setCurrentLocation(location);
      setLocation(location.code, location.label);
    }
  }, [location, setLocation]);

  const updateDimensions = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pageWidth = Math.floor(vw / 2);
    setDimensions({ width: pageWidth, height: vh });
  };

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const onFlip = (e: { data: number }) => {
    setCurrentPage(e.data);
    setIsFlipping(false);
    if (!flipbookReady) setFlipbookReady(true);
  };

  const goPrev = () => {
    try {
      flipBookRef.current?.pageFlip()?.flipPrev();
    } catch {
      // safe fallback
    }
  };
  const goNext = () => {
    try {
      flipBookRef.current?.pageFlip()?.flipNext();
    } catch {
      // safe fallback
    }
  };
  const goToPage = (n: number) => {
    try {
      flipBookRef.current?.pageFlip()?.turnToPage(n);
    } catch {
      // safe fallback
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cartCount = totalItems();
  const [cartBumping, setCartBumping] = useState(false);
  const prevCount = useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCount.current) {
      setCartBumping(true);
      const t = setTimeout(() => setCartBumping(false), 450);
      return () => clearTimeout(t);
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  const themeVars = menuThemeVars(branding);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none bg-[#FAF9F6] text-slate-900"
      style={{
        ...themeVars,
        touchAction: "pan-x",
      }}
      tabIndex={0}
      aria-label="Interactive Restaurant Menu Flipbook"
    >
      {/* ── Visual Centre Spine (Hides instantly during page flip) ─────────── */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 transition-opacity duration-150 ${
          isFlipping ? "opacity-0" : "opacity-100"
        }`}
        style={{
          width: 80,
          zIndex: 3,
        }}
        aria-hidden="true"
      >
        {/* Left-side depth shadow (falls onto left page) */}
        <div
          className="absolute inset-y-0"
          style={{
            right: "50%",
            width: 36,
            background: "linear-gradient(to left, rgba(217,119,6,0.08) 0%, rgba(180,83,9,0.03) 45%, transparent 100%)",
          }}
        />
        {/* Right-side depth shadow (falls onto right page) */}
        <div
          className="absolute inset-y-0"
          style={{
            left: "50%",
            width: 36,
            background: "linear-gradient(to right, rgba(217,119,6,0.08) 0%, rgba(180,83,9,0.03) 45%, transparent 100%)",
          }}
        />
        {/* Wide accent ambient warm glow */}
        <div
          className="absolute inset-y-0"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            width: 30,
            background: "radial-gradient(ellipse 15px 80% at 50% 50%, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.05) 60%, transparent 100%)",
          }}
        />
        {/* Hard spine stitch line in Royal Gold */}
        <div
          className="absolute inset-y-0"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            width: 1.5,
            background: "linear-gradient(to bottom, transparent 0%, rgba(217,119,6,0.25) 8%, rgba(217,119,6,0.85) 50%, rgba(217,119,6,0.25) 92%, transparent 100%)",
          }}
        />
        {/* Centre glowing Amber Jewel */}
        <div
          className="absolute left-1/2"
          style={{
            top: "50%",
            transform: "translate(-50%, -50%) rotate(45deg)",
            width: 9,
            height: 9,
            background: "linear-gradient(135deg, #fef3c7 0%, #f59e0b 50%, #d97706 100%)",
            border: "1px solid #fde68a",
            boxShadow: "0 0 10px 2px rgba(217,119,6,0.5), 0 0 20px 4px rgba(245,158,11,0.25)",
          }}
        />
      </div>

      {/* ── Flipbook fills entire screen (z-index above spine) ───────── */}
      <div
        className="absolute inset-0"
        style={{ touchAction: "pan-x", overscrollBehavior: "none", zIndex: 2 }}
      >
        <HTMLFlipBook
          ref={flipBookRef}
          width={dimensions.width}
          height={dimensions.height}
          size="fixed"
          minWidth={100}
          maxWidth={2000}
          minHeight={100}
          maxHeight={2000}
          drawShadow
          flippingTime={700}
          usePortrait={false}
          startZIndex={0}
          autoSize={false}
          maxShadowOpacity={0.25}
          showCover={false}
          mobileScrollSupport={false}
          onFlip={onFlip}
          onInit={() => setFlipbookReady(true)}
          onChangeState={(e: { data: string }) => {
            setIsFlipping(e.data === "flipping" || e.data === "user_fold" || e.data === "fold_corner");
          }}
          className="flipbook-shadow"
          style={{}}
          startPage={0}
          clickEventForward
          useMouseEvents
          swipeDistance={40}
          showPageCorners
          disableFlipByClick={true}
        >
          {pages.map((page, i) => (
            <FlipPage key={i}>
              {page.type === "cover_left" && (
                <CoverLeftPage
                  branding={branding}
                  width={dimensions.width}
                  height={dimensions.height}
                />
              )}
              {page.type === "cover" && (
                <CoverPage
                  branding={branding}
                  width={dimensions.width}
                  height={dimensions.height}
                />
              )}
              {page.type === "index" && (
                <CategoryIndexPage
                  categories={page.categories}
                  onCategoryClick={(catId: string) => {
                    const idx = pages.findIndex(
                      (p) => p.type === "menu" && p.category._id === catId,
                    );
                    if (idx !== -1) {
                      goToPage(idx);
                    }
                  }}
                  width={dimensions.width}
                  height={dimensions.height}
                />
              )}
              {page.type === "menu" && (
                <MenuPage
                  category={page.category}
                  items={page.items}
                  chunkIndex={page.chunkIndex}
                  totalChunks={page.totalChunks}
                  isRoom={true}
                  width={dimensions.width}
                  height={dimensions.height}
                  logoUrl={branding?.logoUrl}
                />
              )}
              {page.type === "blank" && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF9F6] p-8 text-center select-none relative">
                  <div className="absolute inset-4 rounded-2xl border border-amber-800/10 pointer-events-none" />
                  <span className="text-amber-500/40 text-4xl mb-3">✦</span>
                  <h3 className="font-playfair text-slate-800 text-xl font-bold uppercase tracking-widest mb-2">
                    Thank You
                  </h3>
                  <p className="text-amber-900/60 text-xs tracking-wider italic max-w-xs">
                    Great food brings people together. We hope you have a delightful dining experience with us.
                  </p>
                  <div className="w-12 h-0.5 bg-amber-500/30 mt-4" />
                </div>
              )}
              {page.type === "back_cover" && (
                <BackCoverPage
                  branding={branding}
                  location={location}
                  width={dimensions.width}
                  height={dimensions.height}
                />
              )}
            </FlipPage>
          ))}
        </HTMLFlipBook>
      </div>

      {/* ── Top subtle vignette ─────────────── */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-16 z-10"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.06), transparent)",
        }}
      />

      {/* ── Bottom subtle vignette ──────────────────────────────────── */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 z-10"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.06), transparent)",
        }}
      />

      {/* ── Top-left Table/Room selector button ── */}
      {(() => {
        const isCoverPage = currentPage === 0;
        if (!isCoverPage && currentLocation) return null;

        const isRoom = currentLocation?.type === "room";
        const currentLocDisplay = currentLocation
          ? isRoom
            ? currentLocation.label.trim().toLowerCase().startsWith("room") || currentLocation.label.trim().toLowerCase().startsWith("suite")
              ? currentLocation.label.trim()
              : `Room ${currentLocation.label.trim()}`
            : currentLocation.label.trim().toLowerCase().startsWith("table")
              ? currentLocation.label.trim()
              : `Table ${currentLocation.label.trim()}`
          : "Select Table / Room";

        return (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.2 }}
            className="fixed left-3 sm:left-4 flex items-center gap-2"
            style={{
              zIndex: 9999,
              top: "max(0.6rem, env(safe-area-inset-top))",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => setTablePickerOpen(true)}
              className="px-3.5 h-9 rounded-full text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer touch-manipulation transition-all hover:shadow-md active:opacity-80"
              style={{
                background: "rgba(255,255,255,0.96)",
                backdropFilter: "blur(12px)",
                border: "1.5px solid rgba(217, 119, 6, 0.7)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
              title="Click to select or change table/room"
            >
              <span className="text-slate-950 font-black flex items-center gap-1.5 text-xs sm:text-sm">
                {isRoom ? "🛏️" : "🪑"} {currentLocDisplay}
              </span>
              <span className="text-[10px] text-white bg-amber-500 font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                {currentLocation ? "Change ▾" : "Choose ▾"}
              </span>
            </motion.button>
          </motion.div>
        );
      })()}

      {/* ── Top-right toolbar ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed right-3 flex items-center gap-2"
        style={{
          zIndex: 9999,
          isolation: "isolate",
          top: "max(0.5rem, env(safe-area-inset-top))",
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Back to Menu Button (Only visible once menu is opened, hidden on Cover page) */}
        {currentPage > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => {
              const menuIndex = pages.findIndex((p) => p.type === "index");
              goToPage(menuIndex !== -1 ? menuIndex : 2);
            }}
            className={`flex items-center gap-1.5 px-3.5 h-11 rounded-full text-xs font-bold cursor-pointer touch-manipulation text-slate-800 ${FOCUS_RING}`}
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(217, 119, 6, 0.4)",
              boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
            }}
            title="Back to Menu"
            aria-label="Back to Menu"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-600" />
            <span>Back to Menu</span>
          </motion.button>
        )}

        {/* Cart */}
        <motion.button
          id="top-cart-btn"
          data-cart-btn="true"
          whileTap={{ scale: 0.9 }}
          animate={
            cartBumping
              ? { scale: [1, 1.35, 0.85, 1.15, 1], rotate: [0, -10, 10, -5, 0] }
              : { scale: 1, rotate: 0 }
          }
          transition={{ duration: 0.4 }}
          onClick={() => setCartOpen(true)}
          className={`w-11 h-11 rounded-full flex items-center justify-center relative cursor-pointer touch-manipulation ${FOCUS_RING}`}
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            border: "1.5px solid rgba(217, 119, 6, 0.6)",
            boxShadow: cartBumping ? "0 0 25px rgba(217,119,6,0.5)" : "0 4px 15px rgba(0,0,0,0.06)",
          }}
          aria-label={`Open order${cartCount > 0 ? `, ${cartCount} items` : ""}`}
        >
          <ShoppingCart
            className="w-4 h-4 transition-colors"
            style={{ color: cartBumping ? "#D97706" : "#0F172A" }}
          />
          {cartCount > 0 && (
            <motion.span
              key={cartCount}
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-extrabold tabular-nums shadow-sm bg-amber-500 text-white"
            >
              {cartCount}
            </motion.span>
          )}
        </motion.button>
      </motion.div>

      {/* ── Flip Controls (bottom-center overlay) ────────────────────── */}
      <div
        className="fixed left-1/2 -translate-x-1/2"
        style={{
          zIndex: 9999,
          bottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <FlipControls
          currentPage={currentPage}
          totalPages={pages.length}
          onPrev={goPrev}
          onNext={goNext}
        />
      </div>

      {/* ── Cart Panel ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {cartOpen && (
          <TabletCartPanel
            branding={branding}
            location={currentLocation || location}
            onClose={() => setCartOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Table/Room Picker Modal ─────── */}
      <AnimatePresence>
        {tablePickerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
              style={{ zIndex: 100000 }}
              onClick={() => setTablePickerOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-slate-900 space-y-4"
              style={{ zIndex: 100001 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 text-xl shadow-xs">
                    🏨
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 font-playfair">Select Table or Room</h3>
                    <p className="text-xs text-slate-500 font-medium">Choose your location to place orders</p>
                  </div>
                </div>
                <button
                  onClick={() => setTablePickerOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-600 cursor-pointer"
                  aria-label="Close location selector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2">
                {(["all", "table", "room"] as const).map((tab) => {
                  const count =
                    tab === "all"
                      ? locationsList.length
                      : locationsList.filter((l) => l.type === tab).length;
                  const label =
                    tab === "all"
                      ? "All"
                      : tab === "table"
                        ? "🍽️ Tables"
                        : "🛏️ Rooms";
                  return (
                    <button
                      key={tab}
                      onClick={() => setLocationFilter(tab)}
                      className={`btn btn-xs rounded-xl font-bold cursor-pointer transition-all ${
                        locationFilter === tab
                          ? "bg-amber-500 hover:bg-amber-600 text-white border-none shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-none"
                      }`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1">
                {locationsList.length === 0 ? (
                  <div className="col-span-4 py-8 text-center text-slate-400 text-xs">
                    Loading locations…
                  </div>
                ) : (
                  [...locationsList]
                    .filter((loc) => locationFilter === "all" || loc.type === locationFilter)
                    .sort((a, b) => {
                      if (a.type !== b.type) return a.type === "table" ? -1 : 1;
                      const getNum = (str: string) => {
                        const m = str.trim().match(/^(?:Table\s*|Room\s*|T\s*-?\s*|R\s*-?\s*)?(\d+)$/i);
                        return m ? parseInt(m[1], 10) : null;
                      };
                      const numA = getNum(a.label);
                      const numB = getNum(b.label);
                      if (numA !== null && numB !== null) return numA - numB;
                      if (numA !== null) return -1;
                      if (numB !== null) return 1;
                      return a.label.localeCompare(b.label, undefined, { numeric: true });
                    })
                    .map((loc) => {
                      const isSelected =
                        currentLocation?._id === loc._id ||
                        currentLocation?.code === loc.code;
                      const isRoom = loc.type === "room";
                      const formattedLabel = isRoom
                        ? loc.label.toLowerCase().startsWith("room") || loc.label.toLowerCase().startsWith("suite")
                          ? loc.label
                          : `Room ${loc.label}`
                        : loc.label.toLowerCase().startsWith("table") || isNaN(Number(loc.label.trim()))
                          ? loc.label
                          : `Table ${loc.label}`;
                      return (
                        <button
                          key={loc._id}
                          onClick={() => {
                            setCurrentLocation(loc);
                            setLocation(loc.code, loc.label);
                            setTablePickerOpen(false);
                          }}
                          className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer font-extrabold text-xs flex flex-col items-center gap-1 active:scale-95 ${
                            isSelected
                              ? "bg-amber-500 text-white border-amber-500 shadow-md scale-105"
                              : "bg-slate-50 text-slate-900 border-slate-200 hover:bg-amber-50 hover:border-amber-400"
                          }`}
                        >
                          <span className="text-lg">{isRoom ? "🛏️" : "🪑"}</span>
                          <span className="truncate max-w-full px-1">{formattedLabel}</span>
                          {isSelected && (
                            <span className="text-[8px] font-extrabold uppercase bg-white text-amber-700 px-1.5 py-0.2 rounded-full shadow-xs">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })
                )}
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Orders placed from this menu will be tagged to this table or room.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Floating Buttons ─────────────────────────────────────────── */}
      <TabletFloatingButtons
        branding={branding}
        mode={mode}
        locationCode={currentLocation?.code || location?.code || null}
      />

      {/* ── Dish Video Player ────────────────────────────────────────── */}
      <TabletVideoModal />

      {/* ── Dynamic Fly-To-Cart Animation Overlay ────────────────────── */}
      <FlyToCartOverlay />
    </div>
  );
}
