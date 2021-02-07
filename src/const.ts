export const WINDOWS_REPLAYER_URL = "https://cdn.jsdelivr.net/gh/Smertig/among-us-replayer@8d3cf06807f100953be72234b69e2042f6c3f3da/"
export const COLORS = [
    "Red",
    "Blue",
    "Green",
    "Pink",
    "Orange",
    "Yellow",
    "Grey",
    "White",
    "Purple",
    "Brown",
    "Cyan",
    "LightGreen",
]

export const USE_HQ_MAP = location.search.includes("&map=hq")

export function replaceToHQURL(path: string) {
    return USE_HQ_MAP ? path.replace("res/", "res_hq/") : path
}