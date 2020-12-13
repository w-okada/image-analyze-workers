import { WorkerResponse, WorkerCommand, OpenCVConfig, OpenCVFunctionType, OpenCVOperatipnParams } from "./const"
import { getBrowserType, BrowserType } from "./BrowserUtil";

export { OpenCVConfig, OpenCVFunctionType } from './const'
export { BrowserType, getBrowserType} from './BrowserUtil';

export const generateOpenCVDefaultConfig = ():OpenCVConfig => {
    const defaultConf:OpenCVConfig = {
        browserType         : getBrowserType(),
        processOnLocal      : false,
        workerPath          : "./opencv-worker-worker.js"
    }
    return defaultConf
}


export const generateDefaultOpenCVParams = ():OpenCVOperatipnParams => {
    const defaultParams:OpenCVOperatipnParams = {
        type                : OpenCVFunctionType.Canny,
        cannyParams         : {
            threshold1    : 50,
            threshold2    : 100,
            apertureSize  : 3,
            L2gradient    : false,
            bitwiseNot    : true
        },
        blurParams         : {
            kernelSize    : [10, 10],
            anchorPoint   : [ -1, -1 ],
        },
        processWidth        : 300,
        processHeight       : 300,
    }
    return defaultParams
}

export class LocalCV{
    cv_asm?:any
    opencvLoaded = false
    init = (config: OpenCVConfig) => {
        if(this.opencvLoaded === true){
            console.log("local initialized cv_asm1 (reuse)")
            const p = new Promise<void>((onResolve, onFail) => {
                onResolve()
            })
            return p
        }else{
            console.log("local initialized cv_asm1 (new)")
            this.cv_asm = require('../resources/opencv.js');
            const p = new Promise<void>((onResolve, onFail) => {
                this.cv_asm.onRuntimeInitialized = function () {
                    console.log("local initialized cv_asm...")
                    onResolve()                    
                }
                this.opencvLoaded = true // TBD not here... Should make this into Promise.
            })
            return p
        }
    }

    canny = async (data: Uint8ClampedArray, width: number, height: number, config: OpenCVConfig, params: OpenCVOperatipnParams) => {
        // ImageData作成  
        const processWidth = (params.processWidth <= 0 || params.processHeight <= 0) ? width : params.processWidth
        const processHeight = (params.processWidth <= 0 || params.processHeight <= 0) ? height : params.processHeight
        const cannyParams = params.cannyParams

        const inImageData = new ImageData(new Uint8ClampedArray(data), width, height)
        let src = this.cv_asm.matFromImageData(inImageData);
        let dst = new this.cv_asm.Mat();
        if (width !== processWidth || height !== processHeight) {
            let dsize = new this.cv_asm.Size(processWidth, processHeight);
            this.cv_asm.resize(src, src, dsize, 0, 0, this.cv_asm.INTER_AREA);
        }

        this.cv_asm.cvtColor(src, src, this.cv_asm.COLOR_RGB2GRAY, 0);
        this.cv_asm.Canny(src, dst, cannyParams!.threshold1, cannyParams!.threshold2, cannyParams!.apertureSize, cannyParams!.L2gradient);
        if(cannyParams!.bitwiseNot){
            this.cv_asm.bitwise_not(dst, dst);
        }
        this.cv_asm.cvtColor(dst, dst, this.cv_asm.COLOR_GRAY2RGBA, 0);


        if (width !== processWidth || height !== processHeight) {
            let dsize = new this.cv_asm.Size(width, height);
            this.cv_asm.resize(dst, dst, dsize, 0, 0, this.cv_asm.INTER_AREA);
        }
        const outImageData = new ImageData(new Uint8ClampedArray(dst.data), dst.cols, dst.rows)
        src.delete(); dst.delete();

        return outImageData
    }

