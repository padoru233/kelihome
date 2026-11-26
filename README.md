# 可力小屋漫画目录
欢迎来到**对可爱的事物没有抵抗力汉化组**  
我们的主页是[**keli.love**](https://keli.love)

首页、漫画详情页和 sitemap 由 EdgeOne Makers Node.js Cloud Functions 动态返回，
样式和浏览器脚本为静态资源。请部署整个仓库，保留 `cloud-functions/` 和 `assets/`。
不需要前端构建命令、定时构建或单独运行后台服务器；Bot 更新 Blob 后，各层缓存刷新即可生效。

**根目录不能再放 `index.html`**：EdgeOne 静态资源优先于同名函数，会覆盖动态首页。
首页入口为 `cloud-functions/index.js`，模板为 `cloud-functions/_lib/home-template.js`，
样式和交互分别为 `assets/home.css`、`assets/home.js`。模板使用 JS 模块导入，
不依赖运行时读文件或额外的 `includeFiles` 配置。旧 `/index.html`、`/comics` 地址重定向到 `/`。

## 配置内容

在 `assets/home.js` 顶部的 `siteConfig` 中维护页面内容：

- `forceAuditMode`：设为 `true` 可强制显示备案页。
- `auditDates`：配置每年自动显示备案页的日期范围。
- `catalogUrl`：同源 Makers Function 目录地址，固定为 `/api/catalog`。
- `pageSize`：每页显示的漫画项目数量，默认是 `24`。

页面不提供图片上传或手工图片卡片功能。漫画卡片由云函数读取 Bot 目录 JSON 生成，浏览器直接使用 HTML 中附带的公开数据进行搜索、筛选和分页，
首次正常加载不重复请求 `/api/catalog`。
其中 `coverUrl` 为空、不是再漫画封面域名，或图片加载失败时，页面显示“暂无封面”。
Logo 固定使用 `assets/logo.png`，同时作为浏览器标签图标。

## Bot 目录数据

页面仅读取 `catalog.json` 的 `items` 数组。每个项目至少应提供 `name`；站内详情页还需要稳定的 `id`（正整数项目 ID，
或 `episode-正整数` 的独立话 ID）。改名不改变详情页地址。支持的字段为：

```json
{
  "generatedAt": "2026-10-11T02:00:00+08:00",
  "items": [
    {
      "id": 123,
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
TRANS_PUBLIC_CATALOG_SYNC_URL=https://keli.love/api/catalog-sync
```

首次同步成功时，Makers 会创建 Blob 命名空间 `keli-catalog` 和对象
`catalog.json`。公开读取使用最终一致模式；响应声明 5 分钟共享缓存（实际 CDN 命中需线上验证），Bot 不参与
任何访客的目录请求。同步接口拒绝超过 1 MB 的目录，以控制函数资源消耗。公开 JSON
不应输出成员、群号、Token 或管理接口信息。

部署后可用 `curl -i https://keli.love/api/catalog` 排查：

- `200`：目录已同步；
- `503` 且 `X-Catalog-Status: empty`：函数与 Blob 正常，Bot 尚未同步；
- `503` 且 `X-Catalog-Status: storage-error`：Blob 读取失败，请查看函数日志；
- `545`：函数脚本在加载阶段崩溃，通常是函数目录或运行时放错。

## 本地预览

动态首页需要支持 Cloud Functions 的 EdgeOne 本地开发环境；直接打开静态文件或使用
`python3 -m http.server` 不能提供首页与动态接口。运行 `npm test` 可在无 Blob 凭证的环境
验证生成的 HTML、数据转义、错误响应和缓存行为。访问真实 Blob 的预览需要平台运行时凭证。

## EdgeOne 自动部署

仓库包含 GitHub Actions 工作流 `.github/workflows/trigger-edgeone.yml`。每次推送到 `main` 分支时，工作流会向 EdgeOne 部署钩子发送 `POST` 请求。

请在 GitHub 仓库的 **Settings > Secrets and variables > Actions** 中创建名为 `EDGEONE_DEPLOY_HOOK` 的 Repository secret，值填写 EdgeOne 控制台生成的完整部署钩子 URL。该 URL 可能包含鉴权信息，请勿直接写入仓库文件。

## 搜索入口与动态 HTML

- `/`：初始 HTML 包含全部公开漫画卡片、名称、别名和详情链接。禁用 JS 时显示全部漫画；
  启用 JS 后保留原有搜索、筛选、排序和每页 24 项的交互。首次加载使用页面内安全嵌入的公开 JSON，
  不重复请求接口。旧 `/comics` 仅做 301 重定向，不再维护单独的目录页。
- `/comics/123`、`/comics/episode-456`：返回漫画标题、别名、标签、封面、进度、
  更新时间和再漫画阅读入口。首页卡片进入站内详情页；公开 HTML 只包含合法稳定 ID 的漫画。
- `/sitemap.xml`：函数动态返回首页、详情页的正式域名地址；详情页的 `lastmod`
  只使用有效的 `updatedAt`，不使用当前请求时间。原来的搜索引擎验证文件保持可用。
- `/robots.txt`：允许抓取并声明 sitemap。部署后在各站长平台提交
  `https://keli.love/sitemap.xml`。

所有访客和爬虫获取相同 HTML。详情页的 JS 仅刷新进度，失败时保留 HTML 中的记录。
新增页面只输出展示字段；文本做 HTML 转义，外部图片和阅读链接按 HTTPS 域名白名单校验。
不存在的漫画返回真实 404；Blob 读取失败或尚未同步返回 503，错误响应禁止缓存。

### 缓存与更新

首页声明 `public, max-age=60, s-maxage=300`；详情页和 sitemap 声明
`public, max-age=60, s-maxage=1800`：浏览器缓存 1 分钟，支持该策略的共享缓存分别保存
5 分钟和 30 分钟。读取目录另有 **60 秒函数实例内缓存**，合并同实例的
并发读取；冷启动、不同实例不会共享它，也不会因此免除函数调用。

Bot 同步后无需重新部署。新增、改名、删除会在各层缓存过期及 Blob 最终一致读取刷新后反映；
删除不是即时撤回，旧详情可能在缓存有效期内继续访问。必要时在平台清理相应 URL 缓存。
详情页 JS 通过现有 `/api/catalog` 获取较新的进度，该接口也有自己的缓存时间。

**不要仅凭响应头认定 EdgeOne 已缓存云函数响应。** 官方缓存文档主要说明静态资源；
上线后必须重复请求 `/`、一个真实详情地址、`/sitemap.xml`，检查平台返回的
缓存命中信息（如有），并结合云函数调用量与日志确认。若未命中，应核对项目/套餐是否支持
对应动态路由缓存及其配置；在验证前按每个请求可能调用函数估算额度。

这些路由通过 `cloud-functions/index.js`、`cloud-functions/comics/[id].js`
和 `cloud-functions/api/sitemap.js` 映射，无需构建命令。`edgeone.json` 显式将
`/sitemap.xml` 内部重写到 `/api/sitemap`，并将旧 `/index.html` 重定向到 `/`；不要依赖
`sitemap.xml.js` 或 `index.html.js` 这样的多后缀文件名自动生成路由。不要创建同名静态文件
覆盖函数路由。`_lib/` 内的辅助模块没有 Handler 导出，不会成为独立函数路由。

### 验证

使用 Node.js 22 或更新版本运行 `npm test`，覆盖 HTML 注入、链接校验、404/503、
sitemap、缓存过期/并发读取、删除和前端刷新失败。无需新增测试依赖。
部署后检查：

```bash
curl -i https://keli.love/
curl -i https://keli.love/comics # 应返回 301，Location: /
curl -i https://keli.love/comics/123 # 替换为真实 ID
curl -i https://keli.love/comics/999999999999
curl -i https://keli.love/sitemap.xml
curl -i https://keli.love/robots.txt
```

查看首页和详情页源代码应直接包含漫画名和进度；禁用 JavaScript 仍可浏览全部漫画和详情。
浏览器首次打开首页时，网络面板不应出现额外的 `/api/catalog` 请求；详情页仍通过该接口刷新进度。
上线需一次代码部署，后续目录更新不会触发构建。

## 首选域名与 301 跳转

正式地址为 `https://keli.love`。`edgeone.json` 使用 EdgeOne 的自定义域名规则
`$wwwhost` → `$host`，将 www 访问永久重定向到根域名；两者均需保留域名绑定及有效 HTTPS 证书。
部署后检查 `https://www.keli.love/comics/6?from=test` 返回 301，且 Location 保留
`/comics/6?from=test`；根域名页面不应再次跳回 www。

Bot 写入接口请直接使用 `https://keli.love/api/catalog-sync`，不要依赖 POST 请求经过
301 跳转，以免客户端改变请求方法或丢失认证头。该规则随代码部署生效，不需要为内容更新重新部署。
