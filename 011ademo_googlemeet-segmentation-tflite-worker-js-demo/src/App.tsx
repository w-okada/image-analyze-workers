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
    const [ processSizeKey, setProcessSizeKey] = useState(Object.keys(processSize)[0])
    const [ kernelSize, setKernelSize]         = useState(2)
    const [ useSoftmax, setUseSoftmax]         = useState(false)
    const [ usePadding, setUsePadding]         = useState(false)
    const [ threshold, setThreshold]           = useState(0.1)
    const [ useSIMD, setUseSIMD]               = useState(true)

    const [inputMedia, setInputMedia] = useState<InputMedia>({mediaType:"IMAGE", media:"yuka_kawamura.jpg"})
    const inputChange = (mediaType: VideoInputType, input:MediaStream|string) =>{
        console.log("[inputchange]", mediaType, input)
        setInputMedia({mediaType:mediaType, media:input})
    }


    const [ strict, setStrict]               = useState(true)


    ///////////////////////////
    /// プロパティ設定      ///
    ///////////////////////////
    //// モデル切り替え
    useEffect(()=>{
        const init = async () =>{
            const m = new GoogleMeetSegmentationTFLiteWorkerManager()
            const c = generateGoogleMeetSegmentationTFLiteDefaultConfig()
            c.processOnLocal = true
            c.modelPath = models[modelKey]
            await m.init(c)
    
            const p = generateDefaultGoogleMeetSegmentationTFLiteParams()
            p.processWidth  = processSize[processSizeKey][0]
            p.processHeight = processSize[processSizeKey][1]
            p.kernelSize    = kernelSize
            p.useSoftmax    = useSoftmax
            p.usePadding    = usePadding
            p.threshold     = threshold
            p.useSIMD       = useSIMD
            setWorkerProps({manager:m, config:c, params:p})
        }
        init()
    }, [modelKey])

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
        setWorkerProps({...workerProps, params:p})
    }, [processSizeKey, kernelSize, useSoftmax, usePadding, threshold])


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
                const dst = document.getElementById("output") as HTMLCanvasElement
                const tmp = document.getElementById("tmp") as HTMLCanvasElement
                const front = document.getElementById("front") as HTMLCanvasElement
                const srcCache = document.getElementById("src-cache") as HTMLCanvasElement

                let prediction
                if(strict){
                    srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height)
                    prediction = await workerProps.manager.predict(srcCache!, workerProps.params)
                }else{
                    prediction = await workerProps.manager.predict(src!, workerProps.params)
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
                dstCtx.filter = 'blur(4px)';
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
                renderRequestId = requestAnimationFrame(render)
            }
        }
        render()
        return ()=>{
            cancelAnimationFrame(renderRequestId)
        }
    }, [workerProps, strict])




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
                    <VideoInputSelect  title="input"       current={""}             onchange={inputChange}     options={videoInputList}/>
                    <DropDown          title="model"       current={modelKey}       onchange={setModelKey}     options={models} />
                    <DropDown          title="ProcessSize" current={processSizeKey} onchange={setProcessSizeKey} options={processSize} />
                    <SingleValueSlider title="KernelSize"  current={kernelSize}     onchange={setKernelSize} min={0} max={9} step={1} />                
                    <Toggle            title="Softmax"     current={useSoftmax}     onchange={setUseSoftmax} />
                    <Toggle            title="Padding"     current={usePadding}     onchange={setUsePadding} />
                    <SingleValueSlider title="Threshold"   current={threshold}      onchange={setThreshold} min={0.0} max={1.0} step={0.1} />
                    <Toggle            title="SIMD"        current={useSIMD}        onchange={setUseSIMD} />
                    <Toggle            title="Strict"        current={strict}        onchange={setStrict} />
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