    blur = async (data: Uint8ClampedArray, width: number, height: number, config: OpenCVConfig, params: OpenCVOperatipnParams) => {
        // ImageData作成  
        const processWidth = (params.processWidth <= 0 || params.processHeight <= 0) ? width : params.processWidth
        const processHeight = (params.processWidth <= 0 || params.processHeight <= 0) ? height : params.processHeight
        const blurParams = params.blurParams

        const inImageData = new ImageData(new Uint8ClampedArray(data), width, height)
        let src = this.cv_asm.matFromImageData(inImageData);
        let dst = new this.cv_asm.Mat();
        if (width !== processWidth || height !== processHeight) {
            let dsize = new this.cv_asm.Size(processWidth, processHeight);
            this.cv_asm.resize(src, src, dsize, 0, 0, this.cv_asm.INTER_AREA);
        }

        const ksize = new this.cv_asm.Size(blurParams!.kernelSize[0], blurParams!.kernelSize[1]);
        const anchor = new this.cv_asm.Point(blurParams!.anchorPoint[0], blurParams!.anchorPoint[1]);

        this.cv_asm.blur(src, dst, ksize, anchor, this.cv_asm.BORDER_DEFAULT);

        if (width !== processWidth || height !== processHeight) {
            let dsize = new this.cv_asm.Size(width, height);
            this.cv_asm.resize(dst, dst, dsize, 0, 0, this.cv_asm.INTER_AREA);
        }
        const outImageData = new ImageData(new Uint8ClampedArray(dst.data), dst.cols, dst.rows)
        src.delete(); dst.delete();

        return outImageData
    }


}



export class OpenCVWorkerManager{
    private workerCV:Worker|null = null
    private canvasOut = document.createElement("canvas")

    private config = generateOpenCVDefaultConfig()
    private localCV = new LocalCV()
    init(config: OpenCVConfig|null){
        if(config != null){
            this.config = config
        }
        if(this.workerCV){
            this.workerCV.terminate()
        }

        if(this.config.processOnLocal == true){
            return new Promise<void>((onResolve, onFail) => {
                this.localCV.init(this.config!).then(() => {
                    onResolve()
                })
            })
        }

        // Bodypix 用ワーカー
       this.workerCV = new Worker(this.config.workerPath, { type: 'module' })
        // this.workerCV = new Worker("./opencv-worker-worker.ts", { type: 'module' })
        
        this.workerCV!.postMessage({message: WorkerCommand.INITIALIZE, config:this.config})
        const p = new Promise<void>((onResolve, onFail)=>{
            this.workerCV!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED")
                    onResolve()
                }else{
                    console.log("opencv Initialization something wrong..")
                    onFail(event)
                }
            }
        })
        return p
    }

    predict(targetCanvas:HTMLCanvasElement, params = generateDefaultOpenCVParams()):Promise<HTMLCanvasElement>{

        const inImageData = targetCanvas.getContext("2d")!.getImageData(0,0,targetCanvas.width,targetCanvas.height)
        const data = inImageData.data

        if(this.config.processOnLocal == true){
            const p = new Promise(async (onResolve: (v: any) => void, onFail) => {
                let prediction
                switch(params.type){
                    case OpenCVFunctionType.Canny:
                        prediction = await this.localCV!.canny(inImageData.data, inImageData.width, inImageData.height, this.config, params)
                        break
                    case OpenCVFunctionType.Blur:
                        prediction = await this.localCV!.blur(inImageData.data, inImageData.width, inImageData.height, this.config, params)
                        break
                }
                this.canvasOut.width  = prediction.width
                this.canvasOut.height = prediction.height
                const ctx = this.canvasOut.getContext("2d")!
                ctx.putImageData(prediction, 0, 0)
                onResolve(this.canvasOut)
                onResolve(prediction)
            })
            return p
        }else{
            const uid = performance.now()
            this.workerCV!.postMessage({ 
                message: WorkerCommand.PREDICT, uid:uid,
                config: this.config, params: params,
                data: data, width: inImageData.width, height:inImageData.height
            }, [data.buffer])
            const p = new Promise((onResolve:(v:HTMLCanvasElement)=>void, onFail)=>{
                this.workerCV!.onmessage = (event) => {
                    if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                        const outData = event.data.converted as Uint8ClampedArray
                        const outImageData = new  ImageData(new Uint8ClampedArray(outData), inImageData.width, inImageData.height)
                        this.canvasOut.width  = outImageData.width
                        this.canvasOut.height = outImageData.height
                        const ctx = this.canvasOut.getContext("2d")!
                        ctx.putImageData(outImageData, 0, 0)
                        onResolve(this.canvasOut)
//                        console.log("worker!!!!", imageBitmap.width, imageBitmap.height)
                    }else{
                        console.log("opencv Prediction something wrong..")
                        onFail(event)
                    }
                }        
            })
            return p
        }
    }
}
