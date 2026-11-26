import { comicId, readCatalog } from "./catalog.js";

export const ORIGIN = "https://keli.love";
const CACHE = "public, max-age=60, s-maxage=1800";
export function escape(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
export const date = (value) => value ? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "暂无更新记录";
const progress = (item) => item.currentEpisode?.progress || "已完成";

function document(title, description, path, body, script = "") {
    return `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title><meta name="description" content="${escape(description)}">
<link rel="canonical" href="${ORIGIN}${path}"><link rel="icon" href="/assets/logo.png" type="image/png">
<link rel="stylesheet" href="/assets/comics.css">${script}</head>
<body><header><a href="/">可力小屋</a><nav aria-label="页面导航"><a class="back-link" href="/">← 返回首页</a></nav></header>
<main>${body}</main><footer>对可爱的事物没有抵抗力汉化组 · <a href="/">返回首页</a></footer></body></html>`;
}
function response(body, status = 200, type = "text/html") {
    return new Response(body, { status, headers: {
        "Content-Type": `${type}; charset=utf-8`,
        "Cache-Control": status === 200 ? CACHE : "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self' https://images.zaimanhua.com; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        ...(status !== 200 ? { "X-Robots-Tag": "noindex", ...(status === 503 ? { "Retry-After": "60" } : {}) } : {})
    } });
}
function unavailable() {
    return response(document("目录暂时不可用｜可力小屋", "请稍后重试", "/", '<h1>目录暂时不可用</h1><p>请稍后刷新重试。</p>'), 503);
}
function missing() {
    return response(document("未找到漫画｜可力小屋", "该漫画不存在或已移出公开目录", "/", '<h1>未找到漫画</h1><p>该漫画不存在或已移出公开目录。</p><a href="/">返回首页</a>'), 404);
}
export async function comicPage(id, read = readCatalog) {
    if (!comicId(id)) return missing();
    try {
        const item = (await read()).items.find((entry) => entry.id === id);
        if (!item) return missing();
        const description = `${item.name}${item.aliases.length ? `（又名：${item.aliases.join("、")}）` : ""} · 汉化进度与更新信息，由可力小屋整理`;
        const count = !item.standalone && item.episodeCount > 0 ? `完成 ${item.completedEpisodeCount} / ${item.episodeCount} 话` : "";
        const body = `<article data-comic-id="${item.id}"><h1>${escape(item.name)}</h1>
${item.coverUrl ? `<img class="cover" src="${escape(item.coverUrl)}" alt="${escape(item.name)} 封面" referrerpolicy="no-referrer">` : ""}
<p>汉化进度与更新信息，由可力小屋整理</p>
${item.aliases.length ? `<p>别名：${escape(item.aliases.join(" / "))}</p>` : ""}
${item.tags.length ? `<p>标签：${escape(item.tags.join("、"))}</p>` : ""}
<section aria-label="汉化进度"><p>汉化进度：<span id="comicEpisode">${escape(item.standalone ? "" : item.currentEpisode?.title || "")}</span> <span id="comicProgress">${escape(progress(item))}</span></p>
<p id="comicCount">${count}</p>
<p>更新时间：<time id="comicUpdated"${item.updatedAt ? ` datetime="${item.updatedAt}"` : ""}>${date(item.updatedAt)}</time></p>
<p id="refreshStatus" role="status" hidden></p></section>
${item.detailUrl ? `<p><a class="read-link" href="${escape(item.detailUrl)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">前往再漫画阅读</a></p>` : "<p>暂未提供阅读链接。</p>"}</article>`;
        return response(document(`${item.name} - 汉化进度与更新信息｜可力小屋`, description, `/comics/${item.id}`, body, '<script src="/assets/comic-progress.js" defer></script>'));
    } catch { return unavailable(); }
}
export async function sitemapPage(read = readCatalog) {
    try {
        const { items } = await read();
        const urls = [{ path: "/" }, ...items.map((item) => ({ path: `/comics/${item.id}`, updatedAt: item.updatedAt }))];
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((item) => `<url><loc>${ORIGIN}${item.path}</loc>${item.updatedAt ? `<lastmod>${item.updatedAt}</lastmod>` : ""}</url>`).join("")}</urlset>`;
        return response(body, 200, "application/xml");
    } catch {
        return response("Sitemap temporarily unavailable", 503, "text/plain");
    }
}
