/************************************************
 * THIS FILE SHOULD BE EDITED IN COMMON FOLDER. *
 ************************************************/

export const BrowserTypes = {
    MSIE: "MSIE",
    EDGE: "EDGE",
    CHROME: "CHROME",
    SAFARI: "SAFARI",
    FIREFOX: "FIREFOX",
    OPERA: "OPERA",
    OTHER: "OTHER",
} as const;
export type BrowserTypes = typeof BrowserTypes[keyof typeof BrowserTypes];

export const getBrowserType = () => {
    var userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.indexOf("msie") !== -1 || userAgent.indexOf("trident") !== -1) {
        return BrowserTypes.MSIE;
    } else if (userAgent.indexOf("edge") !== -1) {
        return BrowserTypes.EDGE;
    } else if (userAgent.indexOf("chrome") !== -1) {
        return BrowserTypes.CHROME;
    } else if (userAgent.indexOf("safari") !== -1) {
        return BrowserTypes.SAFARI;
    } else if (userAgent.indexOf("firefox") !== -1) {
        return BrowserTypes.FIREFOX;
    } else if (userAgent.indexOf("opera") !== -1) {
        return BrowserTypes.OPERA;
    } else {
        return BrowserTypes.OTHER;
    }
};
