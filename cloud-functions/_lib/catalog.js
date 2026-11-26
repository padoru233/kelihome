import { getStore } from "@edgeone/pages-blob";

export function comicId(value) {
    const id = typeof value === "string" || Number.isSafeInteger(value) ? String(value) : "";
    return /^(?:[1-9]\d*|episode-[1-9]\d*)$/.test(id) ? id : "";
}

function allowedUrl(value, host, prefix) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname === host && !url.username && !url.password &&
            !url.port && url.pathname.startsWith(prefix) ? url.href : "";
    } catch { return ""; }
}
const strings = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
export function normalizeCatalog(value) {
    if (!value || !Array.isArray(value.items)) throw new Error("Invalid catalog");
    const ids = new Set();
    return value.items.flatMap((item) => {
        const id = comicId(item?.id);
        if (!id || typeof item.name !== "string" || !item.name.trim()) return [];
        if (ids.has(id)) throw new Error("Duplicate comic ID");
        ids.add(id);
        const episode = item.currentEpisode;
        const progress = typeof episode?.progress === "string" ? episode.progress : "";
        return [{
            id, name: item.name, aliases: strings(item.aliases), tags: strings(item.tags),
            standalone: item.standalone === true,
            currentEpisode: episode && typeof episode === "object" ? {
                title: typeof episode.title === "string" ? episode.title : "",
                progress: progress === "已完结" ? "已完成" : progress || "进行中"
            } : null,
            episodeCount: Number.isSafeInteger(item.episodeCount) && item.episodeCount >= 0 ? item.episodeCount : 0,
            completedEpisodeCount: Number.isSafeInteger(item.completedEpisodeCount) && item.completedEpisodeCount >= 0 ? item.completedEpisodeCount : 0,
            updatedAt: typeof item.updatedAt === "string" && Number.isFinite(Date.parse(item.updatedAt)) ? new Date(item.updatedAt).toISOString() : "",
            coverUrl: allowedUrl(item.coverUrl, "images.zaimanhua.com", "/webpic/"),
            detailUrl: allowedUrl(item.detailUrl, "manhua.zaimanhua.com", "/details/")
        }];
    });
}

export function normalizeCatalogSnapshot(value) {
    const items = normalizeCatalog(value);
    const generatedAt = typeof value.generatedAt === "string" && Number.isFinite(Date.parse(value.generatedAt))
        ? new Date(value.generatedAt).toISOString() : null;
    return { generatedAt, items };
}

// This cache only exists within a warm function instance, not across the CDN.
export function createCatalogReader(read, now = Date.now) {
    let cached;
    let expires = 0;
    let pending;
    return async () => {
        if (cached && now() < expires) return cached;
        if (!pending) {
            pending = Promise.resolve().then(read).then(normalizeCatalogSnapshot).then((catalog) => {
                cached = catalog;
                expires = now() + 60_000;
                return catalog;
            }).finally(() => { pending = undefined; });
        }
        return pending;
    };
}
export const readCatalog = createCatalogReader(() => getStore("keli-catalog").get("catalog.json", {
    type: "json", consistency: "eventual"
}));
