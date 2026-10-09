"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { NAV_LINKS } from "@/lib/content";
import { getProducts, Product } from "@/lib/api/products";
import { useAuth } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";
import "./navbar-extra.css";

const isActive = (pathname: string, href: string) => {
  if (href.startsWith("/#") || href.includes("?")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, logout } = useAuth();
  const { openAuth } = useAuthModal();

  const accountMenuId = useId();
  const mobileMenuId = useId();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const searchRequestRef = useRef(0);

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "";

  /* Scroll state (passive listener). */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Close menus when the route changes. */
  useEffect(() => {
    setMenuOpen(false);
    setAccountMenuOpen(false);
    setSearchFocused(false);
  }, [pathname]);

  /* Let other components open the search box. */
  useEffect(() => {
    const handler = () => {
      setSearchFocused(true);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    };
    window.addEventListener("dhaaga:opensearch", handler);
    return () => window.removeEventListener("dhaaga:opensearch", handler);
  }, []);

  /* Live product search, debounced and race-safe. */
  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      const requestId = ++searchRequestRef.current;
      setSearchLoading(true);

      try {
        const response = await getProducts({ q: query, page: 1, limit: 6 });
        if (requestId !== searchRequestRef.current) return;
        setSearchResults(response.products || []);
      } catch {
        if (requestId === searchRequestRef.current) setSearchResults([]);
      } finally {
        if (requestId === searchRequestRef.current) setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* Outside click closes search results and the account menu. */
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchFocused(false);
      }
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSearchFocused(false);
      setAccountMenuOpen(false);
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchFocused(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setAccountMenuOpen(false);
      setMenuOpen(false);
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSignIn = () => {
    setMenuOpen(false);
    setAccountMenuOpen(false);
    openAuth();
  };

  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-inner">
        {/* LOGO */}
        <Link href="/" className="navbar-logo" aria-label="Dhaaga-E-Jashn home">
          <Image
            src="/images/logo.webp"
            alt="Dhaaga-E-Jashn"
            width={150}
            height={58}
            priority
          />
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav className="nav-links" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="nav-link"
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ACTIONS */}
        <div className="nav-actions">
          {/* SEARCH */}
          <div className="nav-search" ref={searchContainerRef}>
            <form
              className="nav-search-form"
              role="search"
              onSubmit={(event) => event.preventDefault()}
            >
              <svg
                className="nav-search-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>

              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchFocused(true);
                }}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search kurtas, kurtis..."
                aria-label="Search products"
                className="nav-search-input"
                autoComplete="off"
              />

              {searchQuery && (
                <button
                  type="button"
                  className="nav-search-clear"
                  aria-label="Clear search"
                  onClick={clearSearch}
                >
                  ×
                </button>
              )}
            </form>

            {searchFocused && searchQuery.trim().length >= 2 && (
              <div
                className="nav-search-dropdown"
                role="region"
                aria-label="Search results"
                aria-live="polite"
              >
                {searchLoading ? (
                  <div className="nav-search-status">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <>
                    <div className="nav-search-heading">Search results</div>

                    {searchResults.map((product) => (
                      <Link
                        key={product._id}
                        href={`/product/${product.slug}`}
                        className="nav-search-result"
                        onClick={() => {
                          setSearchFocused(false);
                          setSearchQuery("");
                        }}
                      >
                        <div className="nav-search-image">
                          {product.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.images[0]}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              width={44}
                              height={56}
                            />
                          ) : (
                            <div className="nav-search-image-placeholder" />
                          )}
                        </div>

                        <div className="nav-search-result-info">
                          <span className="nav-search-result-name">{product.name}</span>
                          <span className="nav-search-result-price">
                            ₹{product.price.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </>
                ) : (
                  <div className="nav-search-status">
                    No products found for &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* WISHLIST */}
          <Link href="/wishlist" className="icon-btn hide-mobile" aria-label="Wishlist">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
            </svg>
          </Link>

          {/* SIGN IN  /  ACCOUNT */}
          {authLoading ? (
            <span className="nav-signin-placeholder" aria-hidden="true" />
          ) : user ? (
            <div className="account-wrapper" ref={accountRef}>
              <button
                type="button"
                className="icon-btn"
                aria-label="Account menu"
                aria-haspopup="true"
                aria-expanded={accountMenuOpen}
                aria-controls={accountMenuId}
                onClick={() => setAccountMenuOpen((value) => !value)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
              </button>

              {accountMenuOpen && (
                <div className="account-dropdown" id={accountMenuId}>
                  <div className="account-greeting">Hello, {firstName || "there"}</div>
                  <Link href="/account">My account</Link>
                  <Link href="/account/orders">Orders</Link>
                  <Link href="/wishlist">Wishlist</Link>
                  {user.role === "admin" && <Link href="/admin">Admin</Link>}
                  <button type="button" onClick={handleLogout}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button type="button" className="nav-signin" onClick={handleSignIn}>
                Sign in
              </button>
              <button
                type="button"
                className="icon-btn nav-signin-icon"
                aria-label="Sign in"
                onClick={handleSignIn}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
              </button>
            </>
          )}

          {/* CART */}
          <Link href="/cart" className="icon-btn" aria-label="Shopping bag">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 8h12l1 13H5L6 8Z" />
              <path d="M9 8a3 3 0 0 1 6 0" />
            </svg>
          </Link>

          {/* SHOP NOW */}
          <Link href="/shop" className="nav-cta">
            Shop Now
          </Link>

          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls={mobileMenuId}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="mobile-menu" id={mobileMenuId}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="mobile-menu-link"
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          <Link href="/wishlist" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>
            Wishlist
          </Link>

          {user ? (
            <>
              <Link href="/account" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>
                My account
              </Link>
              <button type="button" className="mobile-menu-link" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            !authLoading && (
              <button type="button" className="mobile-menu-link" onClick={handleSignIn}>
                Sign in
              </button>
            )
          )}

          <Link href="/shop" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>
            Shop Now
          </Link>
        </div>
      )}
    </header>
  );
}
