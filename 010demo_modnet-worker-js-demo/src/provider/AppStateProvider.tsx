import React, { useContext, useEffect, useState } from "react";
import { ReactNode } from "react";
import { useWindowStateChangeListener, WindowSize } from "demo-base";
import { loadURLAsDataURL } from "../utils/urlReader";
import { generateDefaultMODNetParams, generateMODNetDefaultConfig, MODNetConfig, MODNetOperationParams } from "@dannadori/modnet-worker-js";

type Props = {
    children: ReactNode;
};

type AppStateValue = {
    windowSize: WindowSize;
    inputSourceType: string | null;
    setInputSourceType: (source: string | null) => void;
    inputSource: string | MediaStream | null;
    setInputSource: (source: MediaStream | string | null) => void;
    backgroundSourceType: string | null;
    setBackgroundSourceType: (source: string | null) => void;
    backgroundSource: string | MediaStream | null;
    setBackgroundSource: (source: MediaStream | string | null) => void;

    config: MODNetConfig;
    setConfig: (config: MODNetConfig) => void;
    params: MODNetOperationParams;
    setParams: (params: MODNetOperationParams) => void;
};

const AppStateContext = React.createContext<AppStateValue | null>(null);

export const useAppState = (): AppStateValue => {
    const state = useContext(AppStateContext);
    if (!state) {
        throw new Error("useAppState must be used within AppStateProvider");
    }
    return state;
};

const initialInputSourcePath = "img/yuka_kawamura.png";
const initialBackgroundSourcePath = "img/north-star-2869817_640.jpg";

const initialConfig = generateMODNetDefaultConfig();
const initialParams = generateDefaultMODNetParams();
initialParams.processWidth = initialConfig.modelInputs[initialConfig.modelKey][0];
initialParams.processHeight = initialConfig.modelInputs[initialConfig.modelKey][1];

export const AppStateProvider = ({ children }: Props) => {
    const { windowSize } = useWindowStateChangeListener();
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
    const [backgroundSourceType, setBackgroundSourceType] = useState<string | null>(null);
    const [backgroundSource, _setBackgroundSource] = useState<MediaStream | string | null>(null);
    const setBackgroundSource = (source: MediaStream | string | null) => {
        if (backgroundSource instanceof MediaStream) {
            backgroundSource.getTracks().forEach((x) => {
                x.stop();
            });
        }
        _setBackgroundSource(source);
    };

    const [config, setConfig] = useState(initialConfig);
    const [params, setParams] = useState(initialParams);

    useEffect(() => {
        const loadInitialInputSource = async (path: string) => {
            const data = await loadURLAsDataURL(path);
            setInputSource(data);
        };
        loadInitialInputSource(initialInputSourcePath);

        const loadInitialBackgroundSource = async (path: string) => {
            const data = await loadURLAsDataURL(path);
            setBackgroundSource(data);
        };
        loadInitialBackgroundSource(initialBackgroundSourcePath);
    }, []);

    const providerValue = {
        windowSize,
        inputSourceType,
        setInputSourceType,
        inputSource,
        setInputSource,
        backgroundSourceType,
        setBackgroundSourceType,
        backgroundSource,
        setBackgroundSource,

        config,
        setConfig,
        params,
        setParams,
    };

    return <AppStateContext.Provider value={providerValue}>{children}</AppStateContext.Provider>;
};
