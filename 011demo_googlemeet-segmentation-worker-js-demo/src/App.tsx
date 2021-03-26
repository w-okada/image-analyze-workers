import React, { useEffect, useState } from 'react';
import './App.css';
import { generateDefaultGoogleMeetSegmentationParams, generateGoogleMeetSegmentationDefaultConfig, GoogleMeetSegmentationWorkerManager } from "@dannadori/googlemeet-segmentation-worker-js"
import { makeStyles } from '@material-ui/core';
import { DropDown, FileChooser, SingleValueSlider, Toggle, VideoInputSelect } from './components/components';
import { VideoInputType } from './const';
import { useVideoInputList } from './hooks/useVideoInputList';
import { worker } from 'cluster';
import { GoogleMeetSegmentationConfig, GoogleMeetSegmentationOperationParams } from '@dannadori/googlemeet-segmentation-worker-js/dist/const';

const models: { [name: string]: string } = {
    "seg128x128_32"    : `${process.env.PUBLIC_URL}/googlemeet-segmentation_128_32/model.json`,
    "seg128x128_16"   : `${process.env.PUBLIC_URL}/googlemeet-segmentation_128_16/model.json`,
    "seg144x256_32"  : `${process.env.PUBLIC_URL}/googlemeet-segmentation_144_32/model.json`,
    "seg144x256_16"  : `${process.env.PUBLIC_URL}/googlemeet-segmentation_144_16/model.json`,
    "seg96x160_32"  : `${process.env.PUBLIC_URL}/googlemeet-segmentation_96_32/model.json`,
    "seg96x160_16"   : `${process.env.PUBLIC_URL}/googlemeet-segmentation_96_16/model.json`,
}

const processSize: { [name: string]: number[] } = {
    "seg128x128_32": [128, 128],
    "seg128x128_16": [128, 128],
    "seg96x160_32": [160, 96],
    "seg96x160_16": [160, 96],
    "seg144x256_32": [256, 144],
    "seg144x256_16": [256, 144],
}

const JBFSize:{ [name: string]: number[] } = {
    "128x128": [128, 128],
    "96x168" : [96,  168],
    "144x256": [144, 256],
    "256x256": [256, 256],
    "300x300": [300, 300],
    "512x512": [512, 512],
}

const useStyles = makeStyles((theme) => ({
    inputView:{
        maxWidth:512
    }
}));

interface WorkerProps {
    manager: GoogleMeetSegmentationWorkerManager
    config : GoogleMeetSegmentationConfig
    params : GoogleMeetSegmentationOperationParams
    count  : number
}
interface InputMedia{
    mediaType : VideoInputType
    media     : MediaStream|string
}

