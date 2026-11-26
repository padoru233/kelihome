(async () => {
    const id = document.querySelector("[data-comic-id]")?.dataset.comicId;
    if (!id) return;
    const status = document.getElementById("refreshStatus");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch("/api/catalog", { signal: controller.signal });
        if (!response.ok) throw new Error("Catalog unavailable");
        const catalog = await response.json();
        if (!Array.isArray(catalog?.items)) throw new Error("Invalid catalog");
        const item = catalog.items.find((entry) => entry && String(entry.id) === id);
        if (!item) {
            status.hidden = false;
            status.textContent = "该漫画已不在最新公开目录中，以上为缓存记录。";
            return;
        }
        const episode = item.currentEpisode;
        const progress = episode ? (typeof episode.progress === "string" ? episode.progress : "进行中") : "已完成";
        document.getElementById("comicProgress").textContent = progress === "已完结" ? "已完成" : progress;
        document.getElementById("comicEpisode").textContent = item.standalone || typeof episode?.title !== "string" ? "" : episode.title;
        document.getElementById("comicCount").textContent = !item.standalone && Number.isSafeInteger(item.episodeCount) && item.episodeCount > 0 && Number.isSafeInteger(item.completedEpisodeCount) && item.completedEpisodeCount >= 0
            ? `完成 ${item.completedEpisodeCount} / ${item.episodeCount} 话` : "";
        const updated = document.getElementById("comicUpdated");
        if (typeof item.updatedAt === "string" && Number.isFinite(Date.parse(item.updatedAt))) {
            updated.dateTime = new Date(item.updatedAt).toISOString();
            updated.textContent = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt));
        } else {
            updated.removeAttribute("datetime");
            updated.textContent = "暂无更新记录";
        }
        status.textContent = "";
        status.hidden = true;
    } catch {
        status.hidden = false;
        status.textContent = "暂时无法刷新进度，仍显示最近缓存的记录。";
    } finally { clearTimeout(timeout); }
})();
