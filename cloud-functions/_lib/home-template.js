export default `<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="可力小屋，对可爱的事物没有抵抗力汉化组。查看漫画名称、别名、汉化进度与更新信息。">
    <link rel="canonical" href="https://keli.love/">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self'; img-src 'self' https://images.zaimanhua.com https://moe.jitsu.top https://pic.rmb.bdstatic.com https://count.getloli.com data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; base-uri 'self'; object-src 'none'">
    <link rel="icon" href="/assets/logo.png" type="image/png">
    <title>可力小屋 - 对可爱的事物没有抵抗力汉化组｜漫画汉化进度</title>
    <link rel="stylesheet" href="/assets/home.css">
</head>
<body>
    <header class="topbar">
        <a class="brand" href="/" aria-label="可力小屋首页">
            <img src="/assets/logo.png" alt="">
            <span class="brand-copy"><strong>可力小屋</strong><span>对可爱的事物没有抵抗力汉化组</span></span>
        </a>
    </header>
    <main id="communityContent" class="page">
        <section class="hero" aria-labelledby="catalogTitle">
            <div>
                <h1 id="catalogTitle">汉化进度</h1>
            </div>
            __CATALOG_UPDATED__
        </section>
        <div class="join-groups">
            <section class="join-card" aria-label="交流群">
                <div><span>欢迎加入交流群</span><strong id="groupNumber"></strong></div>
                <a id="joinButton" class="join-button" target="_blank" rel="noopener noreferrer nofollow">加入交流群</a>
            </section>
            <section class="join-card" aria-label="测试群">
                <div><span>如果对我们的工作感兴趣，欢迎加入我们</span><strong id="testGroupNumber"></strong></div>
                <a id="testGroupJoinButton" class="join-button" target="_blank" rel="noopener noreferrer nofollow">加入测试群</a>
            </section>
        </div>
        <section id="catalog" aria-label="漫画目录">
            <div class="filters">
                <label class="field"><input id="searchInput" type="search" placeholder="搜索漫画名、别称或标签" autocomplete="off"></label>
                <label class="field"><select id="progressFilter" aria-label="筛选进度">
                    <option value="">全部进度</option>
                    <option value="翻译中">翻译中</option>
                    <option value="校对中">校对中</option>
                    <option value="嵌字中">嵌字中</option>
                    <option value="已完成">已完成</option>
                </select></label>
                <label class="field"><select id="sortSelect" aria-label="排序方式"><option value="updated">按更新时间</option><option value="name">按名称</option></select></label>
            </div>
            <div class="catalog-meta"><p id="status" class="status" role="status">__CATALOG_STATUS__</p></div>
            <div id="comicGrid" class="catalog">__CATALOG_CARDS__</div>
            <nav id="pagination" class="pagination hidden" aria-label="目录分页">
                <button id="previousPage" type="button">上一页</button>
                <span id="pageIndicator"></span>
                <button id="nextPage" type="button">下一页</button>
            </nav>
        </section>
        <footer id="footer" class="footer"></footer>
    </main>
    <main id="auditContent" class="audit-page hidden">
        <p class="audit-copy"><strong>System Status: Online</strong><br>“可力小屋”是个人用于存放计算机技术学习笔记、代码片段的数字化空间。仅用于技术记录，不涉及经营性业务。</p>
        <footer id="auditFooter" class="footer"></footer>
    </main>
    <script id="initialCatalog" type="application/json">__INITIAL_CATALOG__</script>
    <script src="/assets/home.js" defer></script>
</body>
</html>
`;
