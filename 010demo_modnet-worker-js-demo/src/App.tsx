import React, { useEffect, useState } from 'react';
import './App.css';
import { makeStyles } from '@material-ui/core';
import { DropDown, FileChooser, Toggle, VideoInputSelect } from './components/components';
import { VideoInputType } from './const';
import { useVideoInputList } from './hooks/useVideoInputList';
import { generateDefaultMODNetParams, generateMODNetDefaultConfig, MODNetWorkerManager, MODNetConfig, MODNetOperationParams } from '@dannadori/modnet-worker-js';

let GlobalLoopID: number = 0

const models: { [name: string]: string } = {
    "webcam_128_16": `${process.env.PUBLIC_URL}/webcam_128_16/model.json`,
    "webcam_128_32": `${process.env.PUBLIC_URL}/webcam_128_32/model.json`,
    "webcam_192_16": `${process.env.PUBLIC_URL}/webcam_192_16/model.json`,
    "webcam_192_32": `${process.env.PUBLIC_URL}/webcam_192_32/model.json`,
    "webcam_256_16": `${process.env.PUBLIC_URL}/webcam_256_16/model.json`,
    "webcam_256_32": `${process.env.PUBLIC_URL}/webcam_256_32/model.json`,
    "webcam_512_16": `${process.env.PUBLIC_URL}/webcam_512_16/model.json`,
    "webcam_512_32": `${process.env.PUBLIC_URL}/webcam_512_32/model.json`,

    "portrait_128_16": `${process.env.PUBLIC_URL}/portrait_128_16/model.json`,
    "portrait_128_32": `${process.env.PUBLIC_URL}/portrait_128_32/model.json`,
    "portrait_192_16": `${process.env.PUBLIC_URL}/portrait_192_16/model.json`,
    "portrait_192_32": `${process.env.PUBLIC_URL}/portrait_192_32/model.json`,
    "portrait_256_16": `${process.env.PUBLIC_URL}/portrait_256_16/model.json`,
    "portrait_256_32": `${process.env.PUBLIC_URL}/portrait_256_32/model.json`,
    "portrait_512_16": `${process.env.PUBLIC_URL}/portrait_512_16/model.json`,
    "portrait_512_32": `${process.env.PUBLIC_URL}/portrait_512_32/model.json`,
}

const processSize: { [name: string]: number[] } = {
    "webcam_128_16": [128, 128],
    "webcam_128_32": [128, 128],
    "webcam_192_16": [192, 192],
    "webcam_192_32": [192, 192],
    "webcam_256_16": [256, 256],
    "webcam_256_32": [256, 256],
    "webcam_512_16": [512, 512],
    "webcam_512_32": [512, 512],

    "portrait_128_16": [128, 128],
    "portrait_128_32": [128, 128],
    "portrait_192_16": [192, 192],
    "portrait_192_32": [192, 192],
    "portrait_256_16": [256, 256],
    "portrait_256_32": [256, 256],
    "portrait_512_16": [512, 512],
    "portrait_512_32": [512, 512],
}


const useStyles = makeStyles((theme) => ({
    inputView: {
        maxWidth: 512
    }
}));

interface WorkerProps {
    manager: MODNetWorkerManager
    config: MODNetConfig
    params: MODNetOperationParams
    count: number
}
interface InputMedia {
    mediaType: VideoInputType
    media: MediaStream | string
}

