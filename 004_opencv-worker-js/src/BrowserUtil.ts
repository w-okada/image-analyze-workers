/************************************************
 * THIS FILE SHOULD BE EDITED IN COMMON FOLDER. *
 ************************************************/

export enum BrowserType {
    "MSIE",
    "EDGE",
    "CHROME",
    "SAFARI",
    "FIREFOX",
    "OPERA",
    "OTHER",
}

export const getBrowserType = () => {
    var userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.indexOf('msie') !== -1 || userAgent.indexOf('trident') !== -1) {
        return BrowserType.MSIE
    } else if (userAgent.indexOf('edge') !== -1) {
        return BrowserType.EDGE
    } else if (userAgent.indexOf('chrome') !== -1) {
        return BrowserType.CHROME
    } else if (userAgent.indexOf('safari') !== -1) {
        return BrowserType.SAFARI
    } else if (userAgent.indexOf('firefox') !== -1) {
        return BrowserType.FIREFOX
    } else if (userAgent.indexOf('opera') !== -1) {
        return BrowserType.OPERA
    } else {
        return BrowserType.OTHER
    }
}
