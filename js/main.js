/* =========================================
   PLASTHETIC.S — Main JS
   ========================================= */

// --- Lenis Smooth Scroll ---
let lenis;
function initLenis() {
  if (lenis) lenis.destroy();
  lenis = new Lenis({
    autoRaf: true,
    lerp: 0.08,
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.5,
    orientation: 'vertical',
  });
}
document.addEventListener('DOMContentLoaded', initLenis);

// --- Loader ---
window.addEventListener('load', () => {
  const loader = document.querySelector('.loader');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), 1200);
  }
});

// --- Clocks (topbar + footer) ---
function updateClocks() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const time = `${h}:${m}`;
  document.querySelectorAll('.topbar-time, .footer-time').forEach(el => {
    el.textContent = time;
  });
}
document.addEventListener('DOMContentLoaded', () => {
  updateClocks();
  setInterval(updateClocks, 10000);
});


// --- Nav link data-text for layout shift prevention ---
function initNavDataText() {
  document.querySelectorAll('.topbar-nav a').forEach(a => {
    a.setAttribute('data-text', a.textContent);
  });
}
initNavDataText();
document.addEventListener('DOMContentLoaded', initNavDataText);

// --- Scroll Reveal ---
document.addEventListener('DOMContentLoaded', () => {
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(el => observer.observe(el));
});

// --- Smooth Page Transitions (SPA-like, persistent topbar) ---
function swapPageContent(html, pushState, url, restoreScrollY) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Update title
  document.title = doc.title;

  // Inject page-specific styles from <head>
  // Remove ALL inline <style> elements from current page (including original page style without id)
  document.querySelectorAll('head style').forEach(s => s.remove());
  const newStyle = doc.querySelector('head style');
  if (newStyle) {
    newStyle.id = 'page-style';
    document.head.appendChild(newStyle);
  }

  // Get new page content
  const newMain = doc.querySelector('#page-content');
  const currentMain = document.querySelector('#page-content');

  if (newMain && currentMain) {
    // Fade out old content
    currentMain.style.opacity = '0';
    currentMain.style.transition = 'opacity 0.3s ease';

    setTimeout(() => {
      // Sync topbar from new page (topbar is outside #page-content)
      const newTopbar = doc.querySelector('.topbar');
      const currentTopbar = document.querySelector('.topbar');
      if (newTopbar && currentTopbar) {
        currentTopbar.innerHTML = newTopbar.innerHTML;
        // Copy id if present
        if (newTopbar.id) currentTopbar.id = newTopbar.id;
        else currentTopbar.removeAttribute('id');
      }

      currentMain.innerHTML = newMain.innerHTML;
      const targetScroll = (restoreScrollY != null) ? restoreScrollY : 0;
      window.scrollTo(0, targetScroll);

      // Fade in new content
      requestAnimationFrame(() => {
        currentMain.style.opacity = '1';
      });

      // Update active nav link
      const currentPath = url.split('/').pop() || 'index.html';
      document.querySelectorAll('.topbar-nav a').forEach(a => {
        const aPath = a.getAttribute('href').replace(/^\.\.\//, '').split('/').pop();
        a.classList.toggle('active', aPath === currentPath);
      });

      // Handle index page special topbar behavior
      const topbar = document.querySelector('.topbar');
      const videoHero = document.querySelector('#videoHero');
      if (videoHero && topbar) {
        topbar.style.opacity = '0';
        topbar.style.transition = 'opacity 0.4s ease';
        topbar.classList.remove('visible');

        // Remove old scroll listener by replacing topbar behavior
        function checkHeroScroll() {
          const heroBottom = videoHero.offsetTop + videoHero.offsetHeight;
          topbar.classList.toggle('visible', window.scrollY > heroBottom - 60);
        }
        window._heroScrollFn = checkHeroScroll;
        window.addEventListener('scroll', checkHeroScroll, { passive: true });
        checkHeroScroll();
      } else if (topbar) {
        // Non-index pages: topbar always visible
        topbar.style.opacity = '1';
        topbar.style.transition = '';
        topbar.classList.remove('visible');
        if (window._heroScrollFn) {
          window.removeEventListener('scroll', window._heroScrollFn);
          window._heroScrollFn = null;
        }
      }

      // Run inline scripts from new page content
      currentMain.querySelectorAll('script').forEach(s => {
        const newScript = document.createElement('script');
        newScript.textContent = s.textContent;
        s.replaceWith(newScript);
      });

      // Re-init components
      reinitPage();

      // Ensure page transition wipe is cleared
      const trans = document.querySelector('.page-transition');
      if (trans) trans.classList.remove('active');
    }, 300);
  } else {
    // Fallback: full page load
    window.location.href = url;
    return;
  }

  if (pushState) {
    // Save current scroll position in current state before pushing new one
    const currentState = history.state || {};
    currentState.scrollY = window.scrollY;
    history.replaceState(currentState, '', window.location.href);

    history.pushState({ url: url, scrollY: 0 }, '', url);
  }
}

