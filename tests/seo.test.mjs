import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { normalizeCatalog, createCatalogReader } from "../cloud-functions/_lib/catalog.js";
import { comicPage, sitemapPage } from "../cloud-functions/_lib/pages.js";

import { homePage, serializeCatalog } from "../cloud-functions/_lib/home.js";
import { onRequestGet as redirectCatalog } from "../cloud-functions/comics/index.js";

const sample = { id: 123, name: '漫画<&"测试', aliases: ['别名<script>alert(1)</script>'], tags: ['百合'],
    currentEpisode: { title: '第 2 话', progress: '校对中' }, episodeCount: 3, completedEpisodeCount: 1,
    updatedAt: '2026-11-26T02:00:00Z', coverUrl: 'https://images.zaimanhua.com/webpic/8/a.jpg',
    detailUrl: 'https://manhua.zaimanhua.com/details/123', secret: 'must-not-leak' };
const items = () => normalizeCatalog({ items: [sample, { ...sample, id: 'episode-5', standalone: true, currentEpisode: null }] });
const read = async () => items();

test('HTML contains crawlable content, stable links, escaped text, and no private fields', async () => {
    const result = await comicPage('123', read);
    assert.equal(result.status, 200);
    const html = await result.text();
    assert.match(html, /漫画&lt;&amp;&quot;测试/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /must-not-leak|<script>alert/);
    assert.match(html, /完成 1 \/ 3 话/);
    assert.match(html, /rel="canonical" href="https:\/\/keli.love\/comics\/123"/);
    assert.match(html, /汉化进度：<span id="comicEpisode">第 2 话<\/span> <span id="comicProgress">校对中<\/span>/);
    assert.match(html, /<p>汉化进度与更新信息，由可力小屋整理<\/p>/);
    assert.match(html, /id="refreshStatus" role="status" hidden><\/p>/);
    assert.match(result.headers.get('cache-control'), /s-maxage=1800/);
    assert.match(result.headers.get('content-security-policy'), /script-src 'self'/);
    const directory = await (await homePage(read)).text();
    assert.match(directory, /href="\/comics\/123"/);
    assert.match(directory, /href="\/comics\/episode-5"/);
});

test('single episodes and empty collections retain existing display semantics', async () => {
    const html = await (await comicPage('episode-5', read)).text();
    assert.match(html, /已完成/);
    assert.doesNotMatch(html, /完成 1 \/ 3 话/);
    assert.match(await (await homePage(async () => [])).text(), /暂无公开漫画/);
});

test('invalid IDs avoid storage; absent comics return uncached real 404', async () => {
    let calls = 0;
    const reader = async () => { calls++; return items(); };
    for (const id of ['../123', '<script>', '__proto__', '', '0']) {
        const result = await comicPage(id, reader);
        assert.equal(result.status, 404);
        assert.equal(result.headers.get('cache-control'), 'no-store');
    }
    assert.equal(calls, 0);
    assert.equal((await comicPage('999', reader)).status, 404);
});

test('storage failures are retryable 503, never cached as missing/empty sitemap', async () => {
    const fail = async () => { throw new Error('sensitive details'); };
    for (const result of [await comicPage('123', fail), await homePage(fail), await sitemapPage(fail)]) {
        assert.equal(result.status, 503);
        assert.equal(result.headers.get('cache-control'), 'no-store');
        assert.equal(result.headers.get('retry-after'), '60');
        assert.doesNotMatch(await result.text(), /sensitive details/);
    }
});

test('sitemap uses public canonical URLs and actual valid modification dates', async () => {
    const result = await sitemapPage(read);
    const xml = await result.text();
    assert.match(result.headers.get('content-type'), /application\/xml/);
    assert.equal((xml.match(/<url>/g) || []).length, 3);
    assert.match(xml, /<loc>https:\/\/keli.love\/comics\/123<\/loc>/);
    assert.match(xml, /<lastmod>2026-11-26T02:00:00.000Z<\/lastmod>/);
    assert.doesNotMatch(xml, /zaimanhua|must-not-leak/);
    const invalidDate = normalizeCatalog({ items: [{ ...sample, updatedAt: 'bad' }] });
    assert.doesNotMatch(await (await sitemapPage(async () => invalidDate)).text(), /lastmod/);
});

test('normalization rejects unsafe URLs, duplicate IDs and strips nonpublic fields', () => {
    const [item] = normalizeCatalog({ items: [{ ...sample, detailUrl: 'javascript:alert(1)', coverUrl: 'https://images.zaimanhua.com.evil/webpic/a' }] });
    assert.equal(item.coverUrl, '');
    assert.equal(item.detailUrl, '');
    assert.equal(item.secret, undefined);
    assert.throws(() => normalizeCatalog({ items: [sample, sample] }), /Duplicate/);
    assert.throws(() => normalizeCatalog(null), /Invalid/);
    assert.deepEqual(normalizeCatalog({ items: [null, {}, { id: '../x', name: 'bad' }] }), []);
});

