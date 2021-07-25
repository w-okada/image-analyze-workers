import React, { useEffect, useState } from 'react';
import './App.css';
import { makeStyles } from '@material-ui/core';
import {  FileChooser, Toggle, VideoInputSelect } from './components/components';
import { VideoInputType } from './const';
import { useVideoInputList } from './hooks/useVideoInputList';
import { FaceSwap}  from '@dannadori/faceswap-js/dist/faceswap-js'


let GlobalLoopID: number = 0

const useStyles = makeStyles((theme) => ({
    inputView: {
        maxWidth: 512
    }
}));

interface InputMedia {
    mediaType: VideoInputType
    media: MediaStream | string
}

const App = () => {
    const classes = useStyles();
    const { videoInputList } = useVideoInputList()
    const [ onLocal, setOnLocal] = useState(true)
    const [ strict, setStrict] = useState(false)
    const [ faceSwap, setFaceSwap] = useState<FaceSwap>()
    const [ mask, setMask] = useState<string>()
    const [ drawPerson, setDrawPerson] = useState(false)


    useEffect(()=>{
        const f = new FaceSwap(320,320)
        f.init(onLocal).then(()=>{
            setFaceSwap(f)
        })
    },[]) // eslint-disable-line

    const [inputMedia, setInputMedia] = useState<InputMedia>({ mediaType: "IMAGE", media: "yuka_kawamura.jpg" })
    const inputChange = (mediaType: VideoInputType, input: MediaStream | string) => {
        setInputMedia({ mediaType: mediaType, media: input })
    }

    const maskChange = (fileType: VideoInputType, input: string) =>{
        console.log("MASK CHANGE!!!")
        if(fileType === "IMAGE"){
            setMask(input)
        }else{
            console.log("not image", fileType)
        }
    }
    ///////////////////////////
    /// プロパティ設定      ///
    ///////////////////////////

    /// input設定
    useEffect(() => {
        const video = document.getElementById("input_video") as HTMLVideoElement
        if (inputMedia.mediaType === "IMAGE") {
            const img = document.getElementById("input_img") as HTMLImageElement
            img.onloadeddata = () => {
                resizeDst(img)
            }
            img.src = inputMedia.media as string
        } else if (inputMedia.mediaType === "MOVIE") {
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject = null
            vid.src = inputMedia.media as string
            vid.loop = true
            vid.onloadeddata = () => {
                video.play()
                resizeDst(vid)
            }
        } else {
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject = inputMedia.media as MediaStream
            vid.onloadeddata = () => {
                video.play()
                resizeDst(vid)
            }
        }
    }, [inputMedia])

    useEffect(()=>{
        if(!mask){
            return
        }
        const img = document.getElementById("mask") as HTMLImageElement
        img.onload = (ev) =>{
            console.log("MASK CHANGE!!! IMAGE1--------------------------")
            const canvas = document.createElement("canvas")
            canvas.width = img.width
            canvas.height = img.height
            canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
            faceSwap!.setMaskImage(canvas, 320, 320)
        }
        img.src = mask!

    },[mask]) // eslint-disable-line

    useEffect(()=>{
        if(faceSwap){
            faceSwap.init(onLocal)
        }

    },[onLocal]) // eslint-disable-line

    /// resize
    useEffect(() => {
        const input = document.getElementById("input_img") || document.getElementById("input_video")
        resizeDst(input!)
    })

    //////////////
    ///// util  //
    //////////////
    const resizeDst = (input: HTMLElement) => {
        const cs = getComputedStyle(input)
        const width = parseInt(cs.getPropertyValue("width"))
        const height = parseInt(cs.getPropertyValue("height"))
        const dst = document.getElementById("output") as HTMLCanvasElement
        const tmp = document.getElementById("tmp") as HTMLCanvasElement
        const front = document.getElementById("front") as HTMLCanvasElement
        const srcCache = document.getElementById("src-cache") as HTMLCanvasElement

        [dst, tmp, front, srcCache].forEach((c) => {
            c.width = width
            c.height = height
        })
    }

    //////////////////
    //  pipeline    //
    //////////////////
    useEffect(() => {
        console.log("[Pipeline] Start")
        let renderRequestId: number
        const LOOP_ID = performance.now()
        GlobalLoopID = LOOP_ID

        const render = async () => {
            // console.log("RENDER::::", LOOP_ID,  workerProps?.params)
            const start = performance.now()

            if (faceSwap) {
                const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
                const dst = document.getElementById("output") as HTMLCanvasElement
                const srcCache = document.getElementById("src-cache") as HTMLCanvasElement

                srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height)
                const swapped = await faceSwap.swapFace(srcCache, 320, 320)
                dst.getContext("2d")!.clearRect(0, 0, dst.width, dst.height)
                if(drawPerson){
                    dst.getContext("2d")!.drawImage(srcCache, 0, 0, dst.width, dst.height)
                }
                dst.getContext("2d")!.drawImage(swapped, 0, 0, dst.width, dst.height)

                if (GlobalLoopID === LOOP_ID) {
                    renderRequestId = requestAnimationFrame(render)
                }
            }
            const end = performance.now()
            const info2 = document.getElementById("info2") as HTMLCanvasElement
            info2.innerText = `processing time: ${end - start}`
        }
        render()
        return () => {
            cancelAnimationFrame(renderRequestId)
        }
    }, [faceSwap, strict, drawPerson])




    /////////////
    // render  //
    /////////////
    return (
        <div>
            <div style={{ display: "flex" }}>
                <div style={{ display: "flex" }}>
                    {inputMedia.mediaType === "IMAGE" ?
                        <img className={classes.inputView} alt="input_img" id="input_img"></img>
                        :
                        <video className={classes.inputView} id="input_video"></video>
                    }
                    <canvas className={classes.inputView} id="output"></canvas>
                </div>
                <div>
                    <VideoInputSelect title="input" current={""} onchange={inputChange} options={videoInputList} />
                    <FileChooser title="mask" onchange={maskChange} />
                    <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />
                    <Toggle title="Strict" current={strict} onchange={setStrict} />
                    <Toggle title="drawPerson" current={drawPerson} onchange={setDrawPerson} />

                </div>
            </div>

            <div style={{ display: "flex" }}>
                <canvas className={classes.inputView} id="tmp" hidden></canvas>
                <canvas className={classes.inputView} id="front" hidden></canvas>
                <canvas className={classes.inputView} id="src-cache" hidden></canvas>
                <img className={classes.inputView} alt="mask" id="mask"></img>

            </div>
            <div >
                <div id="info"> </div>
                <div id="info2"> </div>
            </div>
        </div>
    );
    // return (<></>)
}

export default App;
