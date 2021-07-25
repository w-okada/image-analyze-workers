import React, {  useEffect, useState } from 'react';
import './App.css';
import useTFLite from './hooks/useTFLite';
import { makeStyles} from '@material-ui/core';
import { useVideoInputList } from './hooks/useVideoInputList';
import { VideoInputType } from './const';
import { VideoInputSelect, DropDown, SingleValueSlider, Toggle, FileChooser } from './components/components';


const models: { [name: string]: string } = {
    "[172x172]_custom"     : `${process.env.PUBLIC_URL}/models/172x172/personseg_172.tflite`,
    "[96x160]_original"    : `${process.env.PUBLIC_URL}/models/96x160/segm_lite_v681.tflite`,
    "[128x128]_original"   : `${process.env.PUBLIC_URL}/models/128x128/segm_lite_v509.tflite`,
    "[144x256]_original"   : `${process.env.PUBLIC_URL}/models/144x256/segm_full_v679.tflite`,
    "[256x256]_original"   : `${process.env.PUBLIC_URL}/models/256x256/selfiesegmentation_mlkit-256x256-2021_01_19-v1215.f16.tflite`,

        
}

const processSize: { [name: string]: number[] } = {
    "172x172": [172, 172],
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



const App = () => {
    const classes = useStyles();
    const { tflite, tfliteSIMD, setModelPath } = useTFLite()
    const { videoInputList } = useVideoInputList()
    // const {setTFLite, setSrc, setDst, setProcessSize} = usePipeline()


    ////////////
    /// プロパティ設定
    ////////////
    const [ modelKey, setModelKey ]            = useState(Object.keys(models)[0])
    const [ processSizeKey, setProcessSizeKey] = useState(Object.keys(processSize)[0])
    const [ kernelSize, setKernelSize]         = useState(0)
    const [ useSoftmax, setUseSoftmax]         = useState(true)
    const [ usePadding, setUsePadding]         = useState(true)
    const [ threshold, setThreshold]           = useState(0.1)
    const [ useSIMD, setUseSIMD]               = useState(false)
    const [ interpolation, setInterpolation]   = useState(4)
    const [ lightWrapping, setLightWrapping]   = useState(1)
    const [ strict, setStrict]               = useState(false)

    interface InputMedia{
        mediaType : VideoInputType
        media     : MediaStream|string
    }
    const [inputMedia, setInputMedia] = useState<InputMedia>({mediaType:"IMAGE", media:"img/yuka_kawamura.jpg"})
    const inputChange = (mediaType: VideoInputType, input:MediaStream|string) =>{
        console.log("[inputchange]", mediaType, input)
        setInputMedia({mediaType:mediaType, media:input})
    }
    const backgroundChange = (mediaType: VideoInputType, input:string) =>{
        console.log("background:", mediaType, input)
        if(mediaType==="IMAGE"){
            const img = document.getElementById("background") as HTMLImageElement
            img.src = input
        }
    }

    ////////////////////
    //// Effects
    ////////////////////

    /// モデルロード
    useEffect(()=>{
        const modelPath = models[modelKey]
        setModelPath(modelPath)
    },[modelKey]) // eslint-disable-line

    /// TFLite設定
    useEffect(()=>{
        if(!tflite){
            return
        }
        // setTFLite(tflite)
        // setProcessSize(processSize[processSizeKey][0], processSize[processSizeKey][1])
        tflite?._setKernelSize(kernelSize)
        tfliteSIMD?._setKernelSize(kernelSize)
        tflite?._setUseSoftmax(useSoftmax?1:0)
        tfliteSIMD?._setUseSoftmax(useSoftmax?1:0)
        tflite?._setUsePadding(usePadding?1:0)
        tfliteSIMD?._setUsePadding(usePadding?1:0)
        tflite?._setThresholdWithoutSoftmax(threshold)
        tfliteSIMD?._setThresholdWithoutSoftmax(threshold)
        tflite?._setInterpolation(interpolation)
        tfliteSIMD?._setInterpolation(interpolation)
    },[tflite, tfliteSIMD, processSizeKey, kernelSize, useSoftmax, usePadding, threshold, interpolation])

    /// input設定
    useEffect(()=>{
        const video = document.getElementById("input_video") as HTMLVideoElement
        if(inputMedia.mediaType === "IMAGE"){
            const img = document.getElementById("input_img") as HTMLImageElement
            img.onloadeddata = () =>{
                resizeDst(img)
            }
            img.src = inputMedia.media as string
            // setSrc(img)
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
            // setSrc(vid)
        }else{
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject = inputMedia.media as MediaStream
            vid.onloadeddata = () =>{
                video.play()
                resizeDst(vid)
            }
            // setSrc(vid)
        }
    },[inputMedia])

    /// output設定
    useEffect(()=>{
        // const dst = document.getElementById("output") as HTMLCanvasElement
        // setDst(dst)
    },[])

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
        const srcCache = document.getElementById("src-cache") as HTMLCanvasElement
        const resizedResult = document.getElementById("resized-result") as HTMLCanvasElement
        
        Array.from([srcCache, dst, resizedResult]).forEach((e)=>{
            e.width = width
            e.height = height
        })
    }


    //////////////////
    //  pipeline    //
    //////////////////
    useEffect(()=>{
        console.log("[Pipeline] Start")
        let renderRequestId: number
        const LOOP_ID = performance.now()

        const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
        const srcCache = document.getElementById("src-cache") as HTMLCanvasElement

        const background = document.getElementById("background") as HTMLImageElement
        const dst = document.getElementById("output") as HTMLCanvasElement
        const data = document.getElementById("data") as HTMLCanvasElement
        const resizedResult = document.getElementById("resized-result") as HTMLCanvasElement
        const dataCtx = data.getContext("2d")!
        const srcCacheCtx = srcCache.getContext("2d")!
        const resizedResultCtx = resizedResult.getContext("2d")!                
        const dstCtx = dst.getContext("2d")!



        const render = () => {
            console.log("RENDER::::", LOOP_ID)
            const start2 = performance.now();
            let currentTFLite
            if(useSIMD){
                currentTFLite = tfliteSIMD
            }else{
                currentTFLite = tflite
            }
            if(currentTFLite && processSizeKey){
                data.width = processSize[processSizeKey][0]
                data.height = processSize[processSizeKey][1]
                if(strict){
                    srcCacheCtx.drawImage(src, 0, 0, srcCache.width, srcCache.height)
                    dataCtx.drawImage(srcCache, 0, 0, data.width, data.height)
                }else{
                    dataCtx.drawImage(src, 0, 0, data.width, data.height)
                }

                /// データインプット
                const imageData = dataCtx.getImageData(0, 0, data.width, data.height)                
                const inputImageBufferOffset = currentTFLite._getInputImageBufferOffset()
                currentTFLite.HEAPU8.set(imageData.data, inputImageBufferOffset);

                /// inferecence
                const start = performance.now();
                currentTFLite._exec(data.width, data.height)
                const end   = performance.now();
                const duration = end - start
                /////infoDiv.innerText = `MS: ${duration}`

                /// データ取得
                const outputImageBufferOffset = currentTFLite._getOutputImageBufferOffset() 
                // const outputImageBufferOffset = tflite._getGrayedImageBufferOffset() 
                const segmentationMask = new ImageData(new Uint8ClampedArray(currentTFLite.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + data.width * data.height * 4)), data.width, data.height)
                dataCtx.putImageData(segmentationMask, 0, 0)
                resizedResultCtx.clearRect(0, 0, resizedResult.width, resizedResult.height)
                resizedResultCtx.drawImage(data, 0, 0, resizedResult.width, resizedResult.height)
                resizedResultCtx.globalCompositeOperation = "source-atop";
                if(strict){
                    resizedResultCtx.drawImage(srcCache, 0, 0, resizedResult.width, resizedResult.height)
                }else{
                    resizedResultCtx.drawImage(src, 0, 0, resizedResult.width, resizedResult.height)
                }
                resizedResultCtx.globalCompositeOperation = "source-over";


                dstCtx.clearRect(0, 0, dst.width, dst.height)
                dstCtx.drawImage(background, 0, 0, dst.width, dst.height)
                if(lightWrapping > 0){
                    dstCtx.filter = `blur(${lightWrapping}px)`;
                    dstCtx.drawImage(data, 0, 0, dst.width, dst.height)
                    dstCtx.filter = 'none';                    
                }
                dstCtx.drawImage(resizedResult, 0, 0, dst.width, dst.height)
                
                const end2   = performance.now();
                const duration2 = end2 - start2
                const info = document.getElementById("info") as HTMLCanvasElement
                info.innerText = `inference time: ${duration}`
                const info2 = document.getElementById("info2") as HTMLCanvasElement
                info2.innerText = `processing time: ${duration2}`                
            }else{
                // console.log("not ready", tflite, src, dst)
            }
            renderRequestId = requestAnimationFrame(render)
        }
        render()
        return ()=>{
            cancelAnimationFrame(renderRequestId)
        }
    }, [tflite, processSizeKey, inputMedia, useSIMD, lightWrapping, strict]) // eslint-disable-line


    ///////////////
    // Render    //
    ///////////////
    return (
        <div>
            <div style={{display:"flex"}}>
                <div style={{display:"flex"}}>
                    {inputMedia.mediaType === "IMAGE" ? 
                        <img  className={classes.inputView} alt="input_img" id="input_img"></img>
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
                    <SingleValueSlider title="interpolation"   current={interpolation}      onchange={setInterpolation} min={0} max={4} step={1} />
                    <FileChooser       title="background"  onchange={backgroundChange} />
                    <SingleValueSlider title="lightWrapping"   current={lightWrapping}      onchange={setLightWrapping} min={0} max={10} step={1} />
                    <Toggle            title="Strict"      current={strict}        onchange={setStrict} />
                </div>
            </div>
            <div style={{display:"flex"}}>
                <canvas className={classes.inputView} id="data" hidden></canvas>
                <canvas className={classes.inputView} id="resized-result" hidden></canvas>

                {/* <canvas className={classes.inputView} id="front" hidden></canvas> */}
                <canvas className={classes.inputView} id="src-cache" hidden></canvas>
                <img className={classes.inputView} alt="background" id="background" src="img/north-star-2869817_640.jpg" hidden></img>

            </div>

            <div>
                <div id="info" />
                <div id="info2" />
            </div>
        </div>
    )
}

export default App;