test('warm cache coalesces reads, expires, and reflects removals without deployment', async () => {
    let time = 0;
    let calls = 0;
    let data = { items: [sample] };
    const reader = createCatalogReader(async () => { calls++; return data; }, () => time);
    await Promise.all([reader(), reader(), reader()]);
    assert.equal(calls, 1);
    data = { items: [] };
    assert.equal((await reader()).length, 1);
    time = 60_001;
    assert.equal((await reader()).length, 0);
    assert.equal(calls, 2);
    assert.equal((await comicPage('123', reader)).status, 404);
});

test('failed reads do not poison cache', async () => {
    let calls = 0;
    const reader = createCatalogReader(async () => {
        if (++calls === 1) throw new Error('offline');
        return { items: [sample] };
    });
    await assert.rejects(reader(), /offline/);
    assert.equal((await reader()).length, 1);
});

// Exercise the browser updater without a network or a DOM implementation dependency.
async function update(fetch) {
    const elements = Object.fromEntries(['refreshStatus', 'comicProgress', 'comicEpisode', 'comicCount', 'comicUpdated'].map((id) => [id, { textContent: 'cached', removeAttribute(key) { delete this[key]; } }]));
    const document = { querySelector: () => ({ dataset: { comicId: '123' } }), getElementById: (id) => elements[id] };
    const script = await readFile(new URL('../assets/comic-progress.js', import.meta.url), 'utf8');
    await vm.runInNewContext(script, { document, fetch, AbortController, setTimeout, clearTimeout, Intl });
    return elements;
}
test('live progress refresh preserves cached content when offline or removed', async () => {
    let elements = await update(async () => { throw new Error('offline'); });
    assert.equal(elements.comicProgress.textContent, 'cached');
    assert.match(elements.refreshStatus.textContent, /暂时无法/);
    elements = await update(async () => Response.json({ items: [] }));
    assert.match(elements.refreshStatus.textContent, /已不在/);
    elements = await update(async () => Response.json({ items: [{ ...sample, currentEpisode: null }] }));
    assert.equal(elements.refreshStatus.textContent, '');
    assert.equal(elements.refreshStatus.hidden, true);
    assert.equal(elements.comicProgress.textContent, '已完成');
    assert.equal(elements.comicCount.textContent, '完成 1 / 3 话');
    elements = await update(async () => Response.json({ items: [{ ...sample, currentEpisode: { title: '<script>', progress: '已完结' } }] }));
    assert.equal(elements.refreshStatus.textContent, '');
    assert.equal(elements.refreshStatus.hidden, true);
    assert.equal(elements.comicProgress.textContent, '已完成');
    assert.equal(elements.comicEpisode.textContent, '<script>');
});


test('home HTML contains every comic and safely embeds the same public data', async () => {
    const hostile = { ...sample, name: '</script><script>alert(1)</script>__CATALOG_STATUS__$&' };
    const publicItems = normalizeCatalog({ items: [hostile, ...Array.from({ length: 30 }, (_, index) => ({ ...sample, id: index + 200 }))] });
    const result = await homePage(async () => publicItems);
    const html = await result.text();
    assert.equal(result.status, 200);
    assert.match(result.headers.get('cache-control'), /s-maxage=300/);
    assert.equal((html.match(/class="comic-card"/g) || []).length, 31);
    assert.match(html, /href="\/comics\/229"/);
    assert.doesNotMatch(html, /<script>alert|must-not-leak/);
    const json = html.match(/id="initialCatalog" type="application\/json">([\s\S]*?)<\/script>/)[1];
    assert.equal(JSON.parse(json).items[0].name, hostile.name);
    assert.deepEqual(JSON.parse(serializeCatalog(publicItems)).items, publicItems);
    assert.match(html, /src="\/assets\/home.js"/);
});

test('former directory redirects to home and is excluded from sitemap', async () => {
    const result = redirectCatalog();
    assert.equal(result.status, 301);
    assert.equal(result.headers.get('location'), '/');
    const xml = await (await sitemapPage(read)).text();
    assert.doesNotMatch(xml, /<loc>https:\/\/keli.love\/comics<\/loc>/);
});


test('public sitemap route explicitly rewrites to a normal function route', async () => {
    const config = JSON.parse(await readFile(new URL('../edgeone.json', import.meta.url), 'utf8'));
    assert.deepEqual(config.rewrites.find(rule => rule.source === '/sitemap.xml'), {
        source: '/sitemap.xml', destination: '/api/sitemap'
    });
    const handler = await import('../cloud-functions/api/sitemap.js');
    assert.equal(typeof handler.onRequestGet, 'function');
    assert.deepEqual(config.redirects.find(rule => rule.source === '/index.html'), {
        source: '/index.html', destination: '/', statusCode: 301
    });
});
