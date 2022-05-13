import { MediapipeMixConfig, MediapipeMixOperationParams, generateDefaultMediapipeMixParams, generateMediapipeMixDefaultConfig } from "@dannadori/mediapipe-mix-worker-js";
import React, { useContext, useEffect, useState } from "react";
import { ReactNode } from "react";
import { loadURLAsDataURL } from "../utils/urlReader";

type Props = {
    children: ReactNode;
};

type AppStateValue = {
    inputSourceType: string | null;
    setInputSourceType: (source: string | null) => void;
    inputSource: string | MediaStream | null;
    setInputSource: (source: MediaStream | string | null) => void;

    config: MediapipeMixConfig;
    setConfig: (config: MediapipeMixConfig) => void;
    params: MediapipeMixOperationParams;
    setParams: (params: MediapipeMixOperationParams) => void;
};

const AppStateContext = React.createContext<AppStateValue | null>(null);

export const useAppState = (): AppStateValue => {
    const state = useContext(AppStateContext);
    if (!state) {
        throw new Error("useAppState must be used within AppStateProvider");
    }
    return state;
};

const initialInputSourcePath = "mov/Happy.mp4";

const initialConfig = generateMediapipeMixDefaultConfig();
const initialParams = generateDefaultMediapipeMixParams();
initialParams.faceProcessWidth = 512;
initialParams.faceProcessHeight = 512;

export const AppStateProvider = ({ children }: Props) => {
    const [inputSourceType, setInputSourceType] = useState<string | null>(null);
    const [inputSource, _setInputSource] = useState<MediaStream | string | null>(null);
    const setInputSource = (source: MediaStream | string | null) => {
        if (inputSource instanceof MediaStream) {
            inputSource.getTracks().forEach((x) => {
                x.stop();
            });
        }
        _setInputSource(source);
    };

    const [config, setConfig] = useState(initialConfig);
    const [params, setParams] = useState(initialParams);

    useEffect(() => {
        const loadInitialInputSource = async (path: string) => {
            const data = await loadURLAsDataURL(path);
            setInputSource(data);
        };
        loadInitialInputSource(initialInputSourcePath);
    }, []);

    const providerValue = {
        inputSourceType,
        setInputSourceType,
        inputSource,
        setInputSource,

        config,
        setConfig,
        params,
        setParams,
    };

    return <AppStateContext.Provider value={providerValue}>{children}</AppStateContext.Provider>;
};
