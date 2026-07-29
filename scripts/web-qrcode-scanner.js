// ==UserScript==
// @name         网页二维码扫描识别器
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  修复悬浮按钮闪烁；图片hover弹出扫码按钮；Alt+Q快捷键；整页扫码；弹窗宽度固定
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        #qrcode-scan-btn {
            position: fixed;
            right: 20px;
            bottom: 80px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #2563eb;
            color: white;
            border: none;
            font-size:14px;
            cursor: grab;
            z-index:999999;
            box-shadow: 0 3px 12px rgba(0,0,0,0.25);
            user-select: none;
        }
        #qrcode-scan-btn:active{
            cursor: grabbing;
        }
        #qrcode-scan-btn:hover {
            background:#1d4ed8;
        }
        #qrcode-result-box {
            position:fixed;
            top:50%;
            left:50%;
            transform:translate(-50%,-50%);
            background:#fff;
            padding:24px;
            border-radius:14px;
            box-shadow:0 4px 35px rgba(0,0,0,0.22);
            z-index:9999999;
            width: 460px;
            max-width: 92vw;
            display:none;
        }
        #qrcode-mask {
            position:fixed;
            inset:0;
            background:rgba(0,0,0,0.55);
            z-index:9999998;
            display:none;
        }
        .qr-item {
            padding:8px 0;
            word-break:break-all;
            border-bottom:1px solid #eeeeee;
            display:flex;
            align-items:center;
            gap:8px;
        }
        .qr-item a{
            color:#2563eb;
            text-decoration:underline;
        }
        .copy-btn {
            margin-left:auto;
            padding:4px 10px;
            cursor:pointer;
            border:none;
            border-radius:6px;
            background:#e9ecef;
            transition: 0.2s;
        }
        .copy-btn:hover{
            background:#dde1e5;
        }
        #qr-close{
            padding:6px 16px;
            border:none;
            border-radius:8px;
            background:#2563eb;
            color:white;
            cursor:pointer;
            transition:0.2s;
        }
        #qr-close:hover{
            background:#1d4ed8;
        }
        .header-row{
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:12px;
        }
        /* 悬浮扫码浮层 */
        .global-img-scan-float{
            position:fixed;
            background:#2563eb;
            color:#fff;
            padding:4px 9px;
            border-radius:6px;
            font-size:12px;
            cursor:pointer;
            z-index:99999;
            box-shadow:0 2px 8px #0003;
            display:none;
        }
    `);

    // 全局悬浮扫码按钮（右下角整页扫描）
    const scanBtn = document.createElement('button');
    scanBtn.id = "qrcode-scan-btn";
    scanBtn.textContent = "扫码";
    document.body.appendChild(scanBtn);

    // 悬浮在图片上方的【📷扫码】浮层
    const floatScanBtn = document.createElement('div');
    floatScanBtn.className = "global-img-scan-float";
    floatScanBtn.innerText = "📷扫码";
    document.body.appendChild(floatScanBtn);

    let hoverTargetImg = null;
    let lastRightClickImage = null;
    let hideTimer = null; // 统一延时器

    // ===== 拖拽记忆位置 =====
    let btnPos = GM_getValue("qrBtnPos", null);
    if(btnPos){
        scanBtn.style.left = btnPos.x + "px";
        scanBtn.style.top = btnPos.y + "px";
        scanBtn.style.right = "auto";
        scanBtn.style.bottom = "auto";
    }
    let isDrag = false;
    let offsetX, offsetY;
    scanBtn.onmousedown = (e)=>{
        isDrag = true;
        offsetX = e.clientX - scanBtn.getBoundingClientRect().left;
        offsetY = e.clientY - scanBtn.getBoundingClientRect().top;
    };
    document.addEventListener("mousemove",(e)=>{
        if(!isDrag) return;
        scanBtn.style.left = (e.clientX - offsetX) + "px";
        scanBtn.style.top = (e.clientY - offsetY) + "px";
        scanBtn.style.right = "auto";
        scanBtn.style.bottom = "auto";
    });
    document.addEventListener("mouseup",()=>{
        if(isDrag){
            isDrag = false;
            const rect = scanBtn.getBoundingClientRect();
            GM_setValue("qrBtnPos",{x:rect.left,y:rect.top});
        }
    });

    // 弹窗容器
    const mask = document.createElement('div');
    mask.id = "qrcode-mask";
    const resultBox = document.createElement('div');
    resultBox.id = "qrcode-result-box";
    resultBox.innerHTML = `
        <div class="header-row">
            <h3 style="margin:0;">识别结果</h3>
        </div>
        <div id="qr-list"></div>
        <div style="margin-top:16px;text-align:right;">
            <button id="qr-close">关闭弹窗</button>
        </div>
    `;
    document.body.append(mask, resultBox);

    const close = ()=>{
        mask.style.display = 'none';
        resultBox.style.display = 'none';
    };
    mask.onclick = close;
    document.getElementById('qr-close').onclick = close;

    function isUrl(text){
        return /^(http|https):\/\/.+/.test(text.trim());
    }

    // 解析图片二维码
    async function scanImage(imgEl) {
        return new Promise((resolve)=>{
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = ()=>{
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img,0,0);
                const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                resolve(code ? code.data : null);
            };
            img.onerror = ()=>resolve(null);
            img.src = imgEl.currentSrc || imgEl.src;
        });
    }

    // 渲染弹窗
    async function renderResult(list) {
        const resultList = document.getElementById('qr-list');
        mask.style.display = 'block';
        resultBox.style.display = 'block';
        if(list.length === 0){
            resultList.innerHTML = "<p>未识别到二维码</p>";
            return;
        }
        let html = "";
        for(const text of list){
            let displayText = escapeHtml(text);
            if(isUrl(text)){
                displayText = `<a target="_blank" href="${escapeHtml(text)}">${escapeHtml(text)}</a>`;
            }
            html += `<div class="qr-item"><span>${displayText}</span><button class="copy-btn" data-text="${escapeHtml(text)}">复制</button></div>`;
        }
        resultList.innerHTML = html;
        document.querySelectorAll('.copy-btn').forEach(btn=>{
            btn.onclick = async ()=>{
                const t = btn.dataset.text;
                await navigator.clipboard.writeText(t);
                const old = btn.textContent;
                btn.textContent = "已复制";
                setTimeout(()=> btn.textContent = old, 1200);
            }
        })
    }

    // 浮层按钮点击识别当前图片
    floatScanBtn.onclick = async (ev)=>{
        ev.stopPropagation();
        if(!hoverTargetImg) return;
        const res = await scanImage(hoverTargetImg);
        renderResult(res ? [res] : []);
    };

    // 鼠标悬浮在扫码按钮上，取消隐藏倒计时【关键防闪烁】
    floatScanBtn.addEventListener('mouseenter', ()=>{
        clearTimeout(hideTimer);
    });
    // 鼠标离开扫码按钮，启动隐藏倒计时
    floatScanBtn.addEventListener('mouseleave', ()=>{
        startHideTimer();
    });

    function startHideTimer(){
        clearTimeout(hideTimer);
        hideTimer = setTimeout(()=>{
            floatScanBtn.style.display = "none";
            hoverTargetImg = null;
        }, 180);
    }

    // 右下角扫码按钮：扫描全部图片
    scanBtn.onclick = async ()=>{
        if(isDrag) return;
        const resultList = document.getElementById('qr-list');
        resultList.innerHTML = "<div>正在扫描页面所有图片...</div>";
        mask.style.display = 'block';
        resultBox.style.display = 'block';
        const images = document.querySelectorAll('img');
        const found = [];
        for(const img of images) {
            if(img.naturalWidth <30 || img.naturalHeight<30) continue;
            const text = await scanImage(img);
            if(text && !found.includes(text)) found.push(text);
        }
        renderResult(found);
    };

    async function scanLastRightImage(){
        if(!lastRightClickImage){
            alert("请先在目标图片上点击鼠标右键！");
            return;
        }
        const res = await scanImage(lastRightClickImage);
        renderResult(res ? [res] : []);
    }

    GM_registerMenuCommand("识别上次右键图片二维码", scanLastRightImage);

    // Alt+Q 快捷键
    document.addEventListener('keydown', (e)=>{
        if(e.altKey && e.key.toLowerCase() === 'q'){
            e.preventDefault();
            scanLastRightImage();
        }
    });

    // 监听右键，记录图片
    document.addEventListener("contextmenu", e=>{
        let target = e.target;
        while(target && target.tagName !== "IMG") target = target.parentElement;
        lastRightClickImage = target;
    });

    // ========= 图片悬浮逻辑（修复闪烁核心） =========
    document.addEventListener("mouseover", (e)=>{
        let node = e.target;
        while(node && node.tagName !== "IMG") node = node.parentElement;
        if(node){
            clearTimeout(hideTimer); // 清除隐藏计时器
            hoverTargetImg = node;
            const rect = node.getBoundingClientRect();
            floatScanBtn.style.left = (rect.right - 70) + "px";
            floatScanBtn.style.top = (rect.top + 6) + "px";
            floatScanBtn.style.display = "block";
        }
    }, true);

    document.addEventListener("mouseout", (e)=>{
        let node = e.target;
        while(node && node.tagName !== "IMG") node = node.parentElement;
        if(node){
            startHideTimer();
        }
    }, true);

    function escapeHtml(str){
        return String(str).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);
    }
})();
