        const siteConfig = {
            title: "可力小屋",
            catalogUrl: "/api/catalog",
            pageSize: 24,
            forceAuditMode: false,
            auditDates: { month: 1, startDay: 19, endDay: 30 },
            community: {
                backgroundImage: "https://moe.jitsu.top/img",
                groupNumber: "1055588708",
                joinUrl: "https://qm.qq.com/q/Iciv8Fk1SQ",
                testGroupNumber: "689745093",
                testGroupJoinUrl: "https://qm.qq.com/q/lximlUvtVm",
                counterUrl: "https://count.getloli.com/@kelihome?theme=booru-qualityhentais&padding=7&offset=0&align=top&scale=1&pixelated=1&darkmode=auto"
            },
            audit: {
                slogan: "Personal Code Repository / 技术知识库",
                icp: { text: "苏ICP备2026003693号", url: "https://beian.miit.gov.cn/" },
                police: { text: "苏公网安备 32050802012501号", url: "http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=32050802012501" }
            }
        };

        const COMPLETED_PROGRESS = "已完成";
        const state = { items: [], page: 1 };
        const elements = {
            comicGrid: document.getElementById("comicGrid"),
            groupNumber: document.getElementById("groupNumber"),
            joinButton: document.getElementById("joinButton"),
            testGroupNumber: document.getElementById("testGroupNumber"),
            testGroupJoinButton: document.getElementById("testGroupJoinButton"),
            pagination: document.getElementById("pagination"),
            progressFilter: document.getElementById("progressFilter"),
            previousPage: document.getElementById("previousPage"),
            nextPage: document.getElementById("nextPage"),
            pageIndicator: document.getElementById("pageIndicator"),
            searchInput: document.getElementById("searchInput"),
            sortSelect: document.getElementById("sortSelect"),
            status: document.getElementById("status"),
            updatedAt: document.getElementById("updatedAt")
        };

        function createElement(tagName, properties = {}) {
            const element = document.createElement(tagName);
            for (const [key, value] of Object.entries(properties)) {
                element[key] = value;
            }
            return element;
        }

        function isAuditMode() {
            const { month, startDay, endDay } = siteConfig.auditDates;
            const today = new Date();
            return siteConfig.forceAuditMode || (
                today.getMonth() + 1 === month &&
                today.getDate() >= startDay &&
                today.getDate() <= endDay
            );
        }

        function formatDate(value) {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return "更新时间未知";
            return new Intl.DateTimeFormat("zh-CN", {
                year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
            }).format(date);
        }

        function isAllowedUrl(value, host, pathPrefix = "") {
            try {
                const url = new URL(value);
                return url.protocol === "https:" && url.hostname === host && url.pathname.startsWith(pathPrefix);
            } catch {
                return false;
            }
        }

        function normalizeItem(value) {
            if (!value || typeof value !== "object" || typeof value.name !== "string") return null;
            const aliases = Array.isArray(value.aliases) ? value.aliases.filter((item) => typeof item === "string") : [];
            const tags = Array.isArray(value.tags) ? value.tags.filter((item) => typeof item === "string") : [];
            const currentEpisode = value.currentEpisode && typeof value.currentEpisode === "object"
                ? {
                    ...value.currentEpisode,
                    progress: value.currentEpisode.progress === "已完结"
                        ? COMPLETED_PROGRESS
                        : value.currentEpisode.progress
                }
                : null;
            const id = typeof value.id === "string" || Number.isSafeInteger(value.id) ? String(value.id) : "";
            return {
                pageUrl: /^(?:[1-9]\d*|episode-[1-9]\d*)$/.test(id) ? `/comics/${id}` : "",
                name: value.name,
                aliases,
                tags,
                standalone: value.standalone === true,
                currentEpisode,
                completedEpisodeCount: Number.isInteger(value.completedEpisodeCount) ? value.completedEpisodeCount : 0,
                episodeCount: Number.isInteger(value.episodeCount) ? value.episodeCount : 0,
                updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
                coverUrl: isAllowedUrl(value.coverUrl, "images.zaimanhua.com", "/webpic/") ? value.coverUrl : "",
                detailUrl: isAllowedUrl(value.detailUrl, "manhua.zaimanhua.com", "/details/") ? value.detailUrl : ""
            };
        }

        function getFilteredItems() {
            const keyword = elements.searchInput.value.trim().toLocaleLowerCase();
            const progress = elements.progressFilter.value;
            const filteredItems = state.items.filter((item) => {
                const searchable = [item.name, ...item.aliases, ...item.tags].join(" ").toLocaleLowerCase();
                const itemProgress = item.currentEpisode?.progress || COMPLETED_PROGRESS;
                return (!keyword || searchable.includes(keyword)) && (!progress || itemProgress === progress);
            });
            return filteredItems.sort((left, right) => {
                if (elements.sortSelect.value === "name") return left.name.localeCompare(right.name, "zh-CN");
                return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
            });
        }

        function appendCover(card, item) {
            const cover = createElement("div", { className: "cover" });
            const addPlaceholder = () => cover.replaceChildren(createElement("div", { className: "cover-placeholder", textContent: "暂无封面" }));
            if (!item.coverUrl) {
                addPlaceholder();
            } else {
                const image = createElement("img", {
                    src: item.coverUrl,
                    alt: `${item.name} 封面`,
                    loading: "lazy",
                    referrerPolicy: "no-referrer"
                });
                image.addEventListener("error", addPlaceholder, { once: true });
                cover.append(image);
            }
            card.append(cover);
        }

        function createCard(item) {
            const card = item.pageUrl || item.detailUrl
                ? createElement("a", { className: "comic-card", href: item.pageUrl || item.detailUrl, rel: "noopener noreferrer", referrerPolicy: "no-referrer" })
                : createElement("article", { className: "comic-card" });
            appendCover(card, item);
            const body = createElement("div", { className: "card-body" });
            body.append(createElement("div", { className: "card-title", textContent: item.name }));
            body.append(createElement("div", { className: "aliases", textContent: item.aliases.join(" / ") || "暂无别称" }));
            const tags = createElement("div", { className: "tags" });
            item.tags.slice(0, 5).forEach((tag) => tags.append(createElement("span", { className: "tag", textContent: tag })));
            body.append(tags);
            const episode = createElement("div", { className: "episode" });
            if (item.standalone) {
                // 单话卡片的标题已经是话名，只需展示进度
                const isActive = Boolean(item.currentEpisode);
                episode.append(createElement("span", {
                    className: isActive ? "progress" : "completed",
                    textContent: item.currentEpisode?.progress || COMPLETED_PROGRESS
                }));
            } else {
                if (item.currentEpisode) {
                    const row = createElement("div", { className: "episode-row" });
                    row.append(
                        createElement("span", { className: "episode-title", textContent: item.currentEpisode.title || "当前话数未知" }),
                        createElement("span", { className: "progress", textContent: item.currentEpisode.progress || "进行中" })
                    );
                    episode.append(row);
                } else {
                    // 当前没有进行中的工序（全部完结或还没有话数）都算已完成
                    episode.append(createElement("span", { className: "completed", textContent: COMPLETED_PROGRESS }));
                }
            }
            body.append(episode);
            card.append(body);
            return card;
        }

        function renderCatalog() {
            const items = getFilteredItems();
            const pageCount = Math.max(1, Math.ceil(items.length / siteConfig.pageSize));
            state.page = Math.min(state.page, pageCount);
            const start = (state.page - 1) * siteConfig.pageSize;
            const pageItems = items.slice(start, start + siteConfig.pageSize);
            elements.comicGrid.replaceChildren();
            if (!pageItems.length) {
                elements.comicGrid.append(createElement("p", { className: "empty", textContent: "没有符合条件的漫画项目" }));
            } else {
                pageItems.forEach((item) => elements.comicGrid.append(createCard(item)));
            }
            elements.status.textContent = `共 ${items.length} 个项目`;
            elements.status.classList.remove("error");
            elements.pagination.classList.toggle("hidden", pageCount <= 1);
            elements.previousPage.disabled = state.page === 1;
            elements.nextPage.disabled = state.page === pageCount;
            elements.pageIndicator.textContent = `${state.page} / ${pageCount}`;
        }

        function renderUpdatedAt(value) {
            if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
                elements.updatedAt.dateTime = new Date(value).toISOString();
                elements.updatedAt.textContent = `数据更新：${formatDate(value)}`;
            } else {
                elements.updatedAt.removeAttribute("datetime");
                elements.updatedAt.textContent = "";
            }
        }

        async function loadCatalog() {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            try {
                const response = await fetch(siteConfig.catalogUrl, { signal: controller.signal });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const catalog = await response.json();
                if (!catalog || !Array.isArray(catalog.items)) throw new Error("目录数据格式无效");
                state.items = catalog.items.map(normalizeItem).filter(Boolean);
                renderUpdatedAt(catalog.generatedAt);
                renderCatalog();
            } catch (error) {
                elements.status.textContent = "目录数据暂时不可用，请稍后刷新重试。";
                elements.status.classList.add("error");
                elements.comicGrid.replaceChildren(createElement("p", { className: "empty", textContent: "无法加载漫画目录" }));
                console.error("Failed to load catalog:", error);
            } finally { clearTimeout(timeout); }
        }

        function renderCommunity() {
            const { community } = siteConfig;
            document.title = `${siteConfig.title} - 对可爱的事物没有抵抗力汉化组｜漫画汉化进度`;
            document.body.style.backgroundImage = `url("${community.backgroundImage}")`;
            document.body.style.backgroundPosition = "center";
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundAttachment = "fixed";
            document.body.style.backgroundRepeat = "no-repeat";
            elements.groupNumber.textContent = community.groupNumber;
            elements.joinButton.href = community.joinUrl;
            elements.testGroupNumber.textContent = community.testGroupNumber;
            elements.testGroupJoinButton.href = community.testGroupJoinUrl;
            elements.searchInput.addEventListener("input", () => { state.page = 1; renderCatalog(); });
            elements.progressFilter.addEventListener("change", () => { state.page = 1; renderCatalog(); });
            elements.sortSelect.addEventListener("change", () => { state.page = 1; renderCatalog(); });
            elements.previousPage.addEventListener("click", () => { state.page -= 1; renderCatalog(); });
            elements.nextPage.addEventListener("click", () => { state.page += 1; renderCatalog(); });
            const initial = document.getElementById("initialCatalog");
            const catalog = initial ? JSON.parse(initial.textContent) : null;
            if (Array.isArray(catalog?.items)) {
                renderUpdatedAt(catalog.generatedAt);
                state.items = catalog.items.map(normalizeItem).filter(Boolean);
                renderCatalog();
            } else {
                loadCatalog();
            }
        }

        function renderFooter(audit) {
            const footer = document.getElementById(audit ? "auditFooter" : "footer");
            const year = new Date().getFullYear();
            if (!audit) {
                footer.replaceChildren(
                    document.createTextNode(`© ${year} Keli Group`),
                    createElement("span", { className: "footer-counter-label", textContent: "历史访问人数" }),
                    createElement("img", {
                        className: "footer-counter",
                        src: siteConfig.community.counterUrl,
                        alt: "网站访问计数器"
                    })
                );
                return;
            }
            const { icp, police } = siteConfig.audit;
            [icp, police].forEach((record) => {
                footer.append(createElement("a", { href: record.url, target: "_blank", rel: "noopener noreferrer", textContent: record.text }), document.createElement("br"));
            });
            footer.append(`© ${year} Personal Tech Blog`);
        }

        function initPage() {
            const audit = isAuditMode();
            document.body.classList.toggle("mode-audit", audit);
            if (audit) document.body.style.backgroundImage = "";
            document.getElementById("communityContent").classList.toggle("hidden", audit);
            document.getElementById("auditContent").classList.toggle("hidden", !audit);
            if (audit) {
                document.title = siteConfig.title;
            } else {
                renderCommunity();
            }
            renderFooter(audit);
        }

        initPage();
