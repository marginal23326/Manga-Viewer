export type Route = { name: "library" } | { id: string; name: "manga"; chapterIndex?: number };

export function parseRoute(hash: string): Route {
    const [segment, rawId, rawChapter] = hash.replace(/^#\/?/u, "").split("/");
    if (segment !== "manga" || !rawId) return { name: "library" };

    let id: string;
    try {
        id = decodeURIComponent(rawId);
    } catch {
        return { name: "library" };
    }
    if (!id) return { name: "library" };
    if (rawChapter === undefined || rawChapter === "") return { id, name: "manga" };

    const oneBased = Number(rawChapter);
    if (!Number.isInteger(oneBased) || oneBased < 1) return { id, name: "manga" };
    return { chapterIndex: oneBased - 1, id, name: "manga" };
}

export function routeHash(route: Route): string {
    if (route.name === "library") return "#/";
    const base = `#/manga/${encodeURIComponent(route.id)}`;
    return route.chapterIndex === undefined ? base : `${base}/${route.chapterIndex + 1}`;
}

export function navigateTo(route: Route): void {
    const hash = routeHash(route);
    if (location.hash !== hash) location.hash = hash;
}

export function replaceRoute(route: Route): void {
    const hash = routeHash(route);
    if (location.hash !== hash) history.replaceState(null, "", hash);
}