function initPageTransitions() {
  // Save initial state
  history.replaceState({ url: window.location.href }, '', window.location.href);

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http') || href.startsWith('javascript:')) return;

    e.preventDefault();

    const url = new URL(href, window.location.href).href;

    fetch(url)
      .then(r => r.text())
      .then(html => swapPageContent(html, true, url))
      .catch(() => { window.location.href = url; });
  });
}

function reinitPage() {
  // Re-init scroll reveals
  document.querySelectorAll('#page-content .reveal').forEach(el => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    observer.observe(el);
  });

  // Re-init clocks & nav
  updateClocks();
  initNavDataText();

  // Re-init gallery
  initGallery();

  // Re-init carousel
  initCarousel();

  // Re-init parallax
  initParallax();

  // Re-init Lenis
  initLenis();

  // Re-init product back button
  initProductBack();

  // Re-init filters
  initFilters();

  // Re-init stagger
  const items = document.querySelectorAll('.object-card, .home-product');
  items.forEach((item, i) => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(30px)';
    item.style.transition = `opacity 0.7s ${i * 0.12}s var(--transition), transform 0.7s ${i * 0.12}s var(--transition)`;
  });
  const staggerObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        staggerObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05 });
  items.forEach(el => staggerObs.observe(el));

}

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
  const url = (e.state && e.state.url) || window.location.href;
  const savedScroll = (e.state && e.state.scrollY) || 0;
  fetch(url)
    .then(r => r.text())
    .then(html => swapPageContent(html, false, url, savedScroll))
    .catch(() => window.location.reload());
});

document.addEventListener('DOMContentLoaded', initPageTransitions);

// --- Mobile Nav Toggle ---
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.nav-toggle');
    if (!toggle) return;
    const navLinks = document.querySelector('.topbar-nav');
    if (!navLinks) return;

    // Toggle all burger icons
    document.querySelectorAll('.nav-toggle').forEach(t => t.classList.toggle('open'));
    navLinks.classList.toggle('open');

    // Ensure topbar is visible when menu is open (for video hero page)
    const topbar = document.getElementById('mainTopbar');
    if (topbar) {
      if (navLinks.classList.contains('open')) {
        topbar.classList.add('visible');
        topbar.style.opacity = '1';
      } else {
        // Restore original behavior based on scroll position
        const videoHero = document.getElementById('videoHero');
        if (videoHero) {
          const heroBottom = videoHero.offsetTop + videoHero.offsetHeight;
          if (window.scrollY <= heroBottom - 60) {
            topbar.classList.remove('visible');
            topbar.style.opacity = '0';
          }
        }
      }
    }
  });
});

// --- Product Gallery ---
function initGallery() {
  const images = document.querySelectorAll('.product-gallery-img');
  const counter = document.querySelector('.gallery-counter');
  const prevBtn = document.querySelector('.gallery-prev');
  const nextBtn = document.querySelector('.gallery-next');

  if (!images.length) return;

  let current = 0;
  const total = images.length;

  function show(index) {
    images.forEach(img => img.classList.remove('active'));
    images[index].classList.add('active');
    if (counter) counter.textContent = `${index + 1} / ${total}`;
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { current = (current - 1 + total) % total; show(current); });
  if (nextBtn) nextBtn.addEventListener('click', () => { current = (current + 1) % total; show(current); });

  setInterval(() => { current = (current + 1) % total; show(current); }, 5000);
  show(0);
}
document.addEventListener('DOMContentLoaded', initGallery);

// --- Carousel Drag ---
function initCarousel() {
  const track = document.querySelector('.carousel-track');
  if (!track) return;

  let isDown = false, startX, scrollLeft;

  track.addEventListener('mousedown', (e) => { isDown = true; startX = e.pageX - track.offsetLeft; scrollLeft = track.scrollLeft; });
  track.addEventListener('mouseleave', () => isDown = false);
  track.addEventListener('mouseup', () => isDown = false);
  track.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    track.scrollLeft = scrollLeft - (x - startX) * 2;
  });

  track.addEventListener('touchstart', (e) => { startX = e.touches[0].pageX - track.offsetLeft; scrollLeft = track.scrollLeft; });
  track.addEventListener('touchmove', (e) => {
    const x = e.touches[0].pageX - track.offsetLeft;
    track.scrollLeft = scrollLeft - (x - startX) * 2;
  });
}
document.addEventListener('DOMContentLoaded', initCarousel);

