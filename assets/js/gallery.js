/* ============================================================
   gallery.js — подключается в страницах-карточках с галереей.
   Клик по миниатюре:
     • если блок встроен в главную → просим родителя открыть
       общий лайтбокс (через postMessage) — фото раскрывается
       на весь экран поверх всей страницы;
     • если родитель не ответил (или блок открыт автономно) —
       открываем локальный лайтбокс внутри блока.
   Заодно подставляем SVG-заглушку, если скриншот ещё не добавлен.
   ============================================================ */
(function () {

    /* ---------- Заглушка отсутствующих скриншотов ---------- */
    function setPlaceholder(img) {
        var svg =
            '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">' +
            '<rect width="800" height="500" fill="#0d1527"/>' +
            '<rect x="3" y="3" width="794" height="494" fill="none" stroke="#1e293b" stroke-width="6"/>' +
            '<text x="400" y="240" fill="#00d2ff" font-family="monospace" font-size="26" font-weight="bold" text-anchor="middle">' + (img.alt || 'Пример проекта') + '</text>' +
            '<text x="400" y="280" fill="#64748b" font-family="monospace" font-size="17" text-anchor="middle">Обновление</text>' +
            '</svg>';
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    function initPlaceholders() {
        document.querySelectorAll('.gallery-thumb img').forEach(function (img) {
            img.addEventListener('error', function () { setPlaceholder(img); }, { once: true });
            if (img.complete && img.naturalWidth === 0 && !img.src.startsWith('data:')) setPlaceholder(img);
        });
    }

    /* ---------- Локальный лайтбокс (фолбэк / автономный режим) ---------- */
    var lb = null, lbImg, lbCap, lbCnt, lbPrev, lbNext, lbClose;
    var items = [], index = 0;

    function buildLightbox() {
        lb = document.createElement('div');
        lb.className = 'lightbox';
        lb.setAttribute('aria-hidden', 'true');
        lb.innerHTML =
            '<button class="lightbox-close" title="Закрыть (Esc)">✕</button>' +
            '<button class="lightbox-arrow prev" title="Предыдущее (←)">‹</button>' +
            '<button class="lightbox-arrow next" title="Следующее (→)">›</button>' +
            '<div class="lightbox-content">' +
            '<img class="lightbox-img" alt="">' +
            '<div class="lightbox-caption"></div>' +
            '<div class="lightbox-counter"></div>' +
            '</div>';
        document.body.appendChild(lb);
        lbImg = lb.querySelector('.lightbox-img');
        lbCap = lb.querySelector('.lightbox-caption');
        lbCnt = lb.querySelector('.lightbox-counter');
        lbPrev = lb.querySelector('.prev');
        lbNext = lb.querySelector('.next');
        lbClose = lb.querySelector('.lightbox-close');

        lbClose.addEventListener('click', close);
        lbNext.addEventListener('click', next);
        lbPrev.addEventListener('click', prev);
        lb.addEventListener('click', function (e) {
            if (e.target === lb || e.target.classList.contains('lightbox-content')) close();
        });
        document.addEventListener('keydown', function (e) {
            if (!lb.classList.contains('open')) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
        });
        var tx = 0;
        lb.addEventListener('touchstart', function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
        lb.addEventListener('touchend', function (e) {
            var dx = e.changedTouches[0].clientX - tx;
            if (Math.abs(dx) > 50) (dx < 0 ? next() : prev());
        }, { passive: true });
    }

    function render() {
        var im = items[index].img;
        lbImg.src = im.src;
        lbImg.alt = im.alt;
        lbCap.textContent = items[index].title || im.alt || '';
        lbCnt.textContent = (index + 1) + ' / ' + items.length;
    }
    function openLocal(arr, i) {
        if (!lb) buildLightbox();
        items = arr; index = i;
        var single = items.length < 2;
        lbPrev.style.display = single ? 'none' : '';
        lbNext.style.display = single ? 'none' : '';
        render();
        lb.classList.add('open');
        lb.setAttribute('aria-hidden', 'false');
    }
    function close() {
        if (!lb) return;
        lb.classList.remove('open');
        lb.setAttribute('aria-hidden', 'true');
    }
    function next() { index = (index + 1) % items.length; render(); }
    function prev() { index = (index - 1 + items.length) % items.length; render(); }

    /* ---------- Открытие через родительскую страницу ---------- */
    function openViaParent(arr, i, onFallback) {
        var acked = false;
        function onMsg(e) {
            if (e.data && e.data.type === 'lightbox-ack') {
                acked = true;
                window.removeEventListener('message', onMsg);
            }
        }
        window.addEventListener('message', onMsg);
        try {
            window.parent.postMessage({ type: 'open-lightbox', items: arr.map(function (it) {
                return { src: it.img.src, alt: it.img.alt, title: it.title };
            }), index: i }, '*');
        } catch (e) {
            onFallback(); return;
        }
        setTimeout(function () {
            window.removeEventListener('message', onMsg);
            if (!acked) onFallback();
        }, 150);
    }

    /* ---------- Инициализация галерей ---------- */
    function initGalleries() {
        document.querySelectorAll('.card-gallery').forEach(function (g) {
            var thumbs = Array.prototype.slice.call(g.querySelectorAll('.gallery-thumb'));
            thumbs.forEach(function (thumb, i) {
                thumb.addEventListener('click', function () {
                    var arr = thumbs.map(function (t) {
                        return { img: t.querySelector('img'), title: t.getAttribute('data-title') || '' };
                    });
                    if (window.parent !== window) {
                        openViaParent(arr, i, function () { openLocal(arr, i); });
                    } else {
                        openLocal(arr, i);
                    }
                });
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initPlaceholders();
        initGalleries();
    });
})();
