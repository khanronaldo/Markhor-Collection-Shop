/* ============================================================
   MARKHOR COLLECTIONS - Shared JavaScript
   Handles: Cart (localStorage), Search, Header scroll,
            Reveal animations, Toast notifications,
            Product Fetching (Netlify CMS)
   ============================================================ */

/* ─── PRODUCT DATA FETCHING FROM CMS ─────────────────────── */
let PRODUCTS = [];

async function loadProducts() {
  try {
    const response = await fetch('data/products.json');
    if (!response.ok) throw new Error("Could not load products data");
    
    const data = await response.json();
    
    // CMS list data ko normalize karna purane format mein
    if (data && data.items) {
      PRODUCTS = data.items.map(p => {
        // CMS se colors array aayega
        let mappedColors = p.colors || [];
        
        // CMS se colorImagesList aayega [{colorName: 'black', imgUrl: 'image.jpg'}]
        // isko object {'black': 'image.jpg'} mein convert kar rahe hain taake shop.html na toote
        let mappedColorImages = {};
        if (p.colorImagesList) {
          p.colorImagesList.forEach(c => {
            mappedColorImages[c.colorName] = c.imgUrl;
          });
        }

        return {
          ...p,
          colors: mappedColors,
          colorImages: mappedColorImages
        };
      });
    }

    // Products load hone ke baad agar hum shop page par hain toh render call karo
    if (typeof renderProducts === 'function') {
      renderProducts();
    }
    
  } catch (error) {
    console.error("Products Loading Error:", error);
  }
}

/* ─── CART UTILITIES ────────────────────────────────────────── */

/**
 * Get cart from localStorage.
 * Cart structure: [ { id, name, price, image, size, color, quantity } ]
 */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('markhor_cart')) || [];
  } catch { return []; }
}

/** Save cart array to localStorage */
function saveCart(cart) {
  localStorage.setItem('markhor_cart', JSON.stringify(cart));
}

/**
 * Add an item to the cart.
 * If same product + size + color exists, increment quantity.
 */
function addToCart(product, size, color, quantity = 1) {
  const cart = getCart();
  const existingIndex = cart.findIndex(
    item => item.id === product.id && item.size === size && item.color === color
  );
  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      size,
      color,
      quantity
    });
  }
  saveCart(cart);
  updateCartBadge();
  showToast(`✓ ${product.name} added to cart!`);
}

/** Remove item from cart by index */
function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  updateCartBadge();
}

/** Update quantity of a cart item */
function updateCartQuantity(index, delta) {
  const cart = getCart();
  if (!cart[index]) return;
  cart[index].quantity = Math.max(1, cart[index].quantity + delta);
  saveCart(cart);
}

/** Get total item count for badge */
function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

/** Get cart subtotal */
function getCartSubtotal() {
  return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/** Update all cart badge elements on page */
function updateCartBadge() {
  const count = getCartCount();
  document.querySelectorAll('.cart-badge').forEach(badge => {
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  });
}

/* ─── SEARCH ────────────────────────────────────────────────── */

/**
 * Filter PRODUCTS array by search query.
 * Matches name, category.
 */
function searchProducts(query) {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  return PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  );
}

/** Render search dropdown results */
function renderSearchDropdown(results, dropdownEl) {
  if (results.length === 0) {
    dropdownEl.innerHTML = '<p class="no-results">No products found. Try a different search.</p>';
  } else {
    dropdownEl.innerHTML = results.map(p => `
      <a href="product.html?id=${p.id}" class="search-result-item">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <div>
          <div class="sr-name">${p.name}</div>
          <div class="sr-price">Rs. ${p.price.toLocaleString()}</div>
        </div>
      </a>
    `).join('');
  }
  dropdownEl.classList.add('active');
}

/** Initialize search bar on any page */
function initSearch() {
  const searchInputs = document.querySelectorAll('.header-search input');
  searchInputs.forEach(input => {
    const dropdown = input.closest('.header-search').querySelector('.search-results-dropdown');
    if (!dropdown) return;

    // Input event - filter products
    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (q.length === 0) {
        dropdown.classList.remove('active');
        return;
      }
      const results = searchProducts(q);
      renderSearchDropdown(results, dropdown);
    });

    // Enter key - go to shop with query
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const q = input.value.trim();
        if (q) window.location.href = `shop.html?search=${encodeURIComponent(q)}`;
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', e => {
      if (!input.closest('.header-search').contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  });
}

/* ─── TOAST NOTIFICATION ────────────────────────────────────── */

/** Show a toast message */
function showToast(message, duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">🛍️</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/* ─── HEADER SCROLL EFFECT ──────────────────────────────────── */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ─── MOBILE MENU TOGGLE ────────────────────────────────────── */
function initMobileMenu() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (!toggle || !mobileNav) return;
  toggle.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    toggle.innerHTML = mobileNav.classList.contains('open') ? '✕' : '☰';
  });
}

/* ─── INTERSECTION OBSERVER (Reveal on Scroll) ──────────────── */
function initRevealAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // observer.unobserve(entry.target); // Optional: uncomment if you want animation only once
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
    observer.observe(el);
  });
}

/* ─── PARALLAX ──────────────────────────────────────────────── */
function initParallax() {
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length === 0) return;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    parallaxEls.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.4;
      el.style.transform = `translateY(${scrollY * speed}px)`;
    });
  }, { passive: true });
}

/* ─── ACTIVE NAV LINK ───────────────────────────────────────── */
function setActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === path || (path === '' && href === 'index.html'))) {
      link.classList.add('active');
    }
  });
}

/* ─── INIT ALL ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadProducts(); // Load products from JSON first
  updateCartBadge();
  initSearch();
  initHeaderScroll();
  initMobileMenu();
  initRevealAnimations();
  initParallax();
  setActiveNav();
});