// ==UserScript==
// @name         B站批量取关｜随机延时防抖(控制台验证版迁移油猴)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自动翻页、自动确认弹窗，随机抖动延时1400~1700ms，降低风控概率
// @author       You
// @match        https://space.bilibili.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    let running = false;
    let obs = null;
    let totalUnfollow = 0;

    // 随机抖动延时 [min, max] 单位ms
    function randomSleep(min, max) {
        const ms = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 日志面板
    const panel = document.createElement('div');
    Object.assign(panel.style, {
        position: 'fixed',
        top: '120px',
        right: '16px',
        background: '#ffffff',
        padding: '14px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        zIndex: '999999',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '13px'
    });
    panel.innerHTML = `
        <div style="font-weight:bold;margin-bottom:8px;">B站批量取关【随机防抖】</div>
        <button id="startBtn" style="padding:4px 8px;margin:0 4px">开始执行</button>
        <button id="stopBtn" style="padding:4px 8px;margin:0 4px">停止</button>
        <div id="log" style="margin-top:8px;color:#333">就绪</div>
    `;
    document.body.appendChild(panel);
    const logDiv = panel.querySelector('#log');
    function log(msg) {
        logDiv.innerText = msg;
        console.log('[BiliUnfollow]', msg);
    }

    // 弹窗监听：自动点确认
    function startModalObserver() {
        obs = new MutationObserver(() => {
            const confirmBtn = document.querySelector('.bili-modal__footer .bili-btn--primary');
            if (confirmBtn) {
                confirmBtn.click();
                log("✅自动确认弹窗");
                console.log("[✅自动确认弹窗]");
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }
    function stopModalObserver() {
        if (obs) obs.disconnect();
    }

    // 处理当前页面
    async function processPage() {
        const btns = document.querySelectorAll('.follow-btn__trigger.gray');
        if (btns.length === 0) {
            log("📭本页没有UP，尝试翻页");
            return false;
        }
        log(`📄当前页找到 ${btns.length} 个待取关`);
        for (const b of btns) {
            if (!running) return false;
            const name = b.closest('.be-author-item')?.querySelector('.be-author-name')?.innerText || "未知UP";
            b.click();
            totalUnfollow++;
            log(`[${totalUnfollow}] 正在取关：${name}`);
            console.log(`[${totalUnfollow}] 正在取关：`, name);
            await randomSleep(1400, 1700);
        }
        log("✅本页全部处理完成");
        return true;
    }

    // 寻找并点击下一页（按文字匹配，验证可用）
    async function gotoNextPage() {
        let nextBtn = null;
        const buttons = document.querySelectorAll("button");
        for (const b of buttons) {
            const txt = b.innerText.trim();
            if (txt === "下一页" && !b.disabled) {
                nextBtn = b;
                break;
            }
        }
        if (!nextBtn) {
            log("🏁找不到下一页，任务结束！总共取关：" + totalUnfollow);
            console.log("🏁找不到下一页，任务结束！总共取关：", totalUnfollow);
            return false;
        }
        log("➡️点击下一页，等待3s加载");
        nextBtn.click();
        await randomSleep(2800, 3200); //翻页等待也加一点抖动
        return true;
    }

    document.getElementById('startBtn').onclick = async () => {
        if (running) return;
        running = true;
        totalUnfollow = 0;
        startModalObserver();
        log("🚀任务启动");
        console.log("🚀任务启动");

        while (running) {
            const hasItems = await processPage();
            if (!hasItems) {
                const canNext = await gotoNextPage();
                if (!canNext) {
                    running = false;
                    stopModalObserver();
                    break;
                }
            }
        }
        if (!running) stopModalObserver();
        log("🛑脚本已停止");
        console.log("🛑脚本已停止");
    };

    document.getElementById('stopBtn').onclick = () => {
        running = false;
        log("🛑收到停止指令，等待当前操作完成");
        console.log("🛑收到停止指令，等待当前操作完成");
    };

})();
