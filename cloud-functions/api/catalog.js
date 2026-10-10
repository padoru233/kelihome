import { getStore } from "@edgeone/pages-blob";

const CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export async function onRequestGet() {
    let catalog;
    try {
        const store = getStore("keli-catalog");
        catalog = await store.get("catalog.json", {
            type: "json",
            consistency: "eventual"
        });
    } catch (error) {
        console.error("Failed to read catalog from Blob:", error);
        return Response.json(
            { generatedAt: null, items: [] },
            {
                status: 503,
                headers: {
                    "Cache-Control": "no-store",
                    "X-Catalog-Status": "storage-error"
                }
            }
        );
    }

    if (!catalog) {
        return Response.json(
            { generatedAt: null, items: [] },
            {
                status: 503,
                headers: {
                    "Cache-Control": "no-store",
                    "X-Catalog-Status": "empty"
                }
            }
        );
    }

    return Response.json(catalog, {
        headers: { "Cache-Control": CACHE_CONTROL }
    });
}
