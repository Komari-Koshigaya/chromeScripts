# ChromeScripts

个人油猴 (Tampermonkey) 脚本合集。

## 📁 目录结构

```
chromeScripts/
├── scripts/                    # 油猴脚本目录
│   ├── utils/                  # 公共工具函数（可选）
│   └── *.user.js              # 各个油猴脚本文件
├── README.md                   # 项目说明
└── .gitignore
```

## 📜 脚本列表

| 脚本 | 版本 | 说明 |
|------|------|------|
| [scroll-buttons.user.js](scripts/scroll-buttons.user.js) | v17.0 | 在网页右侧添加回到顶部/底部按钮，支持 SPA 动态内容 |

## 🚀 安装使用

### 前置条件

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展（Chrome / Firefox / Edge）

### 安装脚本

**方式一：从 GitHub 安装（推荐）**

1. 打开 Tampermonkey 控制台
2. 点击「实用工具」标签
3. 在「从 URL 安装」中粘贴脚本的 Raw 链接
4. 点击安装

**方式二：手动安装**

1. 打开脚本文件，复制全部内容
2. 打开 Tampermonkey 控制台 → 添加新脚本
3. 清空编辑器，粘贴内容并保存（Ctrl+S）

## 🛠️ 开发规范

- **文件命名**：`kebab-case.user.js`（如 `scroll-buttons.user.js`）
- **脚本头部**：必须包含标准的 `==UserScript==` 注释块
- **作用域**：使用 IIFE `(function() { ... })();` 包裹，避免全局污染
- **版本号**：遵循语义化版本（主版本.次版本.修订号）
- **@match**：尽量精确匹配目标网站，避免使用 `*://*/*`

## 📦 脚本开发模板

```javascript
// ==UserScript==
// @name         脚本名称
// @namespace    https://github.com/你的用户名
// @version      1.0.0
// @description  脚本功能描述
// @author       你的名字
// @match        *://target-site.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // 你的代码...
})();
```

## 📄 License

MIT
