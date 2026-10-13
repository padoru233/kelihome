import { getStore } from "@edgeone/pages-blob";

const MAX_CATALOG_SIZE_BYTES = 1_000_000;

export async function onRequestPost(context) {
    const contextToken = context.env?.CATALOG_SYNC_TOKEN;
    const processToken =
        typeof process !== "undefined"
            ? process.env?.CATALOG_SYNC_TOKEN
            : undefined;
    const token = contextToken || processToken;
    const syncToken = context.request.headers.get("X-Catalog-Sync-Token");
    const rawAuthorization = context.request.headers.get("Authorization");
    const bearerToken = rawAuthorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const authorization =
        token && (syncToken === token || bearerToken === token)
            ? `Bearer ${token}`
            : rawAuthorization;

    if (!token || authorization !== `Bearer ${token}`) {
        console.error("Catalog sync authentication failed", {
            contextTokenConfigured: Boolean(contextToken),
            processTokenConfigured: Boolean(processToken),
            authorizationPresent: Boolean(authorization),
            bearerScheme: authorization?.startsWith("Bearer ") ?? false,
            syncTokenPresent: Boolean(syncToken),
            syncTokenMatchesContext: contextToken
                ? syncToken === contextToken
                : null,
            syncTokenMatchesProcess: processToken
                ? syncToken === processToken
                : null,
            matchesContextToken: contextToken
                ? authorization === `Bearer ${contextToken}`
                : null,
            matchesProcessToken: processToken
                ? authorization === `Bearer ${processToken}`
                : null
        });
        return new Response("Unauthorized", { status: 401 });
    }

    const contentLength = Number(context.request.headers.get("Content-Length") ?? 0);
    if (contentLength > MAX_CATALOG_SIZE_BYTES) {
        return new Response("Catalog is too large", { status: 413 });
    }

    let catalog;
    try {
        catalog = await context.request.json();
    } catch {
        return new Response("Invalid JSON", { status: 400 });
    }

    if (!catalog || !Array.isArray(catalog.items)) {
        return new Response("Invalid catalog format", { status: 400 });
    }

    const serializedCatalog = JSON.stringify(catalog);
    if (
        new TextEncoder().encode(serializedCatalog).byteLength >
        MAX_CATALOG_SIZE_BYTES
    ) {
        return new Response("Catalog is too large", { status: 413 });
    }

    try {
        const store = getStore("keli-catalog");
        await store.setJSON("catalog.json", catalog);
    } catch (error) {
        console.error("Failed to write catalog to Blob:", error);
        return new Response("Blob storage is unavailable", { status: 503 });
    }

    return Response.json({
        ok: true,
        generatedAt: catalog.generatedAt ?? null
    });
}
