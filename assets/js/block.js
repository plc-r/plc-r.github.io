/* ============================================================
   block.js — подключается в КАЖДОЙ странице-блоке (pages/*)
   1) Сообщает родительскому окну свою НАТУРАЛЬНУЮ высоту контента.
      Родитель (index.html) сам выравнивает карточки в ряду и
      растягивает iframe — поэтому здесь высота меряется без
      учёта «растяжки» (класс .measuring отключает min-height).
   2) Если блок открыт автономно (не внутри index.html) —
      рисует фон и чип «← На главную».
   ============================================================ */
(function () {
    var EMBEDDED = (window.parent !== window);
    var BLOCK_ID = document.body.getAttribute('data-block') || 'unknown';

    if (!EMBEDDED) {
        document.documentElement.classList.add('standalone');
        var a = document.createElement('a');
        a.className = 'back-home';
        a.href = '../../index.html';
        a.innerHTML = '<span aria-hidden="true">←</span> На главную';
        document.addEventListener('DOMContentLoaded', function () {
            document.body.appendChild(a);
        });
    }

    function measure() {
        document.documentElement.classList.add('measuring');
        // Только body.scrollHeight: documentElement.scrollHeight не бывает
        // меньше высоты вьюпорта iframe и вернул бы "растянутую" высоту.
        var h = document.body.scrollHeight;
        document.documentElement.classList.remove('measuring');
        return Math.ceil(h);
    }

    var rafId = null;
    function report() {
        if (!EMBEDDED) return;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(function () {
            try {
                window.parent.postMessage({
                    type: 'block-height',
                    id: BLOCK_ID,
                    h: measure()
                }, '*');
            } catch (e) { /* родитель может быть недоступен */ }
        });
    }

    var t = null;
    function reportDebounced() {
        clearTimeout(t);
        t = setTimeout(report, 80);
    }

    if (window.ResizeObserver) {
        new ResizeObserver(reportDebounced).observe(document.body);
    }
    window.addEventListener('load', report);
    window.addEventListener('resize', reportDebounced);
    document.addEventListener('DOMContentLoaded', report);
    setTimeout(report, 400);
    setTimeout(report, 1200);
})();
