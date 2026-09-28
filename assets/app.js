/* Só para Homens — V2. Sem dependências. */
(function () {
  'use strict';
  var d = document, CFG = window.SPH || {}, page = CFG.page;

  /* ---------------- armazenamento seguro ---------------- */
  function get(k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } }
  function set(k, v, s) { try { var st = s ? sessionStorage : localStorage; v == null ? st.removeItem(k) : st.setItem(k, v); } catch (e) {} }

  /* ---------------- medição (GA4 / GTM / Meta Pixel) ----------------
     Todos os eventos vão para window.dataLayer. Se gtag ou fbq existirem, também são enviados.
     Eventos principais:
       view_models_click  → "Escolher meu traje" / links para o catálogo
       model_view         → abriu a página de um traje (model = slug)
       model_select       → "Quero este traje" (abre o WhatsApp com nome + link do modelo)
       whatsapp_click     → qualquer outro botão de WhatsApp (placement indica onde)
     Outros: model_card_click, occasion_select, filter_select, view_toggle, gallery_swipe,
             gallery_zoom, phone_click, instagram_click */
  window.dataLayer = window.dataLayer || [];
  var utm = {};
  try {
    var q = new URLSearchParams(location.search), saved = JSON.parse(get('sph_utm', true) || '{}');
    q.forEach(function (v, k) { if (/^(utm_|gclid$|fbclid$)/.test(k)) saved[k] = v; });
    set('sph_utm', JSON.stringify(saved), true); utm = saved;
  } catch (e) {}
  var device = matchMedia('(max-width: 899px)').matches ? 'mobile' : 'desktop';
  function track(event, p) {
    var data = Object.assign({ event: event, page_type: page, device: device }, utm, p || {});
    window.dataLayer.push(data);
    if (typeof window.gtag === 'function') window.gtag('event', event, data);
    if (typeof window.fbq === 'function') {
      var nome = CFG.model ? CFG.model.nome : '';
      if (event === 'whatsapp_click' || event === 'model_select') {
        window.fbq('track', 'Contact', {
          content_name: nome || data.placement, content_ids: data.model ? [data.model] : [], content_type: 'product',
          placement: data.placement, photo: data.photo || '', occasion: data.occasion || '', device: data.device
        });
      } else if (event === 'model_view') {
        window.fbq('track', 'ViewContent', { content_name: nome, content_ids: [data.model], content_type: 'product' });
      }
    }
  }
  d.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]'); if (!el) return;
    track(el.dataset.track, {
      placement: el.dataset.placement || '',
      photo: el.dataset.wa === 'modelo' ? fotoAtual : '',
      model: el.dataset.model || (CFG.model && CFG.model.slug) || '',
      occasion: el.dataset.occasion || occasion() || ''
    });
  });

  /* ---------------- ocasião (contexto opcional) ---------------- */
  var OCC = {
    noivo: ['Noivo', 'o meu casamento (sou o noivo)'],
    padrinho: ['Padrinho', 'um casamento em que serei padrinho'],
    convidado: ['Convidado', 'um casamento em que serei convidado'],
    formatura: ['Formatura', 'uma formatura'],
    festas: ['Festas e eventos', 'uma festa ou evento social'],
    corporativo: ['Corporativo', 'um evento corporativo']
  };
  function occasion() { var o = get('sph_ocasiao'); return OCC[o] ? o : ''; }
  function setOccasion(o) { set('sph_ocasiao', OCC[o] ? o : null); refreshWA(); d.dispatchEvent(new Event('sph:occasion')); }
  // ocasião vinda da URL (home → catálogo)
  try { var qo = new URLSearchParams(location.search).get('ocasiao'); if (qo && OCC[qo]) set('sph_ocasiao', qo); } catch (e) {}

  /* ---------------- links de WhatsApp ---------------- */
  function wa(msg) { return 'https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(msg); }
  function msgGeral() {
    var o = occasion();
    return o ? 'Olá! Vim pelo site da Só para Homens. Preciso de um traje para ' + OCC[o][1] + ' e gostaria de tirar uma dúvida.'
             : 'Olá! Vim pelo site da Só para Homens e gostaria de tirar uma dúvida.';
  }
  var fotoAtual = 1, totalFotos = 1;   // atualizados pela galeria da página do modelo
  function msgModelo() {
    var o = occasion(), m = CFG.model || {};
    var foto = totalFotos > 1 ? ' (foto ' + fotoAtual + ' de ' + totalFotos + ')' : '';
    var link = m.url + (totalFotos > 1 ? '#foto-' + fotoAtual : '');
    return 'Olá! Gostei deste traje da Só para Homens:\n' + m.nome + foto + '\n' + link + '\n' +
      (o ? 'É para ' + OCC[o][1] + '.\n' : '') + 'Gostaria de saber mais.';
  }
  function refreshWA() {
    d.querySelectorAll('[data-wa="geral"]').forEach(function (a) { a.href = wa(msgGeral()); });
    d.querySelectorAll('[data-wa="modelo"]').forEach(function (a) { a.href = wa(msgModelo()); });
  }
  refreshWA();

  /* botões de ocasião (catálogo e página do modelo) */
  function paintOccButtons() {
    var o = occasion();
    d.querySelectorAll('[data-set-occasion]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.setOccasion === o ? 'true' : 'false'); });
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-set-occasion]'); if (!b) return;
    var o = b.dataset.setOccasion, next = occasion() === o ? '' : o;
    setOccasion(next); paintOccButtons();
    if (next) track('occasion_select', { occasion: next, placement: page });
  });
  paintOccButtons();

  /* ---------------- barra fixa (mobile) / botão flutuante (desktop) ---------------- */
  var bar = d.querySelector('[data-bar]'), fab = d.querySelector('.fab');
  if (bar) {
    d.body.classList.add('has-bar');
    var barLink = bar.querySelector('a');
    var hide = { hero: page === 'home', main: page === 'model', final: false };
    function paintBar() {
      var on = !hide.hero && !hide.main && !hide.final;
      bar.classList.toggle('on', on); bar.setAttribute('aria-hidden', on ? 'false' : 'true'); barLink.tabIndex = on ? 0 : -1;
      if (fab) fab.classList.toggle('off', hide.hero || hide.final);
    }
    if ('IntersectionObserver' in window) {
      var watch = function (el, key, margin) {
        if (!el) { hide[key] = false; return; }
        new IntersectionObserver(function (es) { hide[key] = es[0].isIntersecting; paintBar(); }, { rootMargin: margin || '0px' }).observe(el);
      };
      watch(d.querySelector('[data-hero-ctas]'), 'hero');
      watch(d.querySelector('[data-main-cta]'), 'main');
      watch(d.querySelector('[data-final]'), 'final');
    } else { hide = { hero: false, main: false, final: false }; }
    paintBar();
  }

  /* ---------------- catálogo: filtros por cor + ocasião ---------------- */
  if (page === 'catalog') {
    var cards = [].slice.call(d.querySelectorAll('[data-grid] .card')), chips = [].slice.call(d.querySelectorAll('[data-filter]'));
    var count = d.querySelector('[data-count]'), filters = d.querySelector('[data-filters]');
    var valid = chips.map(function (c) { return c.dataset.filter; });
    function apply(f, push) {
      if (valid.indexOf(f) < 0) f = 'all';
      var n = 0;
      cards.forEach(function (c) { var ok = f === 'all' || c.dataset.group === f; c.hidden = !ok; if (ok) n++; });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.filter === f ? 'true' : 'false'); });
      // mantém o filtro ativo visível na barra horizontal (celular)
      var on = chips.filter(function (c) { return c.dataset.filter === f; })[0], box = on && on.parentNode;
      if (box && box.scrollWidth > box.clientWidth) box.scrollTo({ left: Math.max(0, on.offsetLeft - box.offsetLeft - (box.clientWidth - on.offsetWidth) / 2), behavior: push ? 'smooth' : 'auto' });
      count.textContent = n + (n === 1 ? ' modelo' : ' modelos');
      if (push) {
        try { var u = new URL(location.href); f === 'all' ? u.searchParams.delete('cor') : u.searchParams.set('cor', f); u.searchParams.delete('ocasiao'); history.replaceState(null, '', u); } catch (e) {}
      }
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        apply(c.dataset.filter, true); track('filter_select', { filter: c.dataset.filter });
        var top = filters.getBoundingClientRect().top;
        if (top <= 1) window.scrollTo({ top: window.scrollY + d.querySelector('[data-grid]').getBoundingClientRect().top - filters.offsetHeight - 40 });
      });
    });
    var start = 'all'; try { start = new URLSearchParams(location.search).get('cor') || 'all'; } catch (e) {}
    apply(start, false);
    // borda da barra de filtros quando "gruda" no topo
    if ('IntersectionObserver' in window) {
      var sentinel = d.createElement('div'); filters.parentNode.insertBefore(sentinel, filters);
      new IntersectionObserver(function (es) { filters.classList.toggle('stuck', !es[0].isIntersecting); }).observe(sentinel);
    }
    // tamanho das fotos: 2 colunas (padrão) ou 1 coluna com fotos grandes (lembrado no aparelho)
    var grid = d.querySelector('[data-grid]'), views = [].slice.call(d.querySelectorAll('[data-view]'));
    function setView(v, user) {
      grid.classList.toggle('one', v === '1');
      views.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.view === v ? 'true' : 'false'); });
      var sz = v === '1' ? '(min-width: 1100px) 270px, (min-width: 760px) 31vw, 94vw' : '(min-width: 1100px) 270px, (min-width: 760px) 31vw, 47vw';
      grid.querySelectorAll('img, source').forEach(function (el) { el.sizes = sz; });
      if (user) { set('sph_view', v); track('view_toggle', { view: v === '1' ? 'grande' : 'grade' }); }
    }
    views.forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view, true); }); });
    if (get('sph_view') === '1') setView('1');

    // contexto de ocasião
    var ctx = d.querySelector('[data-occ-ctx]');
    function paintCtx() {
      var o = occasion();
      ctx.hidden = !o;
      if (o) ctx.querySelector('[data-occ-label]').textContent = OCC[o][0];
    }
    d.querySelector('[data-occ-clear]').addEventListener('click', function () { setOccasion(''); });
    d.addEventListener('sph:occasion', paintCtx);
    paintCtx();
  }

  /* ---------------- página do modelo: galeria ---------------- */
  if (page === 'model') {
    track('model_view', { model: CFG.model.slug });
    var gal = d.querySelector('[data-gallery]'), track_ = gal.querySelector('[data-track-el]');
    var slides = [].slice.call(track_.children), n = slides.length, cur = 0, swiped = false;
    totalFotos = n; refreshWA();
    var curEl = gal.querySelector('[data-cur]'), dots = [].slice.call(gal.querySelectorAll('.gal-dots i'));
    var thumbs = [].slice.call(gal.querySelectorAll('[data-go]')), prev = gal.querySelector('[data-prev]'), next = gal.querySelector('[data-next]');
    function paint(i) {
      if (i === cur) return; cur = i;
      curEl.textContent = i + 1;
      dots.forEach(function (x, k) { x.classList.toggle('on', k === i); });
      thumbs.forEach(function (t, k) { t.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      if (prev) { prev.disabled = i === 0; next.disabled = i === n - 1; }
      fotoAtual = i + 1; refreshWA();   // os botões de WhatsApp passam a citar a foto que está na tela
      if (!swiped) { swiped = true; track('gallery_swipe', { model: CFG.model.slug }); }
    }
    function go(i, smooth) { i = Math.max(0, Math.min(n - 1, i)); track_.scrollTo({ left: i * track_.clientWidth, behavior: smooth === false ? 'auto' : 'smooth' }); }
    var raf;
    track_.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () { paint(Math.round(track_.scrollLeft / track_.clientWidth)); });
    }, { passive: true });
    thumbs.forEach(function (t) { t.addEventListener('click', function () { go(+t.dataset.go); }); });
    if (prev) { prev.disabled = true; prev.addEventListener('click', function () { go(cur - 1); }); next.addEventListener('click', function () { go(cur + 1); }); }
    track_.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
    });
    // link direto para uma foto: /modelos/<slug>/#foto-3
    var hm = /^#foto-(\d+)$/.exec(location.hash);
    if (hm && +hm[1] >= 2 && +hm[1] <= n) {
      var alvo = +hm[1] - 1, im = slides[alvo].querySelector('img'); if (im) im.loading = 'eager';
      var abrir = function () { track_.scrollLeft = slides[alvo].offsetLeft; paint(alvo); };
      abrir(); setTimeout(abrir, 60); window.addEventListener('load', abrir, { once: true });
    }
    // pré-carrega a próxima foto quando o usuário começa a interagir
    if (slides[1]) { var warm = function () { var im = slides[1].querySelector('img'); if (im) im.loading = 'eager'; }; track_.addEventListener('pointerdown', warm, { once: true }); setTimeout(warm, 2500); }

    // lightbox (tela cheia)
    var lb = d.querySelector('[data-lightbox]'), lbt = lb && lb.querySelector('[data-lb-track]');
    if (lb && typeof lb.showModal === 'function') {
      gal.addEventListener('click', function (e) {
        var z = e.target.closest('[data-zoom]'); if (!z) return;
        lbt.querySelectorAll('[data-srcset]').forEach(function (so) { so.srcset = so.dataset.srcset; so.removeAttribute('data-srcset'); });
        lbt.querySelectorAll('img[data-src]').forEach(function (im) { im.src = im.dataset.src; im.removeAttribute('data-src'); });
        lb.showModal();
        lbt.scrollLeft = (+z.dataset.zoom) * lbt.clientWidth;
        track('gallery_zoom', { model: CFG.model.slug });
      });
      lb.querySelector('[data-lb-close]').addEventListener('click', function () { lb.close(); });
      lb.addEventListener('click', function (e) { if (e.target.tagName === 'LI' || e.target === lbt) lb.close(); });
      lb.addEventListener('close', function () { go(Math.round(lbt.scrollLeft / lbt.clientWidth), false); });
    }

    // "Todos os modelos": volta para o catálogo com o filtro anterior, se veio de lá
    var back = d.querySelector('[data-back]');
    try { if (d.referrer && new URL(d.referrer).pathname.replace(/index\.html$/, '').endsWith('/modelos/') && new URL(d.referrer).origin === location.origin) back.href = d.referrer; } catch (e) {}
  }

  var y = d.querySelector('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
