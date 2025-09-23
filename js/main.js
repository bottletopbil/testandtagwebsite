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

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const elements = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!elements.length) return;

  if (prefersReducedMotion) {
    elements.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  elements.forEach((el, index) => {
    const delayAttr = el.getAttribute("data-reveal-delay");
    const delay = delayAttr ? parseInt(delayAttr, 10) : Math.min(index * 70, 280);
    el.style.transitionDelay = `${delay}ms`;
    observer.observe(el);
  });

  window.__revealObserver = observer;
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
