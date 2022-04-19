import React, { useEffect, useMemo, useState } from "react";
import { useDeviceManager } from "../hooks/useDeviceManager";
import { CommonSelector, CommonSelectorProps } from "./CommonSelector";
import "../css/CSS.css";

export type VideoInputSelectorProps = {
    id: string;
    currentValue: string;
    onInputSourceTypeChanged: (value: string) => void;
    onInputSourceChanged: (value: MediaStream | string) => void;
    cameraResolutions?: { [name: string]: number[] };
    filePaths?: { [name: string]: string };
};

export const VideoInputSelector = (props: VideoInputSelectorProps) => {
    const { getVideoInputDevices } = useDeviceManager();
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

    useEffect(() => {
        const loadDevices = async () => {
            const videoDevices = await getVideoInputDevices();
            setVideoDevices(videoDevices);
        };
        loadDevices();
    }, []);

    /// Load Camera
    useEffect(() => {
        if (props.currentValue === "File" || props.currentValue === "Window" || props.currentValue === "Sample") {
            return;
        }
        if (props.cameraResolutions) {
            return;
        }
        navigator.mediaDevices
            .getUserMedia({
                audio: false,
                video: {
                    deviceId: props.currentValue,
                },
            })
            .then((media) => {
                props.onInputSourceChanged(media);
            });
    }, [props.currentValue]);

    /// create params
    const commonSelectorProps: CommonSelectorProps<string> = useMemo(() => {
        const p: CommonSelectorProps<string> = {
            id: props.id,
            title: "Video Input",
            currentValue: props.currentValue,
            options: {
                File: "File",
                Window: "Window",
            },
            onChange: props.onInputSourceTypeChanged,
        };
        videoDevices.forEach((x) => {
            p.options[x.label] = x.deviceId;
        });
        if (props.filePaths) {
            p.options["Sample"] = "Sample";
        }
        return p;
    }, [videoDevices, props.currentValue]);

    // create camera resolution button
    const cameraResolutionButtons = useMemo(() => {
        if (!props.cameraResolutions) {
            return <></>;
        }
        return Object.keys(props.cameraResolutions).map((x) => {
            return (
                <button
                    key={`sample-file-${x}`}
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                        navigator.mediaDevices
                            .getUserMedia({
                                audio: false,
                                video: {
                                    deviceId: props.currentValue,
                                    width: { ideal: props.cameraResolutions![x][0], max: 1200 },
                                    height: { ideal: props.cameraResolutions![x][1], max: 1500 },
                                },
                            })
                            .then((media) => {
                                props.onInputSourceChanged(media);
                            });
                    }}
                >
                    {x}
                </button>
            );
        });
    }, [props.currentValue]);

    // create sample file button
    const sampleFileButtons = useMemo(() => {
        if (!props.filePaths) {
            return <></>;
        }
        return Object.keys(props.filePaths).map((x) => {
            return (
                <button
                    key={`sample-file-${x}`}
                    className="btn btn-sm btn-outline"
                    onClick={async () => {
                        const data = await loadURLAsDataURL(props.filePaths![x]);
                        props.onInputSourceChanged(data);
                    }}
                >
                    {x}
                </button>
            );
        });
    }, [props.currentValue]);

    const loadURLAsDataURL = async (path: string) => {
        const res = await fetch(path);
        const b = await res.blob();

        const reader = new FileReader();
        const p = new Promise<string>((resolve, _reject) => {
            reader.onload = () => {
                resolve(reader.result as string);
            };
            reader.readAsDataURL(b);
        });
        return await p;
    };

    const loadFileClicked = () => {
        const fileInput = document.getElementById(`${props.id}-file-input`) as HTMLInputElement;
        fileInput.onchange = (event: Event) => {
            if (!event || !event.target) {
                return;
            }
            if (!(event.target instanceof HTMLInputElement)) {
                return;
            }
            if (!event.target.files) {
                return;
            }
            if (!event.target.files[0].type.match("image.*") && !event.target.files[0].type.match("video.*")) {
                console.log("not image file", event.target.files[0].type);
                return;
            }
            console.log(event.target.files[0]);
            const reader = new FileReader();
            reader.onload = () => {
                // console.log("read image", reader.result);
                props.onInputSourceChanged(reader.result as string);
            };
            reader.readAsDataURL(event.target.files[0]);
        };
        fileInput.click();
    };

    const chooseWindowClicked = () => {
        navigator.mediaDevices.getDisplayMedia().then((media) => {
            props.onInputSourceChanged(media);
        });
    };

    return (
        <div>
            <CommonSelector {...commonSelectorProps}></CommonSelector>
            {props.currentValue === "File" ? (
                <div style={{ display: "flex" }}>
                    <button
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                            loadFileClicked();
                        }}
                    >
                        Load File
                    </button>
                </div>
            ) : (
                <></>
            )}
            {props.currentValue === "Window" ? (
                <div style={{ display: "flex" }}>
                    <button
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                            chooseWindowClicked();
                        }}
                    >
                        Choose Window
                    </button>
                </div>
            ) : (
                <></>
            )}

            {videoDevices.find((x) => {
                return x.deviceId === props.currentValue;
            }) && props.cameraResolutions ? (
                <div style={{ display: "flex" }}>{cameraResolutionButtons}</div>
            ) : (
                <></>
            )}
            {props.currentValue === "Sample" ? <div style={{ display: "flex" }}>{sampleFileButtons}</div> : <></>}

            <input type="file" id={`${props.id}-file-input`} hidden></input>
        </div>
    );
};
