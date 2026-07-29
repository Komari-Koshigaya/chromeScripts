// ==UserScript==
// @name         网页二维码扫描识别器
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  一键识别网页二维码，悬浮按钮可拖动，网址支持直接跳转，本地解析不上传图片
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
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
            min-width:420px;
            max-width:90vw;
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
    `);

    // 创建悬浮扫码按钮
    const scanBtn = document.createElement('button');
    scanBtn.id = "qrcode-scan-btn";
    scanBtn.textContent = "扫码";
    document.body.appendChild(scanBtn);

    // ===== 拖拽逻辑 + 记忆位置 =====
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
        e.preventDefault();
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

    // 弹窗遮罩容器
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

    // 关闭弹窗
    const close = ()=>{
        mask.style.display = 'none';
        resultBox.style.display = 'none';
    };
    mask.onclick = close;
    document.getElementById('qr-close').onclick = close;

    // 判断文本是否为网址
    function isUrl(text){
        return /^(http|https):\/\/.+/.test(text.trim());
    }

    // 解析单张图片二维码
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

    // 按钮点击扫描（区分拖拽和点击）
    scanBtn.onclick = async ()=>{
        if(isDrag) return;
        const images = document.querySelectorAll('img');
        const resultList = document.getElementById('qr-list');
        resultList.innerHTML = "<div>正在扫描页面所有图片...</div>";
        mask.style.display = 'block';
        resultBox.style.display = 'block';

        const found = [];
        for(const img of images) {
            if(img.naturalWidth <30 || img.naturalHeight<30) continue;
            const text = await scanImage(img);
            if(text && !found.includes(text)) found.push(text);
        }

        if(found.length === 0){
            resultList.innerHTML = "<p>页面图片内未识别到二维码</p>";
            return;
        }
        let html = "";
        for(const text of found){
            let displayText = escapeHtml(text);
            if(isUrl(text)){
                displayText = `<a target="_blank" href="${escapeHtml(text)}">${escapeHtml(text)}</a>`;
            }
            html += `
                <div class="qr-item">
                    <span>${displayText}</span>
                    <button class="copy-btn" data-text="${escapeHtml(text)}">复制</button>
                </div>
            `;
        }
        resultList.innerHTML = html;

        // 复制按钮事件
        document.querySelectorAll('.copy-btn').forEach(btn=>{
            btn.onclick = async ()=>{
                const t = btn.dataset.text;
                await navigator.clipboard.writeText(t);
                const originText = btn.textContent;
                btn.textContent = "已复制";
                setTimeout(()=>{
                    btn.textContent = originText;
                }, 1200);
            }
        })
    };

    function escapeHtml(str){
        return String(str).replace(/[&<>"']/g,m=>{
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m];
        })
    }
})();
