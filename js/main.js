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

  return fetch(url, { cache: "no-cache" })
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
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 6) {
      header.classList.add("shadow-elev1", "backdrop-blur", "bg-bg/70");
    } else {
      header.classList.remove("shadow-elev1", "backdrop-blur", "bg-bg/70");
    }
  }
  on(window, "scroll", onScroll);
  onScroll();

  // Mobile menu toggle
  if (mobileBtn && mobileMenu) {
    on(mobileBtn, "click", () => {
      const open = mobileMenu.getAttribute("data-open") === "true";
      mobileMenu.setAttribute("data-open", String(!open));
      mobileMenu.classList.toggle("pointer-events-none", open);
      mobileMenu.classList.toggle("opacity-0", open);
      mobileBtn.setAttribute("aria-expanded", String(!open));
    });
  }
}

/* ---------- Reveal on scroll ---------- */

function initRevealOnScroll() {
  // If already initialized, skip
  if (window.__revealObserver) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("opacity-100", "translate-y-0");
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll("[data-reveal]").forEach((el) => {
    el.classList.add(
      "opacity-0",
      "translate-y-3",
      "transition",
      "duration-300"
    );
    observer.observe(el);
  });

  // Mark as initialized to prevent double observers
  window.__revealObserver = observer;
}

/* ---------- Floating labels ---------- */

function initFloatingLabels() {
  document.querySelectorAll("[data-float]").forEach((wrap) => {
    const input = wrap.querySelector("input, textarea");
    const label = wrap.querySelector("label");
    if (!input || !label) return;

    const toggle = () => {
      if (input.value) {
        label.classList.add(
          "-translate-y-3",
          "text-text-muted",
          "text-xs",
          "opacity-90"
        );
      } else {
        label.classList.remove(
          "-translate-y-3",
          "text-text-muted",
          "text-xs",
          "opacity-90"
        );
      }
    };

    on(input, "input", toggle);
    on(input, "blur", toggle);
    toggle();
  });
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
    initHeaderBehaviors(); // rebind after header lands in DOM
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
  initFloatingLabels();
}

// Run after DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
