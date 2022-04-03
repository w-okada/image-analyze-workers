import { useEffect, useState } from "react";

const getWidth = () => document.documentElement.clientWidth || document.body.clientWidth;
const getHeight = () => document.documentElement.clientHeight || document.body.clientHeight;
// const getWidth = () => window.innerWidth;
// const getHeight = () => window.innerHeight;

export type WindowSize = {
    windowWidth: number;
    windowHeight: number;
};

export const useWindowStateChangeListener = () => {
    const [windowSize, setWindowSize] = useState<WindowSize>({
        windowWidth: getWidth(),
        windowHeight: getHeight(),
    });
    const [windowFocus, setWindowFocus] = useState<string>("focus");
    useEffect(() => {
        const resizeListener = () => {
            setWindowSize({
                windowWidth: getWidth(),
                windowHeight: getHeight(),
            });
        };

        window.addEventListener("resize", resizeListener);
        window.addEventListener("fullscreenchange", resizeListener);
        return () => {
            window.removeEventListener("resize", resizeListener);
            window.removeEventListener("fullscreenchange", resizeListener);
        };
    }, []);

    useEffect(() => {
        const focusListenerFocus = () => {
            setWindowFocus("focus");
        };
        const focusListenerBlur = () => {
            setWindowFocus("blur");
        };

        window.addEventListener("focus", () => {
            focusListenerFocus();
        });
        window.addEventListener("blur", () => {
            focusListenerBlur();
        });
        return () => {
            window.removeEventListener("focus", () => {
                focusListenerFocus();
            });
            window.removeEventListener("blur", () => {
                focusListenerBlur();
            });
        };
    }, []);

    return { windowSize, windowFocus };
};
