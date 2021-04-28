import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { generateDefaultGoogleMeetSegmentationTFLiteParams, generateGoogleMeetSegmentationTFLiteDefaultConfig, GoogleMeetSegmentationTFLiteWorkerManager } from "@dannadori/googlemeet-segmentation-tflite-worker-js"
import { makeStyles } from '@material-ui/core';
import { GoogleMeetSegmentationTFLiteConfig, GoogleMeetSegmentationTFLiteOperationParams } from '@dannadori/googlemeet-segmentation-tflite-worker-js/dist/const';
import { DropDown, SingleValueSlider, Toggle, VideoInputSelect } from './components/components';
import { VideoInputType } from './const';
import { useVideoInputList } from './hooks/useVideoInputList';
import { worker } from 'cluster';

let GlobalLoopID:number = 0

const models: { [name: string]: string } = {
    "[96x160]_original"    : `${process.env.PUBLIC_URL}/models/96x160/segm_lite_v681.tflite`,
    "[96x160]_pinto_f32"   : `${process.env.PUBLIC_URL}/models/96x160/model_float32.tflite`,
    "[96x160]_pinto_f16q"  : `${process.env.PUBLIC_URL}/models/96x160/model_float16_quant.tflite`,
    "[96x160]_pinto_intq"  : `${process.env.PUBLIC_URL}/models/96x160/model_integer_quant.tflite`,
    "[96x160]_pinto_weiq"  : `${process.env.PUBLIC_URL}/models/96x160/model_weight_quant.tflite`,

    "[128x128]_original"   : `${process.env.PUBLIC_URL}/models/128x128/segm_lite_v509.tflite`,
    "[128x128]_pinto_f32"  : `${process.env.PUBLIC_URL}/models/128x128/model_float32.tflite`,
    "[128x128]_pinto_f16q" : `${process.env.PUBLIC_URL}/models/128x128/model_float16_quant.tflite`,
    "[128x128]_pinto_intq" : `${process.env.PUBLIC_URL}/models/128x128/model_integer_quant.tflite`,
    "[128x128]_pinto_weiq" : `${process.env.PUBLIC_URL}/models/128x128/model_weight_quant.tflite`,

    "[144x256]_original"   : `${process.env.PUBLIC_URL}/models/144x256/segm_full_v679.tflite`,
    "[144x256]_pinto_f32"  : `${process.env.PUBLIC_URL}/models/144x256/model_float32.tflite`,
    "[144x256]_pinto_f16q" : `${process.env.PUBLIC_URL}/models/144x256/model_float16_quant.tflite`,
    "[144x256]_pinto_intq" : `${process.env.PUBLIC_URL}/models/144x256/model_integer_quant.tflite`,
    "[144x256]_pinto_weiq" : `${process.env.PUBLIC_URL}/models/144x256/model_weight_quant.tflite`,
    
    "[256x256]_original"   : `${process.env.PUBLIC_URL}/models/256x256/selfiesegmentation_mlkit-256x256-2021_01_19-v1215.f16.tflite`,

}

