export const useDeviceManager = () => {
    const getAudioInputDevices = async () => {
        const mediaDeviceInfos = await navigator.mediaDevices.enumerateDevices();
        return mediaDeviceInfos.filter((x) => {
            return x.kind === "audioinput";
        });
    };

    const getVideoInputDevices = async () => {
        const mediaDeviceInfos = await navigator.mediaDevices.enumerateDevices();
        return mediaDeviceInfos.filter((x) => {
            return x.kind === "videoinput";
        });
    };

    const getAudioOutputDevices = async () => {
        const mediaDeviceInfos = await navigator.mediaDevices.enumerateDevices();
        return mediaDeviceInfos.filter((x) => {
            return x.kind === "audiooutput";
        });
    };
    return { getAudioInputDevices, getVideoInputDevices, getAudioOutputDevices };
};