const App = () => {
    const classes = useStyles();
    const { videoInputList } = useVideoInputList()
    const [workerProps, setWorkerProps] = useState<WorkerProps>()

    const [modelKey, setModelKey] = useState(Object.keys(models)[0])
    const [onLocal, setOnLocal] = useState(false)
    const [strict, setStrict] = useState(false)

    const [inputMedia, setInputMedia] = useState<InputMedia>({ mediaType: "IMAGE", media: "yuka_kawamura.jpg" })
    const inputChange = (mediaType: VideoInputType, input: MediaStream | string) => {
        setInputMedia({ mediaType: mediaType, media: input })
    }

    const backgroundChange = (mediaType: VideoInputType, input: string) => {
        console.log("background:", mediaType, input)
        if (mediaType === "IMAGE") {
            const img = document.getElementById("background") as HTMLImageElement
            img.src = input
        }
    }
    ///////////////////////////
    /// プロパティ設定      ///
    ///////////////////////////
    //// モデル切り替え
    useEffect(() => {
        const init = async () => {
            const m = workerProps ? workerProps.manager : new MODNetWorkerManager()
            const count = workerProps ? workerProps.count + 1 : 0
            const c = generateMODNetDefaultConfig()
            c.processOnLocal = onLocal
            c.modelPath = models[modelKey]
            console.log("NEW MODE LOAD1")
            await m.init(c)
            console.log("NEW MODE LOAD2")

            const p = generateDefaultMODNetParams()
            p.processWidth = processSize[modelKey][0]
            p.processHeight = processSize[modelKey][1]
            const newProps = { manager: m, config: c, params: p, count: count }
            setWorkerProps(newProps)
        }
        init()
    }, [modelKey, onLocal]) // eslint-disable-line

    //// パラメータ変更
    useEffect(() => {
        // if (!workerProps) {
        //     return
        // }
        // const p = generateDefaultMODNetParams()
        // p.processWidth = processSize[modelKey][0]
        // p.processHeight = processSize[modelKey][1]
        // setWorkerProps({ ...workerProps, params: p })
    }, [])


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
        console.log("[Pipeline] Start", workerProps)
        let renderRequestId: number
        const LOOP_ID = performance.now()
        GlobalLoopID = LOOP_ID

        const render = async () => {
            // console.log("RENDER::::", LOOP_ID,  workerProps?.params)
            const start = performance.now()

            if (workerProps) {
                const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
                const background = document.getElementById("background") as HTMLImageElement
                const dst = document.getElementById("output") as HTMLCanvasElement
                const tmp = document.getElementById("tmp") as HTMLCanvasElement
                const front = document.getElementById("front") as HTMLCanvasElement
                const srcCache = document.getElementById("src-cache") as HTMLCanvasElement

                let prediction
                const inference_start = performance.now()
                srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height)
                prediction = await workerProps.manager.predict(srcCache!, workerProps.params)
                const inference_end = performance.now()
                const info1 = document.getElementById("info") as HTMLCanvasElement
                info1.innerText = `processing time: ${inference_end - inference_start}`

                // 結果からマスク作成
                const res = new ImageData(workerProps.params.processWidth, workerProps.params.processHeight)
                try {
                    for (let i = 0; i < workerProps.params.processHeight; i++) {
                        for (let j = 0; j < workerProps.params.processWidth; j++) {
                            const offset = i * workerProps.params.processWidth + j
                            res.data[offset * 4 + 0] = 0
                            res.data[offset * 4 + 1] = 0
                            res.data[offset * 4 + 2] = 0
                            res.data[offset * 4 + 3] = prediction![i][j] * 255
                        }
                    }
                } catch {

                }
                tmp.width = workerProps.params.processWidth
                tmp.height = workerProps.params.processHeight
                tmp.getContext("2d")!.clearRect(0, 0, tmp.width, tmp.height)
                tmp.getContext("2d")!.putImageData(res, 0, 0)

                dst.getContext("2d")!.clearRect(0, 0, dst.width, dst.height)
                dst.getContext("2d")!.drawImage(background, 0, 0, dst.width, dst.height)

                front.getContext("2d")!.clearRect(0, 0, front.width, front.height)
                front.getContext("2d")!.drawImage(tmp, 0, 0, front.width, front.height)
                front.getContext("2d")!.globalCompositeOperation = "source-atop";
                front.getContext("2d")!.drawImage(srcCache, 0, 0, front.width, front.height)
                front.getContext("2d")!.globalCompositeOperation = "source-over";
                dst.getContext("2d")!.drawImage(front, 0, 0, dst.width, dst.height)

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
    }, [workerProps, strict])




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
                    <DropDown title="model" current={modelKey} onchange={setModelKey} options={models} />
                    <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />
                    <Toggle title="Strict" current={strict} onchange={setStrict} />
                    <FileChooser title="background" onchange={backgroundChange} />
                    <div >
                        <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
                    </div>
                </div>
            </div>

            <div style={{ display: "flex" }}>
                <canvas className={classes.inputView} id="tmp" hidden></canvas>
                <canvas className={classes.inputView} id="front" hidden></canvas>
                <canvas className={classes.inputView} id="src-cache" hidden></canvas>
                <img className={classes.inputView} id="background" alt="background" src="img/north-star-2869817_640.jpg" hidden></img>

            </div>
            <div >
                <div id="info"> </div>
                <div id="info2"> </div>
            </div>
        </div>
    );
}

export default App;