const processSize: { [name: string]: number[] } = {
    "96x160" : [96, 160],
    "128x128": [128, 128],
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
    manager: GoogleMeetSegmentationTFLiteWorkerManager
    params : GoogleMeetSegmentationTFLiteOperationParams
    config : GoogleMeetSegmentationTFLiteConfig
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
    const [ processSizeKey, setProcessSizeKey] = useState(Object.keys(processSize)[3])
    const [ kernelSize, setKernelSize]         = useState(0)
    const [ useSoftmax, setUseSoftmax]         = useState(true)
    const [ usePadding, setUsePadding]         = useState(false)
    const [ threshold, setThreshold]           = useState(0.1)
    const [ useSIMD, setUseSIMD]               = useState(false)
    const [ onLocal, setOnLocal]               = useState(true)
    const [ lwBlur, setlwBlur]                 = useState(6)
    const [ interpolation, setInterpolation]   = useState(1)

    const [inputMedia, setInputMedia] = useState<InputMedia>({mediaType:"IMAGE", media:"yuka_kawamura.jpg"})
    const inputChange = (mediaType: VideoInputType, input:MediaStream|string) =>{
        setInputMedia({mediaType:mediaType, media:input})
    }

    const [ strict, setStrict]               = useState(false)

    ///////////////////////////
    /// プロパティ設定      ///
    ///////////////////////////
    //// モデル切り替え
    useEffect(()=>{
        const init = async () =>{
            const m = workerProps? workerProps.manager : new GoogleMeetSegmentationTFLiteWorkerManager()
            const count = workerProps? workerProps.count + 1: 0
            const c = generateGoogleMeetSegmentationTFLiteDefaultConfig()
            c.processOnLocal = onLocal
            c.modelPath = models[modelKey]
            c.enableSIMD = true
            
            await m.init(c)
    
            const p = generateDefaultGoogleMeetSegmentationTFLiteParams()
            p.processWidth  = processSize[processSizeKey][0]
            p.processHeight = processSize[processSizeKey][1]
            p.kernelSize    = kernelSize
            p.useSoftmax    = useSoftmax
            p.usePadding    = usePadding
            p.threshold     = threshold
            p.useSIMD       = useSIMD
            const newProps = {manager:m, config:c, params:p, count:count}
            console.log("CALLED new MANAGER", onLocal)
            setWorkerProps(newProps)
        }
        init()
    }, [modelKey, onLocal])

    //// パラメータ変更
    useEffect(()=>{
        if(!workerProps){
            return
        }
        const p = generateDefaultGoogleMeetSegmentationTFLiteParams()
        p.processWidth  = processSize[processSizeKey][0]
        p.processHeight = processSize[processSizeKey][1]
        p.kernelSize    = kernelSize
        p.useSoftmax    = useSoftmax
        p.usePadding    = usePadding
        p.threshold     = threshold
        p.useSIMD       = useSIMD
        p.interpolation = interpolation
        setWorkerProps({...workerProps, params:p})
    }, [processSizeKey, kernelSize, useSoftmax, usePadding, threshold, interpolation, useSIMD])


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
        GlobalLoopID = LOOP_ID
        let counter = 0
        let fps_start = performance.now()

        const render = async () => {
            console.log("RENDER::::", LOOP_ID, renderRequestId, workerProps?.params)
            const start = performance.now()

            if(workerProps){
                const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
                const dst = document.getElementById("output") as HTMLCanvasElement
                const tmp = document.getElementById("tmp") as HTMLCanvasElement
                const front = document.getElementById("front") as HTMLCanvasElement
                const srcCache = document.getElementById("src-cache") as HTMLCanvasElement

                const inference_start = performance.now()
                let prediction
                if(strict){
                    srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height)
                    prediction = await workerProps.manager.predict(srcCache!, workerProps.params)
                }else{
                    prediction = await workerProps.manager.predict(src!, workerProps.params)
                }
                const inference_end = performance.now()
                const info = document.getElementById("info") as HTMLCanvasElement
                info.innerText = `processing time: ${inference_end - inference_start}`
                if(!prediction){
                    if(GlobalLoopID === LOOP_ID){
                        renderRequestId = requestAnimationFrame(render)
                    }
                    return
                }

                // 結果からマスク作成
                const res = new ImageData(workerProps.params.processWidth, workerProps.params.processHeight)
                for(let i = 0;i < workerProps.params.processWidth * workerProps.params.processHeight; i++){
                    res.data[i * 4 + 0] = prediction![i]
                    res.data[i * 4 + 1] = prediction![i]
                    res.data[i * 4 + 2] = prediction![i]
                    res.data[i * 4 + 3] = prediction![i]
                }

                tmp.width  = workerProps.params.processWidth 
                tmp.height = workerProps.params.processHeight
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

                //// light Wrapping
                dstCtx.filter = `blur(${lwBlur}px)`;
                dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height)
                dstCtx.filter = 'none';

                // 前景書き込み                
                dstCtx.drawImage(front, 0, 0, dst.width, dst.height)

                if(GlobalLoopID === LOOP_ID){
                    renderRequestId = requestAnimationFrame(render)
                }
            }
            const end = performance.now()
            const info2 = document.getElementById("info2") as HTMLCanvasElement
            info2.innerText = `processing time: ${end - start}`
        }
        render()
        return ()=>{
            console.log("CANCEL", renderRequestId)
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
                    <DropDown          title="ProcessSize"   current={processSizeKey} onchange={setProcessSizeKey} options={processSize} />
                    <SingleValueSlider title="KernelSize"    current={kernelSize}     onchange={setKernelSize} min={0} max={9} step={1} />                
                    <Toggle            title="onLocal"       current={onLocal}        onchange={setOnLocal} />
                    <Toggle            title="Softmax"       current={useSoftmax}     onchange={setUseSoftmax} />
                    <SingleValueSlider title="LWB"           current={lwBlur}         onchange={setlwBlur} min={0} max={20} step={1} />
                    <Toggle            title="Padding"       current={usePadding}     onchange={setUsePadding} />
                    <SingleValueSlider title="Threshold"     current={threshold}      onchange={setThreshold} min={0.0} max={1.0} step={0.1} />
                    <Toggle            title="SIMD"          current={useSIMD}        onchange={setUseSIMD} />
                    <Toggle            title="Strict"        current={strict}         onchange={setStrict} />
                    <SingleValueSlider title="interpolation"   current={interpolation}      onchange={setInterpolation} min={0} max={4} step={1} />

                </div>
            </div>

            <div style={{display:"flex"}}>
                <canvas className={classes.inputView} id="tmp" hidden></canvas>
                <canvas className={classes.inputView} id="front" hidden></canvas>
                <canvas className={classes.inputView} id="src-cache" hidden></canvas>

            </div>
            <div >
                <div id="info"> </div>
                <div id="info2"> </div>
            </div>
        </div>
        );
}

export default App;