// --- Product Back Button ---
function initProductBack() {
  document.querySelectorAll('.product-back').forEach(function(btn) {
    if (btn.dataset.backInit) return;
    btn.dataset.backInit = '1';
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      // Always navigate to objects page
      const isInProducts = window.location.pathname.includes('/products/');
      window.location.href = isInProducts ? '../objects.html' : 'objects.html';
    });
  });
}
document.addEventListener('DOMContentLoaded', initProductBack);

// --- Parallax Scroll ---
function initParallax() {
  const elements = document.querySelectorAll('[data-parallax]');
  if (!elements.length) return;

  // Don't run on mobile (performance)
  if (window.innerWidth < 768) return;

  function update() {
    const scrollY = window.scrollY;
    elements.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.1;
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const viewCenter = window.innerHeight / 2;
      const offset = (centerY - viewCenter) * speed;
      el.style.transform = `translateY(${offset}px)`;
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}
document.addEventListener('DOMContentLoaded', initParallax);

// --- Object Filters ---
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.querySelectorAll('.object-card').forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
}
document.addEventListener('DOMContentLoaded', initFilters);

// --- Pen Cursor & Drawing Trail ---
(function() {
  // Don't run on touch-only devices
  if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) return;

  // Create cursor element
  const cursor = document.createElement('div');
  cursor.className = 'pen-cursor';
  cursor.innerHTML = '<img src="' + (document.querySelector('link[rel="stylesheet"][href^="../"]') ? '../' : '') + 'Library/Mouse_Icon/MouseIcon.png" alt="">';
  document.body.appendChild(cursor);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'pen-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Trail points: each has {x, y, time}
  const points = [];
  const FADE_START = 5000;   // start fading after 5s
  const FADE_DURATION = 3000; // fully gone after 3s more
  let mouseX = -100, mouseY = -100;
  let lastDrawX = null, lastDrawY = null;
  let isPenDown = false; // only draw when mouse is pressed

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
    cursor.style.opacity = '1';

    // Detect clickable elements — switch to dark cursor
    const target = e.target.closest('a, button, .filter-btn, .object-card, .home-product, .carousel-item');
    if (target) {
      cursor.classList.add('clickable');
    } else {
      cursor.classList.remove('clickable');
    }

    // Only record trail when pen is down (mouse pressed)
    if (isPenDown) {
      const pageX = e.pageX;
      const pageY = e.pageY;
      const now = Date.now();
      if (lastDrawX === null || Math.hypot(pageX - lastDrawX, pageY - lastDrawY) > 2) {
        points.push({ x: pageX, y: pageY, time: now });
        lastDrawX = pageX;
        lastDrawY = pageY;
      }
    }
  });

  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
    isPenDown = false;
    lastDrawX = null;
    lastDrawY = null;
  });

  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
  });

  // Pen down — start drawing
  document.addEventListener('mousedown', (e) => {
    // Don't draw on clickable elements
    if (e.target.closest('a, button, .filter-btn, .nav-toggle, .gallery-nav button, .product-back')) return;
    e.preventDefault(); // prevent text selection while drawing
    isPenDown = true;
    lastDrawX = null;
    lastDrawY = null;
    points.push(null); // break from previous stroke
  });

  // Pen up — stop drawing
  document.addEventListener('mouseup', () => {
    isPenDown = false;
    lastDrawX = null;
    lastDrawY = null;
  });

  // Prevent drag selection while drawing
  document.addEventListener('dragstart', (e) => {
    if (isPenDown) e.preventDefault();
  });

  function draw() {
    const now = Date.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Remove fully faded points
    while (points.length > 0 && points[0] !== null) {
      const age = now - points[0].time;
      if (age > FADE_START + FADE_DURATION) {
        points.shift();
      } else break;
    }
    // Remove leading nulls
    while (points.length > 0 && points[0] === null) points.shift();

    // Draw trail segments (convert page coords to viewport by subtracting scroll)
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    for (let i = 1; i < points.length; i++) {
      if (points[i] === null || points[i - 1] === null) continue;

      const age = now - points[i].time;
      let alpha;
      if (age < FADE_START) {
        alpha = 0.4;
      } else {
        alpha = 0.4 * (1 - (age - FADE_START) / FADE_DURATION);
      }
      if (alpha <= 0) continue;

      // Skip points that are off-screen
      const x1 = points[i - 1].x - scrollX;
      const y1 = points[i - 1].y - scrollY;
      const x2 = points[i].x - scrollX;
      const y2 = points[i].y - scrollY;
      if (y1 < -50 && y2 < -50) continue;
      if (y1 > canvas.height + 50 && y2 > canvas.height + 50) continue;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(26, 26, 26, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

// --- Stagger Grid Items ---
document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.object-card, .home-product');
  items.forEach((item, i) => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(30px)';
    item.style.transition = `opacity 0.7s ${i * 0.12}s var(--transition), transform 0.7s ${i * 0.12}s var(--transition)`;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05 });

  items.forEach(el => observer.observe(el));
});
