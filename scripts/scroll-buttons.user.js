// ==UserScript==
// @name         回到顶部/底部按钮
// @namespace    https://github.com/kanji
// @version      17.0
// @description  在网页右侧添加回到顶部/底部按钮，支持 SPA 动态内容
// @author       Kanji
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ===== 检测已有按钮 =====
    function hasExisting() {
        const sels = [
            '[class*="back-to-top"]', '[class*="back_to_top"]', '[class*="backtotop"]',
            '[class*="scroll-top"]', '[class*="scroll_top"]', '[class*="scrolltop"]',
            '[class*="go-top"]', '[class*="go_top"]', '[class*="gotop"]',
            '[class*="to-top"]', '[class*="to_top"]', '[class*="totop"]',
            '[id*="back-to-top"]', '[id*="back_to_top"]', '[id*="backtotop"]',
            '[id*="scroll-top"]', '[id*="scroll_top"]', '[id*="scrolltop"]',
            '[id*="go-top"]', '[id*="go_top"]', '[id*="gotop"]',
            '[id*="to-top"]', '[id*="to_top"]', '[id*="totop"]',
        ];
        for (const sel of sels) {
            try {
                for (const el of document.querySelectorAll(sel)) {
                    const r = el.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0 &&
                        getComputedStyle(el).display !== 'none' &&
                        getComputedStyle(el).visibility !== 'hidden') return true;
                }
            } catch (e) { }
        }
        return false;
    }

    if (hasExisting()) return;

    // ===== 找滚动容器（不用试错法，直接按属性选最大的） =====
    function findScrollTarget() {
        const html = document.documentElement;
        const body = document.body;
        const vh = window.innerHeight;

        // 1. 检查 window 是否可滚动（body/html 没有 overflow:hidden）
        const htmlOY = getComputedStyle(html).overflowY;
        const bodyOY = getComputedStyle(body).overflowY;
        const docSH = Math.max(html.scrollHeight, body.scrollHeight);
        if (docSH > html.clientHeight + 10 && htmlOY !== 'hidden' && bodyOY !== 'hidden') {
            console.log('[ScrollBtn] window, sH=' + docSH);
            return {
                read: () => window.pageYOffset || html.scrollTop || body.scrollTop,
                write: v => { window.scrollTo({ top: v, behavior: 'instant' }); },
                max: () => Math.max(html.scrollHeight, body.scrollHeight),
                client: () => html.clientHeight,
            };
        }

        // 2. 找最大的 overflow:auto/scroll 内部容器
        let best = null, bestArea = 0;
        for (const el of document.querySelectorAll('*')) {
            if (el === html || el === body) continue;
            try {
                const oy = getComputedStyle(el).overflowY;
                if (oy !== 'auto' && oy !== 'scroll') continue;
                if (el.scrollHeight <= el.clientHeight + 10) continue;
                const r = el.getBoundingClientRect();
                if (r.height < vh * 0.3 || r.width < 50) continue;
                if (r.bottom < -50 || r.top > vh + 50) continue;
                const area = r.width * r.height;
                if (area > bestArea) { bestArea = area; best = el; }
            } catch (e) { }
        }

        if (best) {
            console.log('[ScrollBtn]', best.tagName + '.' + (best.className || '').toString().slice(0, 30),
                'sH=' + best.scrollHeight, 'cH=' + best.clientHeight);
            return {
                read: () => best.scrollTop,
                write: v => {
                    // 临时禁用 scroll-behavior: smooth，强制 instant
                    const orig = best.style.scrollBehavior;
                    best.style.scrollBehavior = 'auto';
                    best.scrollTop = v;
                    best.style.scrollBehavior = orig || '';
                },
                max: () => best.scrollHeight,
                client: () => best.clientHeight,
            };
        }

        // 3. 兜底
        console.log('[ScrollBtn] body兜底');
        return {
            read: () => body.scrollTop,
            write: v => { body.scrollTop = v; html.scrollTop = v; window.scrollTo(0, v); },
            max: () => Math.max(html.scrollHeight, body.scrollHeight),
            client: () => html.clientHeight,
        };
    }

    let sm = findScrollTarget();

    // SPA 重检（每 2 秒，最多 30 秒）
    let recheckCount = 0;
    const recheckTimer = setInterval(() => {
        recheckCount++;
        if (recheckCount > 15) { clearInterval(recheckTimer); return; }
        const newSM = findScrollTarget();
        if (newSM !== sm) { sm = newSM; }
    }, 2000);

    // ===== 手动平滑滚动（rAF，不受 CSS scroll-behavior 影响） =====
    let animId = null;
    function smoothTo(toY) {
        if (animId) { cancelAnimationFrame(animId); animId = null; }
        const fromY = sm.read();
        const diff = toY - fromY;
        if (Math.abs(diff) < 2) return;
        const duration = 500, start = performance.now();
        function tick(now) {
            const t = Math.min((now - start) / duration, 1);
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            sm.write(fromY + diff * ease);
            if (t < 1) { animId = requestAnimationFrame(tick); }
            else { animId = null; sm.write(toY); }
        }
        animId = requestAnimationFrame(tick);
    }

    // ===== 按钮（右下角，可拖拽） =====
    const wrapper = document.createElement('div');
    wrapper.id = 'tm-scroll-buttons';
    Object.assign(wrapper.style, {
        position: 'fixed', right: '16px', bottom: '120px',
        zIndex: '2147483647', display: 'flex', flexDirection: 'column',
        gap: '6px', cursor: 'grab',
    });

    let isDragging = false, dragMoved = false;
    let startX, startY, startRight, startBottom;

    wrapper.addEventListener('mousedown', (e) => {
        isDragging = true; dragMoved = false;
        startX = e.clientX; startY = e.clientY;
        startRight = parseInt(wrapper.style.right) || 16;
        startBottom = parseInt(wrapper.style.bottom) || 120;
        wrapper.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = startX - e.clientX, dy = e.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
        wrapper.style.right = Math.max(0, startRight + dx) + 'px';
        wrapper.style.bottom = Math.max(0, startBottom - dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) { isDragging = false; wrapper.style.cursor = 'grab'; }
    });

    function makeBtn(text, title, fn) {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.title = title; btn.textContent = text;
        Object.assign(btn.style, {
            width: '34px', height: '34px', borderRadius: '50%', border: 'none',
            backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '14px', lineHeight: '1',
            userSelect: 'none', transition: 'background-color 0.2s, transform 0.1s',
            boxShadow: '0 1px 6px rgba(0,0,0,0.25)', padding: '0', margin: '0',
        });
        btn.addEventListener('mouseenter', () => { btn.style.backgroundColor = 'rgba(0,0,0,0.75)'; btn.style.transform = 'scale(1.1)'; });
        btn.addEventListener('mouseleave', () => { btn.style.backgroundColor = 'rgba(0,0,0,0.5)'; btn.style.transform = 'scale(1)'; });
        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (!dragMoved) fn(); });
        return btn;
    }

    wrapper.appendChild(makeBtn('▲', '回到顶部', () => smoothTo(0)));
    wrapper.appendChild(makeBtn('▼', '回到底部', () => smoothTo(sm.max())));
    document.body.appendChild(wrapper);

    const btns = wrapper.querySelectorAll('button');
    btns[0].style.opacity = '1';
    btns[1].style.opacity = '1';

    let ticking = false;
    function update() {
        const top = sm.read(), max = sm.max(), ch = sm.client();
        btns[0].style.opacity = top > 200 ? '1' : '0.2';
        btns[1].style.opacity = (max - top - ch > 200) ? '1' : '0.2';
        ticking = false;
    }

    function onScroll() {
        if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });
    setTimeout(update, 1000);
})();
