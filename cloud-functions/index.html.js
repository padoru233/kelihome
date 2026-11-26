// Preserve old bookmarks without leaving a static index.html that shadows the home function.
export function onRequestGet() {
    return new Response(null, { status: 301, headers: { Location: "/", "Cache-Control": "public, max-age=3600" } });
}