const App = () => {
    const classes = useStyles();
    const { videoInputList } = useVideoInputList()
    const [workerProps, setWorkerProps] = useState<WorkerProps>()

    const [ modelKey, setModelKey ]            = useState(Object.keys(models)[0])
    const [ JBFSizeKey, setJBFSizeKey]         = useState(Object.keys(JBFSize)[0])
    const [ kernelSize, setKernelSize]         = useState(1)
    const [ kernelR, setKernelR]               = useState(1)
    const [ useSIMD, setUseSIMD]               = useState(true)
    const [ onLocal, setOnLocal]               = useState(true)
    const [ lwBlur, setlwBlur]                 = useState(2)
    const [ strict, setStrict]                 = useState(false)

    const [inputMedia, setInputMedia] = useState<InputMedia>({mediaType:"IMAGE", media:"yuka_kawamura.jpg"})
    const inputChange = (mediaType: VideoInputType, input:MediaStream|string) =>{
        setInputMedia({mediaType:mediaType, media:input})
    }

    const backgroundChange = (mediaType: VideoInputType, input:string) =>{
        console.log("background:", mediaType, input)
        if(mediaType==="IMAGE"){
            const img = document.getElementById("background") as HTMLImageElement
            img.src = input
        }
    }
    ///////////////////////////
    /// プロパティ設定      ///
    ///////////////////////////
    //// モデル切り替え
    useEffect(()=>{
        const init = async () =>{
            const m = workerProps? workerProps.manager : new GoogleMeetSegmentationWorkerManager()
            const count = workerProps? workerProps.count + 1: 0
            const c = generateGoogleMeetSegmentationDefaultConfig()
            c.processOnLocal = onLocal
            c.modelPath = models[modelKey]
            console.log("NEW MODE LOAD1")
            await m.init(c)
            console.log("NEW MODE LOAD2")
    
            const p = generateDefaultGoogleMeetSegmentationParams()
            p.processWidth  = processSize[modelKey][0]
            p.processHeight = processSize[modelKey][1]
            p.smoothingS    = kernelSize
            p.smoothingR    = kernelR
            p.jbfWidth      = JBFSize[JBFSizeKey][0]
            p.jbfHeight     = JBFSize[JBFSizeKey][1]
            const newProps = {manager:m, config:c, params:p, count:count}
            setWorkerProps(newProps)
        }
        init()
    }, [modelKey, onLocal])

    //// パラメータ変更
    useEffect(()=>{
        if(!workerProps){
            return
        }
        const p = generateDefaultGoogleMeetSegmentationParams()
        p.processWidth  = processSize[modelKey][0]
        p.processHeight = processSize[modelKey][1]
        p.smoothingS    = kernelSize
        p.smoothingR    = kernelR
        p.jbfWidth      = JBFSize[JBFSizeKey][0]
        p.jbfHeight     = JBFSize[JBFSizeKey][1]
    setWorkerProps({...workerProps, params:p})
    }, [kernelSize, kernelR, JBFSizeKey])


    /// input設定
    useEffect(()=>{
        const video = document.getElementById("input_video") as HTMLVideoElement
        if(inputMedia.mediaType === "IMAGE"){
            const img = document.getElementById("input_img") as HTMLImageElement
            img.onloadeddata = () =>{
                resizeDst(img)
            }
            img.src = inputMedia.media as string
        }else if(inputMedia.mediaType === "MOVIE"){
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject=null
            vid.src = inputMedia.media as string
            vid.loop = true
            vid.onloadeddata = () =>{
                video.play()
                resizeDst(vid)
            }
        }else{
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject = inputMedia.media as MediaStream
            vid.onloadeddata = () =>{
                video.play()
                resizeDst(vid)
            }
        }
    },[inputMedia])

    /// resize
    useEffect(()=>{
        const input = document.getElementById("input_img") || document.getElementById("input_video")
        resizeDst(input!)
    })

    //////////////
    ///// util  //
    //////////////
    const resizeDst = (input:HTMLElement) =>{
        const cs = getComputedStyle(input)
        const width = parseInt(cs.getPropertyValue("width"))
        const height = parseInt(cs.getPropertyValue("height"))
        const dst = document.getElementById("output") as HTMLCanvasElement
        const tmp = document.getElementById("tmp") as HTMLCanvasElement
        const front = document.getElementById("front") as HTMLCanvasElement
        const srcCache = document.getElementById("src-cache") as HTMLCanvasElement
        
        [dst, tmp, front, srcCache].forEach((c)=>{
            c.width = width
            c.height = height
        })
    }

    //////////////////
    //  pipeline    //
    //////////////////
    useEffect(()=>{
        console.log("[Pipeline] Start", workerProps)
        let renderRequestId: number
        const LOOP_ID = performance.now()
        let counter = 0
        let fps_start = performance.now()

        const render = async () => {
            // console.log("RENDER::::", LOOP_ID,  workerProps?.params)
            const start = performance.now()

            if(workerProps){
                const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
                const background = document.getElementById("background") as HTMLImageElement
                const dst = document.getElementById("output") as HTMLCanvasElement
                const tmp = document.getElementById("tmp") as HTMLCanvasElement
                const front = document.getElementById("front") as HTMLCanvasElement
                const srcCache = document.getElementById("src-cache") as HTMLCanvasElement

                let prediction
                if(strict){
                    srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height)
                    prediction = await workerProps.manager.predict(srcCache!, workerProps.params)
                }else{
                    srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height)
                    prediction = await workerProps.manager.predict(srcCache!, workerProps.params)
                  // prediction = await workerProps.manager.predict(src!, workerProps.params)
                }


                // 結果からマスク作成
                const res = new ImageData(workerProps.params.jbfWidth, workerProps.params.jbfHeight)
                try{
                    for(let i = 0;i < workerProps.params.jbfHeight; i++){
                        for(let j = 0;j < workerProps.params.jbfWidth; j++){
                            const offset = i * workerProps.params.jbfWidth + j
                            res.data[offset * 4 + 0] = 255
                            res.data[offset * 4 + 1] = 255
                            res.data[offset * 4 + 2] = 255
                            res.data[offset * 4 + 3] = 255 - prediction![i][j] * 255
                        }
                    }
                }catch{

                }
                // console.log("res;data;", res.data)

                tmp.width  = workerProps.params.jbfWidth
                tmp.height = workerProps.params.jbfHeight
                tmp.getContext("2d")!.putImageData(res, 0, 0)

                // 前景の透過処理
                const frontCtx = front.getContext("2d")!
                frontCtx.clearRect(0, 0, front.width, front.height)
                frontCtx.drawImage(tmp, 0, 0, front.width, front.height)
                frontCtx.globalCompositeOperation = "source-atop";
                if(strict){
                    frontCtx.drawImage(srcCache, 0, 0,  front.width, front.height)
                }else{
                    frontCtx.drawImage(src, 0, 0,  front.width, front.height)
                }
                frontCtx.globalCompositeOperation = "source-over";       

                // 最終書き込み
                const dstCtx = dst.getContext("2d")!
                //// クリア or 背景描画
                dstCtx.fillRect(0,0,dst.width,dst.height)
                dstCtx.drawImage(background, 0, 0, dst.width, dst.height)

                //// light Wrapping
                dstCtx.filter = `blur(${lwBlur}px)`;
                dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height)
                dstCtx.filter = 'none';

                // 前景書き込み                
                dstCtx.drawImage(front, 0, 0, dst.width, dst.height)

                const end = performance.now()
                const info = document.getElementById("info") as HTMLCanvasElement
                info.innerText = `processing time: ${end-start}`
                
                counter += 1
                if(counter === 100){
                    const fps_end = performance.now()
                    const fps = (100 * 1000) / (fps_end - fps_start)
                    const info2 = document.getElementById("info2") as HTMLCanvasElement
                    info2.innerText = `fps: ${fps}`

                    counter = 0
                    fps_start = performance.now()
    
                }

                // if(counter < 30){
                //   console.log("RENDER!!!!!!!!!!!!")
                    renderRequestId = requestAnimationFrame(render)
                // }
            }
        }
        render()
        return ()=>{
            cancelAnimationFrame(renderRequestId)
        }
    }, [workerProps, strict, lwBlur])




    /////////////
    // render  //
    /////////////
    return (
        <div>
            <div style={{display:"flex"}}>
                <div style={{display:"flex"}}>
                    {inputMedia.mediaType === "IMAGE" ? 
                        <img  className={classes.inputView} id="input_img"></img>
                        :
                        <video  className={classes.inputView} id="input_video"></video>
                    }
                    <canvas className={classes.inputView} id="output"></canvas>
                </div>
                <div>
                    <VideoInputSelect  title="input"         current={""}             onchange={inputChange}     options={videoInputList}/>
                    <DropDown          title="model"         current={modelKey}       onchange={setModelKey}     options={models} />
                    <DropDown          title="JBFSize"       current={JBFSizeKey}     onchange={setJBFSizeKey}     options={JBFSize} />
                    <SingleValueSlider title="KernelSize"    current={kernelSize}     onchange={setKernelSize} min={0} max={9} step={1} />                
                    {/* <SingleValueSlider title="KernelR"       current={kernelR}        onchange={setKernelR} min={0} max={9} step={1} />                 */}
                    <Toggle            title="onLocal"       current={onLocal}        onchange={setOnLocal} />
                    <SingleValueSlider title="LWB"           current={lwBlur}         onchange={setlwBlur} min={0} max={20} step={1} />
                    {/* <Toggle            title="SIMD"          current={useSIMD}        onchange={setUseSIMD} /> */}
                    <Toggle            title="Strict"        current={strict}         onchange={setStrict} />
                    <FileChooser       title="background"  onchange={backgroundChange} />
                </div>
            </div>

            <div style={{display:"flex"}}>
                <canvas className={classes.inputView} id="tmp" hidden></canvas>
                <canvas className={classes.inputView} id="front" hidden></canvas>
                <canvas className={classes.inputView} id="src-cache" hidden></canvas>
                <img className={classes.inputView} id="background" src="img/north-star-2869817_640.jpg" hidden></img>

            </div>
            <div >
                <div id="info"> </div>
                <div id="info2"> </div>
            </div>
        </div>
        );
}

export default App;
