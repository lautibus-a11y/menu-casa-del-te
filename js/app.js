'use strict';

var Komorebi = Komorebi || {};

(function () {

  var MENU = Komorebi.MENU_DATA;

  /* --- Constants --- */
  var ANIMATION_DELAY_BASE = 0.1;
  var SWITCH_DELAY_MS = 300;
  var HERO_TRANSITION_DELAY_MS = 400;
  var HERO_RETURN_DELAY_MS = 300;
  var TOAST_DURATION_MS = 4000;
  var TOAST_FADE_MS = 500;
  var LUCIde_REFRESH_DELAY_MS = 100;

  /* --- Category Gradient Colors --- */
  var CATEGORY_GRADIENTS = {
    tes:        { g1: '#0a0d0b', g2: '#0d1f14' },
    cafeteria:  { g1: '#0a0d0b', g2: '#1e1410' },
    tortas:     { g1: '#0a0d0b', g2: '#1e1018' },
    desayunos:  { g1: '#0a0d0b', g2: '#1e1810' },
    brunch:     { g1: '#0a0d0b', g2: '#1e1c10' },
    frios:      { g1: '#0a0d0b', g2: '#10181e' },
  };

  /* --- State --- */
  var currentCategory = 'tes';
  var cart = [];

  /* --- DOM Cache --- */
  function $(id) { return document.getElementById(id); }

  var el = {
    hero: $('hero-section'),
    menu: $('menu-container'),
    bgGlow: $('menu-bg-glow'),
    btnEnter: $('btn-enter-menu'),
    btnBack: $('btn-back-to-hero'),
    tabsNav: $('tabs-navigation'),
    grid: $('menu-items-grid'),
    hud: $('bottom-hud'),
    hudBell: $('hud-bell'),

    modal: $('product-modal'),
    modalImg: $('modal-img'),
    modalTitle: $('modal-title'),
    modalPrice: $('modal-price'),
    modalDesc: $('modal-desc'),
    modalClose: $('modal-close-btn'),
    modalOverlay: $('modal-close-overlay'),
    modalOrder: $('modal-order-btn'),

    cartBar: $('cart-bar'),
    cartBadge: $('cart-badge'),
    cartBarCount: $('cart-bar-count'),
    cartBarTotal: $('cart-bar-total'),

    cartModal: $('cart-modal'),
    cartModalBody: $('cart-modal-body'),
    cartModalFooter: $('cart-modal-footer'),
    cartTotalAmount: $('cart-total-amount'),
    cartTableInput: $('table-number-input'),
    cartSendBtn: $('cart-send-btn'),
    cartClearBtn: $('cart-clear-btn'),
    cartModalClose: $('cart-modal-close-btn'),
    cartModalOverlay: $('cart-modal-close-overlay'),
  };

  /* --- Helpers --- */

  function refreshLucide() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  function lockScroll(lock) {
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function imgFallback(img) {
    var fb = img.getAttribute('data-fallback');
    if (fb && img.src !== fb) {
      img.src = fb;
    }
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function parsePrice(str) {
    return parseFloat(str.replace(/[$\.]/g, ''));
  }

  function formatPrice(num) {
    return '$' + num.toLocaleString('es-AR');
  }

  /* --- Gradient --- */

  function updateGradient(categoryKey) {
    var g = CATEGORY_GRADIENTS[categoryKey] || CATEGORY_GRADIENTS.tes;
    var root = document.documentElement;
    root.style.setProperty('--bg-gradient-1', g.g1);
    root.style.setProperty('--bg-gradient-2', g.g2);
    if (el.bgGlow) {
      el.bgGlow.style.background =
        'radial-gradient(circle, ' + g.g2 + ' 0%, transparent 60%)';
    }
  }

  /* --- Cart --- */

  function getCartItem(itemId) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === itemId) return cart[i];
    }
    return null;
  }

  function addToCart(item) {
    var existing = getCartItem(item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        parsedPrice: parsePrice(item.price),
        image: item.image,
        fallbackImage: item.fallbackImage,
        qty: 1,
      });
    }
    renderCartBar();
    renderCardCartButtons();
    showToast('✓ ' + item.name + ' agregado al carrito');
  }

  function removeFromCart(itemId) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === itemId) {
        cart.splice(i, 1);
        break;
      }
    }
    renderCartBar();
    renderCartModal();
    renderCardCartButtons();
  }

  function updateQty(itemId, delta) {
    var item = getCartItem(itemId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    renderCartBar();
    renderCartModal();
    renderCardCartButtons();
  }

  function clearCart() {
    cart = [];
    renderCartBar();
    renderCartModal();
    renderCardCartButtons();
    closeCartModal();
    showToast('Carrito vaciado');
  }

  function getCartCount() {
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
      total += cart[i].qty;
    }
    return total;
  }

  function getCartTotal() {
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
      total += cart[i].parsedPrice * cart[i].qty;
    }
    return total;
  }

  /* --- Cart Bar --- */

  function renderCartBar() {
    var count = getCartCount();
    if (count > 0) {
      el.cartBar.classList.add('cart-visible');
      el.cartBadge.textContent = count;
      el.cartBarCount.textContent = 'Items: ' + count;
      el.cartBarTotal.textContent = formatPrice(getCartTotal());
    } else {
      el.cartBar.classList.remove('cart-visible');
    }
  }

  function renderCardCartButtons() {
    Array.prototype.forEach.call(
      document.querySelectorAll('.btn-add-cart'),
      function (btn) {
        var id = btn.getAttribute('data-item-id');
        var inCart = getCartItem(id);
        btn.classList.toggle('in-cart', !!inCart);
      }
    );
  }

  /* --- Cart Modal --- */

  function openCartModal() {
    renderCartModal();
    el.cartModal.classList.add('cart-modal-active');
    el.cartModal.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    refreshLucide();
  }

  function closeCartModal() {
    el.cartModal.classList.remove('cart-modal-active');
    el.cartModal.setAttribute('aria-hidden', 'true');
    lockScroll(false);
  }

  function renderCartModal() {
    var body = el.cartModalBody;
    var count = getCartCount();

    if (count === 0) {
      body.innerHTML =
        '<div class="cart-empty-state">' +
          '<i data-lucide="shopping-bag"></i>' +
          '<p>Tu carrito está vacío</p>' +
        '</div>';
      el.cartTotalAmount.textContent = '$0';
      refreshLucide();
      return;
    }

    var html = '';
    for (var i = 0; i < cart.length; i++) {
      var c = cart[i];
      var subTotal = c.parsedPrice * c.qty;
      html +=
        '<div class="cart-item">' +
          '<img class="cart-item-thumb" src="' + escapeHtml(c.image) + '" alt="' + escapeHtml(c.name) + '" loading="lazy" data-fallback="' + escapeHtml(c.fallbackImage) + '">' +
          '<div class="cart-item-info">' +
            '<div class="cart-item-name">' + escapeHtml(c.name) + '</div>' +
            '<div class="cart-item-price">' + escapeHtml(c.price) + '</div>' +
          '</div>' +
          '<div class="cart-item-qty">' +
            '<button class="qty-btn qty-btn-remove" data-item-id="' + escapeHtml(c.id) + '" data-delta="-1">−</button>' +
            '<span class="qty-value">' + c.qty + '</span>' +
            '<button class="qty-btn" data-item-id="' + escapeHtml(c.id) + '" data-delta="1">+</button>' +
          '</div>' +
          '<div class="cart-item-subtotal">' + formatPrice(subTotal) + '</div>' +
          '<button class="qty-btn qty-btn-remove" data-item-id="' + escapeHtml(c.id) + '" data-remove="1" title="Eliminar">' +
            '<i data-lucide="x" style="width:14px;height:14px;"></i>' +
          '</button>' +
        '</div>';
    }

    body.innerHTML = html;
    el.cartTotalAmount.textContent = formatPrice(getCartTotal());

    // Cart item image fallbacks
    Array.prototype.forEach.call(body.querySelectorAll('.cart-item-thumb'), function (img) {
      img.addEventListener('error', function () { imgFallback(this); });
      if (img.complete && img.naturalWidth === 0) imgFallback(img);
    });

    // Qty buttons
    Array.prototype.forEach.call(body.querySelectorAll('.qty-btn[data-delta]'), function (btn) {
      btn.addEventListener('click', function () {
        updateQty(
          this.getAttribute('data-item-id'),
          parseInt(this.getAttribute('data-delta'), 10)
        );
      });
    });

    // Remove buttons
    Array.prototype.forEach.call(body.querySelectorAll('.qty-btn[data-remove]'), function (btn) {
      btn.addEventListener('click', function () {
        removeFromCart(this.getAttribute('data-item-id'));
      });
    });

    refreshLucide();
  }

  /* --- Tabs --- */

  function initTabs() {
    var fragment = document.createDocumentFragment();

    Object.keys(MENU).forEach(function (key) {
      var category = MENU[key];
      var isActive = key === currentCategory;

      var btn = document.createElement('button');
      btn.className = 'tab-btn' + (isActive ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', isActive);
      btn.setAttribute('data-category', key);

      btn.innerHTML =
        '<i data-lucide="' + category.icon + '"></i>' +
        '<span>' + category.label + '</span>' +
        '<div class="active-bg"></div>';

      btn.addEventListener('click', function () { switchCategory(key); });
      fragment.appendChild(btn);
    });

    el.tabsNav.innerHTML = '';
    el.tabsNav.appendChild(fragment);
  }

  function switchCategory(key) {
    if (key === currentCategory) return;
    currentCategory = key;

    var btns = document.querySelectorAll('.tab-btn');
    Array.prototype.forEach.call(btns, function (btn) {
      var sel = btn.getAttribute('data-category') === key;
      btn.classList.toggle('active', sel);
      btn.setAttribute('aria-selected', sel);
    });

    updateGradient(key);

    el.grid.classList.add('switching');

    setTimeout(function () {
      renderCategory(key);
      el.grid.classList.remove('switching');
    }, SWITCH_DELAY_MS);
  }

  /* --- Render --- */

  function renderCategory(key) {
    var category = MENU[key];
    if (!category) return;

    var fragment = document.createDocumentFragment();

    category.items.forEach(function (item, index) {
      var card = document.createElement('article');
      card.className = 'glass-card';
      card.style.animationDelay = (index * ANIMATION_DELAY_BASE) + 's';

      var inCart = getCartItem(item.id);

      card.innerHTML =
        '<div class="card-img-container">' +
          '<span class="card-badge">' + escapeHtml(item.badge) + '</span>' +
          '<img class="card-img" src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '" loading="lazy" data-fallback="' + escapeHtml(item.fallbackImage) + '">' +
          '<div class="card-img-overlay"></div>' +
        '</div>' +
        '<div class="card-content">' +
          '<h3 class="card-title">' +
            '<span>' + escapeHtml(item.name) + '</span>' +
            '<span class="card-price">' + escapeHtml(item.price) + '</span>' +
          '</h3>' +
          '<p class="card-desc">' + escapeHtml(item.shortDesc) + '</p>' +
          '<div class="card-footer">' +
            '<span class="card-info-item">' +
              '<i data-lucide="timer"></i>' +
              '<span>' + escapeHtml(item.duration) + '</span>' +
            '</span>' +
            '<div style="display:flex;gap:0.5rem;">' +
              '<button class="btn-add-cart' + (inCart ? ' in-cart' : '') + '" data-item-id="' + escapeHtml(item.id) + '" title="Agregar al carrito">' +
                '<i data-lucide="shopping-cart"></i>' +
              '</button>' +
              '<button class="btn-order-indicator" data-item-id="' + escapeHtml(item.id) + '">Ver Detalle</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      card.querySelector('.card-img').addEventListener('error', function () {
        imgFallback(this);
      });

      card.querySelector('.btn-add-cart').addEventListener('click', function () {
        addToCart(item);
      });

      card.querySelector('.btn-order-indicator').addEventListener('click', function () {
        openProductModal(item);
      });

      fragment.appendChild(card);
    });

    el.grid.innerHTML = '';
    el.grid.appendChild(fragment);

    Array.prototype.forEach.call(el.grid.querySelectorAll('.card-img'), function (img) {
      if (img.complete && img.naturalWidth === 0) imgFallback(img);
    });

    refreshLucide();
  }

  /* --- Product Modal --- */

  function openProductModal(item) {
    el.modalImg.src = item.image;
    el.modalImg.alt = 'Imagen detallada de ' + item.name;
    el.modalTitle.textContent = item.name;
    el.modalPrice.textContent = item.price;
    el.modalDesc.textContent = item.longDesc;

    el.modal.classList.add('modal-active');
    el.modal.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    refreshLucide();
  }

  function closeProductModal() {
    el.modal.classList.remove('modal-active');
    el.modal.setAttribute('aria-hidden', 'true');
    lockScroll(false);
  }

  /* --- Toast --- */

  function showToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = '<span class="toast-icon">✦</span> ' + escapeHtml(msg);
    document.body.appendChild(toast);

    window.requestAnimationFrame(function () {
      toast.classList.add('toast-visible');
    });

    setTimeout(function () {
      toast.classList.remove('toast-visible');
      toast.classList.add('toast-hidden');
      setTimeout(function () { toast.remove(); }, TOAST_FADE_MS);
    }, TOAST_DURATION_MS);
  }

  /* --- Navigation --- */

  function enterMenu() {
    el.hero.classList.add('hero-hidden');
    el.bgGlow.classList.remove('glow-hidden');

    setTimeout(function () {
      el.menu.classList.add('menu-visible');
      el.hud.classList.add('hud-visible');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, HERO_TRANSITION_DELAY_MS);
  }

  function backToHero() {
    el.menu.classList.remove('menu-visible');
    el.hud.classList.remove('hud-visible');
    el.cartBar.classList.remove('cart-visible');
    el.bgGlow.classList.add('glow-hidden');

    setTimeout(function () {
      el.hero.classList.remove('hero-hidden');
    }, HERO_RETURN_DELAY_MS);
  }

  /* --- Pilares (Stacked Cards Scroll + Parallax + Blur) --- */

  function initPilares() {
    var section = document.getElementById('pilares');
    var stack = document.getElementById('pilares-stack');
    if (!section || !stack) return;

    var cards = stack.querySelectorAll('.pilar-card');
    var ticking = false;
    var scrollProgress = 0;

    function clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    }

    function lerp(a, b, t) {
      return a + (b - a) * t;
    }

    function calcCardTransform(card, t) {
      var totalCards = cards.length;
      var index = parseInt(card.getAttribute('data-index'), 10);
      var stepSize = 1 / totalCards;
      var cardStart = index * stepSize;
      var cardEnd = (index + 1) * stepSize;

      var localT = (scrollProgress - cardStart) / stepSize;
      localT = clamp(localT, 0, 1);

      var translateY, scale, opacity, blurAmount, imgOffset, zIdx;

      if (localT < 0.3) {
        var p = localT / 0.3;
        p = p * p * (3 - 2 * p);
        translateY = lerp(80, 0, p);
        scale = lerp(0.88, 1, p);
        opacity = lerp(0, 1, p);
        blurAmount = lerp(12, 0, p);
        imgOffset = lerp(20, 0, p);
        zIdx = totalCards - index;
      } else if (localT < 0.7) {
        translateY = 0;
        scale = 1;
        opacity = 1;
        blurAmount = 0;
        imgOffset = 0;
        zIdx = totalCards - index + 10;
      } else {
        var p = (localT - 0.7) / 0.3;
        p = p * p * (3 - 2 * p);
        translateY = lerp(0, -80, p);
        scale = lerp(1, 0.92, p);
        opacity = lerp(1, 0, p);
        blurAmount = lerp(0, 10, p);
        imgOffset = lerp(0, -15, p);
        zIdx = totalCards - index;
      }

      return {
        y: translateY,
        scale: scale,
        opacity: opacity,
        blur: blurAmount,
        imgOffset: imgOffset,
        zIndex: zIdx,
      };
    }

    function updatePilares() {
      var rect = section.getBoundingClientRect();
      var sectionHeight = section.offsetHeight;
      var viewportHeight = window.innerHeight;

      var availableScroll = sectionHeight - viewportHeight;
      if (availableScroll <= 0) {
        scrollProgress = 1;
      } else {
        scrollProgress = clamp(-rect.top / availableScroll, 0, 1);
      }

      Array.prototype.forEach.call(cards, function (card) {
        var t = calcCardTransform(card, scrollProgress);
        card.style.zIndex = t.zIndex;
        card.style.transform =
          'translateY(' + t.y.toFixed(2) + 'px) scale(' + t.scale.toFixed(4) + ')';
        card.style.opacity = t.opacity.toFixed(4);
        card.style.filter = 'blur(' + t.blur.toFixed(2) + 'px)';

        var img = card.querySelector('.pilar-card-img-wrap img');
        if (img) {
          img.style.transform = 'translateY(' + t.imgOffset.toFixed(2) + 'px) scale(1.12)';
        }
      });
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          updatePilares();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Initial update
    setTimeout(updatePilares, 100);
  }

  /* --- Events --- */

  function setupEvents() {
    el.btnEnter.addEventListener('click', enterMenu);
    el.btnBack.addEventListener('click', backToHero);
    el.modalClose.addEventListener('click', closeProductModal);
    el.modalOverlay.addEventListener('click', closeProductModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (el.cartModal.classList.contains('cart-modal-active')) {
          closeCartModal();
        } else {
          closeProductModal();
        }
      }
    });

    el.modalOrder.addEventListener('click', function () {
      showToast('¡Excelente! Su camarero acudirá pronto para registrar su orden.');
      closeProductModal();
    });

    el.hudBell.addEventListener('click', function () {
      showToast('Enviando aviso de servicio al personal de mesa...');
    });

    // Cart bar click → open cart modal
    el.cartBar.addEventListener('click', openCartModal);

    // Cart modal close
    el.cartModalClose.addEventListener('click', closeCartModal);
    el.cartModalOverlay.addEventListener('click', closeCartModal);

    // Cart send
    el.cartSendBtn.addEventListener('click', function () {
      var count = getCartCount();
      if (count === 0) {
        showToast('El carrito está vacío. Agregá productos primero.');
        return;
      }
      var mesa = el.cartTableInput.value || '1';
      var total = formatPrice(getCartTotal());
      showToast('✅ Pedido enviado — Mesa ' + mesa + ' | Total ' + total + '. Camarero en camino.');
      clearCart();
    });

    // Cart clear
    el.cartClearBtn.addEventListener('click', function () {
      if (getCartCount() === 0) return;
      clearCart();
    });
  }

  /* --- Init --- */

  document.addEventListener('DOMContentLoaded', function () {
    updateGradient(currentCategory);
    initTabs();
    renderCategory(currentCategory);
    setupEvents();
    renderCartBar();
    initPilares();
    refreshLucide();
    setTimeout(refreshLucide, LUCIde_REFRESH_DELAY_MS);
  });

})();

console.log('🍵 Komorebi — Menú Digital Inmersivo');
