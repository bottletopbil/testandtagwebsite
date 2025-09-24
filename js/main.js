/* ============================
   main.js — ADCD Test & Tag
   ============================ */

/* ---------- Utilities ---------- */

// Safe event add (prevents duplicate listeners on the same fn)
function on(target, type, handler, opts) {
  target.removeEventListener(type, handler, opts);
  target.addEventListener(type, handler, opts);
}

// Inject an HTML partial into a placeholder element.
// - outletSel: CSS selector of placeholder (e.g., [data-header-include])
// - url: path to partial (e.g., partials/header.html)
// - after: callback once injected (use to (re)bind behaviors)
function injectPartial(outletSel, url, after) {
  const outlet = document.querySelector(outletSel);
  if (!outlet) return Promise.resolve(false);

  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res.text();
    })
    .then((html) => {
      // Replace placeholder with fetched markup
      outlet.outerHTML = html;
      if (typeof after === "function") after();
      return true;
    })
    .catch((err) => {
      console.error(`Failed to inject ${url}:`, err);
      return false;
    });
}

/* ---------- Header behaviors ---------- */

function initHeaderBehaviors() {
  const header = document.querySelector("[data-header]");
  const mobileBtn = document.querySelector("[data-mobile-btn]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");

  // Sticky shadow & subtle glassmorphism on scroll
  function updateCondensedState() {
    if (!header) return;
    header.classList.toggle("is-condensed", window.scrollY > 8);
  }
  on(window, "scroll", updateCondensedState, { passive: true });
  updateCondensedState();

  // Mobile menu toggle
  if (mobileBtn && mobileMenu) {
    const setMenuState = (open) => {
      mobileMenu.setAttribute("data-open", String(open));
      mobileBtn.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("nav-open", open);
    };

    on(mobileBtn, "click", () => {
      const open = mobileMenu.getAttribute("data-open") === "true";
      setMenuState(!open);
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      on(link, "click", () => {
        setMenuState(false);
      });
    });

    on(window, "resize", () => {
      if (window.innerWidth >= 768) {
        setMenuState(false);
      }
    });
  }
}

function markActiveNav() {
  const header = document.querySelector("[data-header]");
  if (!header) return;

  const current = window.location.pathname.split("/").pop() || "index.html";
  const links = header.querySelectorAll(".nav-link");

  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const normalized = href.split("?")[0];
    const isHome = normalized === "index.html" && (current === "" || current === "index.html");
    if (normalized === current || isHome) {
      link.classList.add("is-active");
    } else {
      link.classList.remove("is-active");
    }
  });
}

/* ---------- Reveal on scroll ---------- */

function initRevealOnScroll() {
  if (window.__revealObserver) return;

  const elements = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!elements.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    elements.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  // Stagger logic: use data-reveal-group to stagger only within a group (optional)
  const groups = new Map();
  elements.forEach((el) => {
    const group = el.getAttribute("data-reveal-group") || "__default__";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(el);
  });

  // Pre-assign delays (write once) & prep will-change just-in-time
  groups.forEach((els) => {
    els.forEach((el, index) => {
      const attrDelay = el.getAttribute("data-reveal-delay");
      const autoDelay = Math.min(index * 70, 280); // your stagger, capped
      const delay = attrDelay ? parseInt(attrDelay, 10) : autoDelay;
      el.style.setProperty("--reveal-delay", `${delay}ms`);
    });
  });

  // IntersectionObserver: trigger slightly early & with a tiny threshold for stability
  const observer = new IntersectionObserver(
    (entries) => {
      // Batch DOM writes in rAF to avoid layout thrash
      const toReveal = [];
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          // Just-in-time will-change: set before transition, remove after
          el.style.willChange = "opacity, transform";
          toReveal.push(el);
          observer.unobserve(el);
        }
      });

      if (toReveal.length) {
        requestAnimationFrame(() => {
          toReveal.forEach((el) => {
            el.classList.add("is-visible");
            // Clean up will-change after transition ends to avoid memory pressure
            const cleanup = () => {
              el.style.willChange = "";
              el.removeEventListener("transitionend", cleanup);
            };
            el.addEventListener("transitionend", cleanup, { once: true });
          });
        });
      }
    },
    {
      root: null,
      rootMargin: "0px 0px -10% 0px", // reveal just before the element fully scrolls in
      threshold: 0.08,                // small, stable threshold
    }
  );

  // Observe all targets
  elements.forEach((el) => observer.observe(el));

  // Handle elements already in view on load (Safari/iOS edge cases)
  requestAnimationFrame(() => {
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < vh * 0.92 && rect.bottom > 0) {
        el.style.willChange = "opacity, transform";
        el.classList.add("is-visible");
        const cleanup = () => { el.style.willChange = ""; el.removeEventListener("transitionend", cleanup); };
        el.addEventListener("transitionend", cleanup, { once: true });
        observer.unobserve(el);
      }
    });
  });

  window.__revealObserver = observer;
}

// Auto-init on DOM ready (safe no-op if called multiple times)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRevealOnScroll, { once: true });
} else {
  initRevealOnScroll();
}


/* ---------- Footer helper ---------- */

function initFooterYear() {
  document.querySelectorAll(".js-year").forEach((span) => {
    span.textContent = new Date().getFullYear();
  });
}

/* ---------- Boot sequence ---------- */

function bootInlineHeaderIfPresent() {
  // If a header is already in the HTML (not injected), bind behaviors
  if (document.querySelector("[data-header]")) {
    initHeaderBehaviors();
    markActiveNav();
  }
}

function bootInlineFooterIfPresent() {
  // If footer already in HTML (not injected), set year
  if (document.querySelector("footer .js-year")) {
    initFooterYear();
  }
}

function injectHeaderAndFooter() {
  // Try to inject header; if no placeholder is found, this resolves false and we just keep the inline one.
  injectPartial("[data-header-include]", "partials/header.html", () => {
    initHeaderBehaviors();
    markActiveNav();
  }).then((injected) => {
    if (!injected) bootInlineHeaderIfPresent();
  });

  // Inject footer; set the year once injected (or for inline fallback)
  injectPartial("[data-footer]", "partials/footer.html", () => {
    initFooterYear();
  }).then((injected) => {
    if (!injected) bootInlineFooterIfPresent();
  });
}

function boot() {
  injectHeaderAndFooter();
  initRevealOnScroll();
}

// Run after DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
