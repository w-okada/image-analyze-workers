import React, { useEffect, useMemo, useState } from "react";
import { useDeviceManager } from "../hooks/useDeviceManager";
import { CommonSelector, CommonSelectorProps } from "./CommonSelector";
import "../css/CSS.css";

export type VideoInputSelectorProps = {
    id: string;
    currentValue: string;
    onInputSourceTypeChanged: (value: string) => void;
    onInputSourceChanged: (value: MediaStream | string) => void;
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
        if (props.currentValue === "File" || props.currentValue === "Window") {
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
        return p;
    }, [videoDevices, props.currentValue]);

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
            if (!event.target.files[0].type.match("image.*") && !event.target.files[0].type.match("movie.*")) {
                console.log("not image file", event.target.files[0].type);
                return;
            }
            console.log(event.target.files[0]);
            const reader = new FileReader();
            reader.onload = () => {
                console.log("read image", reader.result);
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

            <></>

            <input type="file" id={`${props.id}-file-input`} hidden></input>
        </div>
    );
};
