import { MediapipeMix2Config, MediapipeMix2OperationParams, MediapipeMix2WorkerManager } from "@dannadori/mediapipe-mix2-worker-js";
import React, { useContext, useEffect, useMemo, useState } from "react";
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

    manager: MediapipeMix2WorkerManager;
    config: MediapipeMix2Config | null;
    setConfig: (config: MediapipeMix2Config) => void;
    params: MediapipeMix2OperationParams;
    setParams: (params: MediapipeMix2OperationParams) => void;
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

    const manager = useMemo(() => {
        const m = new MediapipeMix2WorkerManager();
        return m;
    }, []);
    const [config, setConfig] = useState<MediapipeMix2Config | null>(null);
    const [params, setParams] = useState(manager.generateDefaultMediapipeMixParams());
    useEffect(() => {
        const setDefaultConfig = async () => {
            const c = await manager.generateDefaultConfig();
            setConfig(c);
        };
        setDefaultConfig();
    }, []);
    useEffect(() => {
        manager.init(config);
    }, [config]);

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

        manager,
        config,
        setConfig,
        params,
        setParams,
    };

    return <AppStateContext.Provider value={providerValue}>{children}</AppStateContext.Provider>;
};
