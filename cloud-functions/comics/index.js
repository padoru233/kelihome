export function onRequestGet() {
    return new Response(null, { status: 301, headers: { Location: "/", "Cache-Control": "public, max-age=3600" } });
}
