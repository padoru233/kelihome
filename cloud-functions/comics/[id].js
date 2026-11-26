import { comicPage } from "../_lib/pages.js";
export function onRequestGet(context) { return comicPage(context.params.id); }
