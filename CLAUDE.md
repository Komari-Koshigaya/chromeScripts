# CLAUDE.md

## 项目简介

个人油猴 (Tampermonkey) 脚本合集，托管在 GitHub：https://github.com/Komari-Koshigaya/chromeScripts

## 目录结构

```
chromeScripts/
├── scripts/                    # 油猴脚本目录
│   ├── utils/                  # 公共工具函数（可选）
│   └── *.user.js              # 各个油猴脚本文件
├── README.md                   # 项目说明文档
├── CLAUDE.md                   # 本文件
└── .gitignore
```

## 脚本列表

| 脚本 | 版本 | 说明 |
|------|------|------|
| scroll-buttons.user.js | v17.0 | 回到顶部/底部按钮，支持 SPA 动态内容 |

## Git 配置

- **用户名**: Komari-Koshigaya
- **邮箱**: 2323384399@qq.com
- **提交规范**: Conventional Commits（feat/fix/docs/chore）
- **Co-authored-by**: 提交时添加 `Co-Authored-By: Claude <noreply@anthropic.com>`（可选）

## 开发规范

- **文件命名**: `kebab-case.user.js`（如 `scroll-buttons.user.js`）
- **脚本头部**: 必须包含标准的 `==UserScript==` 注释块
- **作用域**: 使用 IIFE `(function() { ... })();` 包裹，避免全局污染
- **版本号**: 遵循语义化版本（主版本.次版本.修订号）
- **@match**: 尽量精确匹配目标网站，避免使用 `*://*/*`

## 脚本模板

```javascript
// ==UserScript==
// @name         脚本名称
// @namespace    https://github.com/Komari-Koshigaya
// @version      1.0.0
// @description  脚本功能描述
// @author       Komari-Koshigaya
// @match        *://target-site.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // 你的代码...
})();
```

## 常用命令

```bash
# 提交并推送
git add scripts/新脚本.user.js
git commit -m "feat: 添加xxx脚本"
git push

# 查看贡献者
gh api repos/Komari-Koshigaya/chromeScripts/contributors --jq '.[] | "\(.login): \(.contributions) commits"'
```

## 安装脚本（给用户）

Raw 链接格式：`https://raw.githubusercontent.com/Komari-Koshigaya/chromeScripts/main/scripts/xxx.user.js`

在 Tampermonkey 控制台 → 实用工具 → 从 URL 安装
