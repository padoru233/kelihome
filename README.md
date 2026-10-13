# 可力小屋漫画目录
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
- `catalogUrl`：同源 Makers Function 目录地址，固定为 `/api/catalog`。
- `pageSize`：每页显示的漫画项目数量，默认是 `24`。

页面不提供图片上传或手工图片卡片功能。漫画卡片完全由 Bot 目录 JSON 渲染，
其中 `coverUrl` 为空、不是再漫画封面域名，或图片加载失败时，页面显示“暂无封面”。
Logo 固定使用 `assets/logo.png`，同时作为浏览器标签图标。

## Bot 目录数据

页面仅读取 `catalog.json` 的 `items` 数组。每个项目至少应提供 `name`；支持的字段为：

```json
{
  "generatedAt": "2026-10-11T02:00:00+08:00",
  "items": [
    {
      "name": "漫画名",
      "aliases": ["别称"],
      "tags": ["百合"],
      "coverUrl": "https://images.zaimanhua.com/webpic/8/example.jpg",
      "detailUrl": "https://manhua.zaimanhua.com/details/xxxxx",
      "currentEpisode": {
        "title": "第 2 话",
        "progress": "校对中"
      },
      "episodeCount": 2,
      "completedEpisodeCount": 1,
      "updatedAt": "2026-10-11T01:00:00+08:00"
    }
  ]
}
```

`currentEpisode.progress` 使用 `翻译中`、`校对中`、`嵌字中` 或 `已完成`。为兼容已有目录数据，
页面会将旧的 `已完结` 视为 `已完成`。

“已完成”不只表示话数全部完结：只要 `currentEpisode` 为 `null`，即当前没有进行中的工序
（话数全部完结，或作品集还没有话数），卡片显示并按“已完成”筛选。没有话数时不显示
“完成 x / y 话”。

当项目带有 `"standalone": true` 时，该项代表作品集里的单独一话：卡片只显示进度，不显示
“第 N 话”和“完成 x / y 话”。普通项目不受影响。

目录由 [cloud-functions/api/catalog.js](./cloud-functions/api/catalog.js) 从 EdgeOne Makers Blob 读取。
写入接口位于 [cloud-functions/api/catalog-sync.js](./cloud-functions/api/catalog-sync.js)，仅允许持有
`CATALOG_SYNC_TOKEN` 的 Bot 调用。Bot 使用 `X-Catalog-Sync-Token` 认证，并兼容 Bearer
认证。不要将此密钥写入仓库或前端。

Blob SDK（`@edgeone/pages-blob`）是 Node.js SDK，运行时凭证由 Makers 在 **Node.js
Cloud Functions** 中注入，因此两个接口必须放在仓库根目录的 `cloud-functions/`。
不要放入 `edge-functions/`（V8 边缘运行时没有 `process.env`，也不会注入 Blob 凭证，
调用 `getStore()` 会抛错并返回 `545 Error return from script`），也不要使用 `functions/`。

在 Makers 项目的环境变量中配置：

```text
CATALOG_SYNC_TOKEN=<高强度随机值>
```

依赖由根目录的 `package.json` 与 `package-lock.json` 声明，部署时由 Makers 安装；本地
`node_modules/` 不需要提交。

将同一个值配置到 Bot 的 `TRANS_PUBLIC_CATALOG_SYNC_TOKEN`，并设置：

```text
TRANS_PUBLIC_CATALOG_SYNC_URL=https://www.keli.love/api/catalog-sync
```

首次同步成功时，Makers 会创建 Blob 命名空间 `keli-catalog` 和对象
`catalog.json`。公开读取使用最终一致模式；响应通过 EdgeOne 缓存 5 分钟，Bot 不参与
任何访客的目录请求。同步接口拒绝超过 1 MB 的目录，以控制函数资源消耗。公开 JSON
不应输出成员、群号、Token 或管理接口信息。

部署后可用 `curl -i https://www.keli.love/api/catalog` 排查：

- `200`：目录已同步；
- `503` 且 `X-Catalog-Status: empty`：函数与 Blob 正常，Bot 尚未同步；
- `503` 且 `X-Catalog-Status: storage-error`：Blob 读取失败，请查看函数日志；
- `545`：函数脚本在加载阶段崩溃，通常是函数目录或运行时放错。

## 本地预览

直接在浏览器打开 `index.html` 即可预览。若需要通过 HTTP 访问，可在此目录运行：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。

## EdgeOne 自动部署

仓库包含 GitHub Actions 工作流 `.github/workflows/trigger-edgeone.yml`。每次推送到 `main` 分支时，工作流会向 EdgeOne 部署钩子发送 `POST` 请求。

请在 GitHub 仓库的 **Settings > Secrets and variables > Actions** 中创建名为 `EDGEONE_DEPLOY_HOOK` 的 Repository secret，值填写 EdgeOne 控制台生成的完整部署钩子 URL。该 URL 可能包含鉴权信息，请勿直接写入仓库文件。
