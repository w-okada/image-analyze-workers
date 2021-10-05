import { useEffect, useState } from "react"



export const useVideoInputList = () =>{
    const [videoInputList, setVideoInputList] = useState<{[id:string]:string}>({})
    useEffect(()=>{
        const videoInputDevices:{[id:string]:string} = {}
        navigator.mediaDevices.enumerateDevices().then(list=>{
            list.filter((x: MediaDeviceInfo) => {
                return x.kind === "videoinput"
            }).forEach(x =>{
                videoInputDevices[x.label]=x.deviceId
            })
            // videoInputDevices["file"] = "file"
            // videoInputDevices["window"] = "window"

            setVideoInputList(videoInputDevices)
        })
    },[])
    return {videoInputList}
}