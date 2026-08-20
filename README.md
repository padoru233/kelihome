# 可力小屋上传页
欢迎来到**对可爱的事物没有抵抗力汉化组**  
我们的主页是[**keli.love**](https://www.keli.love)  
这是一个无需构建步骤的独立静态页面。部署时保留以下结构，并将整个目录上传到任意静态文件服务即可：

```text
upload/
├── index.html
├── README.md
└── assets/
    └── logo.png
```

## 配置内容

在 `index.html` 顶部的 `siteConfig` 中维护页面内容：

- `forceAuditMode`：设为 `true` 可强制显示备案页。
- `auditDates`：配置每年自动显示备案页的日期范围。
- `community.announcements`：按顺序添加公告文字。
- `community.images`：添加图片卡片，例如：

```js
images: [
    { src: 'assets/activity.jpg', alt: '活动海报', href: 'https://example.com/activity' }
]
```

图片请放入 `assets/`，并以相对路径引用。Logo 固定使用 `assets/logo.png`，同时作为浏览器标签图标。

## 本地预览

直接在浏览器打开 `index.html` 即可预览。若需要通过 HTTP 访问，可在此目录运行：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。
