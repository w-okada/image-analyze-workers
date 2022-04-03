import { useEffect, useState } from "react";
import { useDeviceManager } from "./useDeviceManager";

export type DeviceStateAndMethodProps = {
    defaultAudioInputDeviceIndex: number; // if minus value is passed, use null
    defaultVideoInputDeviceIndex: number;
    defaultAudioOutputDeviceIndex: number;
};

export type DeviceStateAndMethod = {
    audioInputEnabled: boolean;
    videoInputEnabled: boolean;
    audioOutputEnabled: boolean;

    audioInputDevice: string | null;
    videoInputDevice: string | null;
    audioOutputDevice: string | null;

    setAudioInputEnable: () => void;
    setVideoInputEnable: () => void;
    setAudioOutputEnable: () => void;
    setAudioInputDisable: () => void;
    setVideoInputDisable: () => void;
    setAudioOutputDisable: () => void;
    setAudioInputDevice: (device: string | null) => void;
    setVideoInputDevice: (device: string | null) => void;
    setAudioOutputDevice: (device: string | null) => void;

    defaultDeviceLoaded: boolean;

    reloadDevices: () => void;
    audioInputDevices: MediaDeviceInfo[];
    videoInputDevices: MediaDeviceInfo[];
    audioOutputDevices: MediaDeviceInfo[];
};

export const useDeviceState = (props: DeviceStateAndMethodProps): DeviceStateAndMethod => {
    const [audioInputEnabled, setAudioInputEnabled] = useState(false);
    const [videoInputEnabled, setVideoInputEnabled] = useState(false);
    const [audioOutputEnabled, setAudioOutputEnabled] = useState(true);

    const [audioInputDevice, _setAudioInputDevice] = useState<string | null | undefined>();
    const [videoInputDevice, _setVideoInputDevice] = useState<string | null | undefined>();
    const [audioOutputDevice, _setAudioOutputDevice] = useState<string | null | undefined>();

    const setAudioInputDevice = (dev: string | null) => {
        _setAudioInputDevice(dev);
        localStorage.audioInputDevice = dev;
    };
    const setVideoInputDevice = (dev: string | null) => {
        _setVideoInputDevice(dev);
        localStorage.videoInputDevice = dev;
    };
    const setAudioOutputDevice = (dev: string | null) => {
        _setAudioOutputDevice(dev);
        localStorage.audioOutputDevice = dev;
    };

    const [defaultDeviceLoaded, setDefaultDeviceLoaded] = useState(false);

    const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);

    useEffect(() => {
        const setDefaultDevices = async () => {
            const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            media.getTracks().forEach((x) => {
                x.stop();
            });

            const { getAudioInputDevices, getVideoInputDevices, getAudioOutputDevices } = useDeviceManager();
            const audioInputDevices = await getAudioInputDevices();
            const videoInputDevices = await getVideoInputDevices();
            const audioOutputDevices = await getAudioOutputDevices();

            // eslint-disable-next-line no-prototype-builtins
            if (localStorage.hasOwnProperty("audioInputDevice")) {
                if (localStorage.audioInputDevice === "null") {
                    setAudioInputDevice(null);
                } else if (
                    audioInputDevices.some((x) => {
                        return x.deviceId === localStorage.audioInputDevice;
                    })
                ) {
                    setAudioInputDevice(localStorage.audioInputDevice);
                } else {
                    setAudioInputDevice(null);
                }

                setAudioInputDevice(localStorage.audioInputDevice || null);
            } else if (props.defaultAudioInputDeviceIndex !== undefined && props.defaultAudioInputDeviceIndex >= 0) {
                setAudioInputDevice(audioInputDevices[props.defaultAudioInputDeviceIndex].deviceId || null);
            } else {
                setAudioInputDevice(null);
            }

            // eslint-disable-next-line no-prototype-builtins
            if (localStorage.hasOwnProperty("videoInputDevice")) {
                if (localStorage.videoInputDevice === "null") {
                    setVideoInputDevice(null);
                } else if (
                    videoInputDevices.some((x) => {
                        return x.deviceId === localStorage.videoInputDevice;
                    })
                ) {
                    setVideoInputDevice(localStorage.videoInputDevice);
                } else {
                    setVideoInputDevice(null);
                }
            } else if (props.defaultVideoInputDeviceIndex !== undefined && props.defaultVideoInputDeviceIndex >= 0) {
                setVideoInputDevice(videoInputDevices[props.defaultVideoInputDeviceIndex].deviceId || null);
            } else {
                setVideoInputDevice(null);
            }

            // eslint-disable-next-line no-prototype-builtins
            if (localStorage.hasOwnProperty("audioOutputDevice")) {
                if (localStorage.audioOutputDevice === "null") {
                    setAudioOutputDevice(null);
                } else if (
                    audioOutputDevices.some((x) => {
                        return x.deviceId === localStorage.audioOutputDevice;
                    })
                ) {
                    setAudioOutputDevice(localStorage.audioOutputDevice);
                } else {
                    setAudioOutputDevice(null);
                }
            } else if (props.defaultAudioOutputDeviceIndex !== undefined && props.defaultAudioOutputDeviceIndex >= 0) {
                setAudioOutputDevice(audioOutputDevices[props.defaultAudioOutputDeviceIndex].deviceId || null);
            } else {
                setAudioOutputDevice(null);
            }
            setAudioInputDevices(audioInputDevices);
            setVideoInputDevices(videoInputDevices);
            setAudioOutputDevices(audioOutputDevices);
        };
        setDefaultDevices();
    }, []);

    useEffect(() => {
        if (audioInputDevice !== undefined && videoInputDevice !== undefined && audioOutputDevice !== undefined && defaultDeviceLoaded === false) {
            // console.log(`Default Dvice Loaded:`, audioInputDevice, videoInputDevice, audioOutputDevice);
            setDefaultDeviceLoaded(true);
        }
    }, [audioInputDevice, videoInputDevice, audioOutputDevice]);

    const reloadDevices = () => {
        const reloadDevices = async () => {
            const { getAudioInputDevices, getVideoInputDevices, getAudioOutputDevices } = useDeviceManager();
            const audioInputDevices = await getAudioInputDevices();
            const videoInputDevices = await getVideoInputDevices();
            const audioOutputDevices = await getAudioOutputDevices();
            setAudioInputDevices(audioInputDevices);
            setVideoInputDevices(videoInputDevices);
            setAudioOutputDevices(audioOutputDevices);
        };
        reloadDevices();
    };

    return {
        audioInputEnabled,
        videoInputEnabled,
        audioOutputEnabled,
        audioInputDevice: audioInputDevice === undefined ? null : audioInputDevice,
        videoInputDevice: videoInputDevice === undefined ? null : videoInputDevice,
        audioOutputDevice: audioOutputDevice === undefined ? null : audioOutputDevice,
        defaultDeviceLoaded,
        setAudioInputEnable: () => {
            setAudioInputEnabled(true);
        },
        setVideoInputEnable: () => {
            setVideoInputEnabled(true);
        },
        setAudioOutputEnable: () => {
            setAudioOutputEnabled(true);
        },
        setAudioInputDisable: () => {
            setAudioInputEnabled(false);
        },
        setVideoInputDisable: () => {
            setVideoInputEnabled(false);
        },
        setAudioOutputDisable: () => {
            setAudioOutputEnabled(false);
        },
        setAudioInputDevice,
        setVideoInputDevice,
        setAudioOutputDevice,

        audioInputDevices,
        videoInputDevices,
        audioOutputDevices,
        reloadDevices,
    };
};
