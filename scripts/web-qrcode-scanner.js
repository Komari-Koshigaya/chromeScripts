// ==UserScript==
// @name         网页二维码扫描识别
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  一键识别网页内所有图片中的二维码，本地解析不联网，复制无弹窗
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js
// ==/UserScript==

(function() {
    'use strict';

    // 样式
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
            cursor: pointer;
            z-index:999999;
            box-shadow: 0 3px 12px #0004;
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
            padding:20px;
            border-radius:10px;
            box-shadow:0 4px 30px #0006;
            z-index:9999999;
            min-width:360px;
            max-width:90vw;
            display:none;
        }
        #qrcode-mask {
            position:fixed;
            inset:0;
            background:#0007;
            z-index:9999998;
            display:none;
        }
        .qr-item {
            padding:6px 0;
            word-break:break-all;
            border-bottom:1px solid #eee;
        }
        .copy-btn {
            margin-left:8px;
            padding:2px 8px;
            cursor:pointer;
            border:1px solid #ccc;
            border-radius:4px;
            background:#f5f5f5;
        }
    `);

    // 创建悬浮按钮
    const scanBtn = document.createElement('button');
    scanBtn.id = "qrcode-scan-btn";
    scanBtn.textContent = "扫码";
    document.body.appendChild(scanBtn);

    // 弹窗遮罩
    const mask = document.createElement('div');
    mask.id = "qrcode-mask";
    const resultBox = document.createElement('div');
    resultBox.id = "qrcode-result-box";
    resultBox.innerHTML = `
        <h3>识别结果</h3>
        <div id="qr-list"></div>
        <div style="margin-top:12px;text-align:right;">
            <button id="qr-close">关闭</button>
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

    // 核心：解析单张图片二维码
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

    // 点击扫描按钮
    scanBtn.onclick = async ()=>{
        const images = document.querySelectorAll('img');
        const resultList = document.getElementById('qr-list');
        resultList.innerHTML = "<div>正在扫描图片...</div>";
        mask.style.display = 'block';
        resultBox.style.display = 'block';

        const found = [];
        for(const img of images) {
            if(img.naturalWidth <30 || img.naturalHeight<30) continue;
            const text = await scanImage(img);
            if(text && !found.includes(text)) found.push(text);
        }

        if(found.length === 0){
            resultList.innerHTML = "<p>未找到任何二维码</p>";
            return;
        }
        let html = "";
        for(const text of found){
            html += `
                <div class="qr-item">
                    <span>${escapeHtml(text)}</span>
                    <button class="copy-btn" data-text="${escapeHtml(text)}">复制</button>
                </div>
            `;
        }
        resultList.innerHTML = html;

        // 复制按钮事件：修改此处，无alert，按钮文字临时变化
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
        return str.replace(/[&<>"']/g,m=>{
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m];
        })
    }
})();
