import template from "./home-template.js";
import { readCatalog } from "./catalog.js";
import { escape, date } from "./pages.js";

function card(item) {
    const cover = item.coverUrl
        ? `<img src="${escape(item.coverUrl)}" alt="${escape(item.name)} 封面" loading="lazy" referrerpolicy="no-referrer">`
        : '<div class="cover-placeholder">暂无封面</div>';
    const episode = item.currentEpisode;
    const progress = episode?.progress || "已完成";
    const count = !item.standalone && item.episodeCount > 0 ? `<span>完成 ${item.completedEpisodeCount} / ${item.episodeCount} 话</span>` : "";
    return `<a class="comic-card" href="/comics/${item.id}"><div class="cover">${cover}</div><div class="card-body">
<div class="card-title">${escape(item.name)}</div><div class="aliases">${escape(item.aliases.join(" / ") || "暂无别称")}</div>
<div class="tags">${item.tags.slice(0, 5).map((tag) => `<span class="tag">${escape(tag)}</span>`).join("")}</div>
<div class="episode"><div class="episode-row">${!item.standalone && episode ? `<span class="episode-title">${escape(episode.title || "当前话数未知")}</span>` : ""}<span class="${episode ? "progress" : "completed"}">${escape(progress)}</span></div>${count}</div>
<time class="card-date"${item.updatedAt ? ` datetime="${item.updatedAt}"` : ""}>${date(item.updatedAt)}</time></div></a>`;
}

export function serializeCatalog(items) {
    // JSON inside a script element must not be able to close that element.
    return JSON.stringify({ items }).replace(/[<>&\u2028\u2029]/g, (character) =>
        `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

export async function homePage(read = readCatalog) {
    let items;
    try { items = await read(); } catch { items = null; }
    const values = {
        __INITIAL_CATALOG__: items ? serializeCatalog(items) : "null",
        __CATALOG_STATUS__: items ? `共 ${items.length} 个项目` : "目录数据暂时不可用，请稍后刷新重试。",
        __CATALOG_CARDS__: items ? [...items].sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)).map(card).join("") || '<p class="empty">暂无公开漫画</p>' : '<p class="empty">无法加载漫画目录</p>'
    };
    const html = template.replace(/__INITIAL_CATALOG__|__CATALOG_STATUS__|__CATALOG_CARDS__/g, (key) => values[key]);
    return new Response(html, { status: items ? 200 : 503, headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": items ? "public, max-age=60, s-maxage=300" : "no-store",
        "X-Content-Type-Options": "nosniff",
        ...(items ? {} : { "Retry-After": "60", "X-Robots-Tag": "noindex" })
    } });
}
