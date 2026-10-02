const YT_RE = /i\.ytimg\.com\/vi\/([^/]+)\//

/** ID do vídeo do YouTube a partir da URL da thumbnail (as capas importadas são i.ytimg.com/vi/ID/hqdefault.jpg). */
export const ytIdFrom = (url) => url?.match(YT_RE)?.[1] || null
