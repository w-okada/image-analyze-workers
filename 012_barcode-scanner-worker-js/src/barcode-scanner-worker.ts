import { BrowserType, getBrowserType } from "./BrowserUtil"
import { BarcodeScannerConfig, BarcodeScannerType, BarcodeScannerOperationParams, TFLite, WorkerCommand, WorkerResponse, BarcodeInfo } from "./const"

export {BarcodeScannerConfig, BarcodeScannerType, BarcodeScannerOperationParams, TFLite, WorkerCommand, WorkerResponse, BarcodeInfo}

export const generateBarcodeScannerDefaultConfig = ():BarcodeScannerConfig => {
    const defaultConf:BarcodeScannerConfig = {
        browserType         : getBrowserType(),
        processOnLocal      : false,
        modelPath           : "",
        workerPath          : "./barcode-scanner-worker-worker.js",
        enableSIMD          : true,
    }
    return defaultConf
}


export const generateDefaultBarcodeScannerParams = ():BarcodeScannerOperationParams => {
    const defaultParams:BarcodeScannerOperationParams = {
        type                : BarcodeScannerType.original,
        processWidth        : 256,
        processHeight       : 256,
        scale               : 2,
        sizeThresold        : 200,
        interpolation       : 1,
        useSIMD             : false
    }
    return defaultParams
}

const calcProcessSize = (width: number, height: number) => {
    const max_size = 2000
    if(Math.max(width, height) > max_size){
        const ratio = max_size / Math.max(width, height)
        return [width * ratio, height * ratio]
    }else{
        return [width, height]
    }
}

export class LocalWorker{
    mod:any
    modSIMD:any
    tflite?:TFLite
    tfliteSIMD?:TFLite
    tfliteLoaded = false
    inputCanvas = document.createElement("canvas")
    
    resultArray:number[] = Array<number>(300*300)

    ready = false
    init = async (config: BarcodeScannerConfig) => {
        this.ready = false
        const browserType = getBrowserType()
        this.mod = require('../resources/tflite.js');
        this.tflite = await this.mod()
        // console.log("[WORKER_MANAGER]:", this.mod)
        console.log("[WORKER_MANAGER]: Test Access", this.tflite, this.tflite!._getInputImageBufferOffset())
        const modelResponse = await fetch(config.modelPath)
        const model = await modelResponse.arrayBuffer()
        console.log('[WORKER_MANAGER]: Model Size:', model.byteLength);
        const modelBufferOffset = this.tflite!._getModelBufferMemoryOffset()
        this.tflite!.HEAPU8.set(new Uint8Array(model), modelBufferOffset)
        const res = this.tflite!._loadModel(model.byteLength)

        if(config.enableSIMD){
            console.log("[WORKER_MANAGER]: LOAD SIMD_MOD")
            if(browserType == BrowserType.SAFARI){
                this.modSIMD = require('../resources/tflite.js');
            }else{
                this.modSIMD = require('../resources/tflite-simd.js');
            }
            // console.log("[WORKER_MANAGER]:", this.modSIMD)
            this.tfliteSIMD  = await this.modSIMD()
            const modelSIMDBufferOffset = this.tfliteSIMD!._getModelBufferMemoryOffset()
            this.tfliteSIMD!.HEAPU8.set(new Uint8Array(model), modelSIMDBufferOffset)
            const res = this.tfliteSIMD!._loadModel(model.byteLength)
            console.log("[WORKER_MANAGER]: LOAD SIMD_MOD DONE")
        }
        this.ready = true
        console.log('[WORKER_MANAGER]: Load Result:', res)
    }



    barcodeScan = (tflite:TFLite, org:HTMLCanvasElement, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams):BarcodeInfo[]  => {

        //// (1) generate input data
        this.inputCanvas.width  = 172*params.scale
        this.inputCanvas.height = 172*params.scale
        const inputCanvasCtx = this.inputCanvas.getContext("2d")!
        inputCanvasCtx.drawImage(org, 0, 0, this.inputCanvas.width, this.inputCanvas.height)
        const imageData = inputCanvasCtx.getImageData(0, 0, this.inputCanvas.width, this.inputCanvas.height)

        ///// (1-2) input data
        const inputImageBufferOffset = tflite._getInputImageBufferOffset()
        tflite.HEAPU8.set(imageData.data, inputImageBufferOffset);        

        //// (2) generate original canvas ctx
        const orgCanvasCtx = org.getContext("2d")!        


        //// (3) detect barcode
        const barcodeInfos: BarcodeInfo[] = []
        try {
            const barcode_num = tflite._detect(this.inputCanvas.width, this.inputCanvas.height, params.scale, 0) // last param is mode. this is not used currently.
            // console.log("BARCODE NUM", barcode_num)

            const barcodePointsOffset = tflite._getBarcodePointsOffset()
            for (let i = 0; i < barcode_num; i++) {
                const offset = barcodePointsOffset / 4 + (13 * i)
                const barcodeInfo: BarcodeInfo = {
                    p1_x: tflite.HEAPF32[offset + 0],
                    p1_y: tflite.HEAPF32[offset + 1],
                    p2_x: tflite.HEAPF32[offset + 2],
                    p2_y: tflite.HEAPF32[offset + 3],
                    p3_x: tflite.HEAPF32[offset + 4],
                    p3_y: tflite.HEAPF32[offset + 5],
                    p4_x: tflite.HEAPF32[offset + 6],
                    p4_y: tflite.HEAPF32[offset + 7],

                    angle: tflite.HEAPF32[offset + 8],

                    px_x: tflite.HEAPF32[offset + 9],
                    px_y: tflite.HEAPF32[offset + 10],
                    px_w: tflite.HEAPF32[offset + 11],
                    px_h: tflite.HEAPF32[offset + 12],
                    barcode_type:"",
                    barcode_data:"",
                    scan_type: BarcodeScannerType.original
                }
                barcodeInfos.push(barcodeInfo)
            }           
        } catch (e) {
            console.log(e)
        }


        //// (4) read barcode
        barcodeInfos.forEach(info => {
            const imageData = orgCanvasCtx.getImageData(info.px_x*org.width, info.px_y*org.height, info.px_w*org.width, info.px_h*org.height)

            const inputBarcodeImageBufferOffset = tflite._getInputBarcodeImageBufferOffset()
            tflite.HEAPU8.set(imageData.data, inputBarcodeImageBufferOffset);

            const res = tflite._readBarcode(info.px_w*org.width, info.px_h*org.height, info.angle, 0)
            if(res===0){ // バーコード未検出
                return;
            }
            
            const resOffset = tflite._getBarcodeDataOffset()

            const barcode_data_array = Array.from( tflite.HEAPU8.slice(resOffset, resOffset + 128*32)  );
            const barcode_data = String.fromCharCode( ...barcode_data_array)
            const barcodes = barcode_data.split("\0")
            info.barcode_type = barcodes[0]
            info.barcode_data = barcodes[1]
            // console.log("barcode scanner returns: ", barcode_type, barcode_data )
        })

        return barcodeInfos
    }

    scan_by_pure_zbar = (tflite:TFLite, org:HTMLCanvasElement, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams):BarcodeInfo[]  => {
        //// (1) generate original canvasCtx
        const orgCanvasCtx = org.getContext("2d")!        


        //// (2) Input data
        const imageData = orgCanvasCtx.getImageData(0, 0, org.width, org.height)
        const inputBarcodeImageBufferOffset = tflite._getInputBarcodeImageBufferOffset()
        tflite.HEAPU8.set(imageData.data, inputBarcodeImageBufferOffset);

        //// (3) scan
        const res = tflite._readBarcode_pure_zbar(org.width, org.height)


        //// (4) get result
        const barcodeInfos: BarcodeInfo[] = []
        ///////// offset for Point DATA
        const resPointOffset = tflite._getZbarScanPointsOffset()
        ///////// offset for data
        const resOffset = tflite._getBarcodeDataOffset()
        const barcode_data_array = Array.from(  tflite.HEAPU8.slice(resOffset, resOffset + 128*32)  );
        const barcode_data = String.fromCharCode( ...barcode_data_array)
        const barcodes = barcode_data.split("\0")
        ///////// set result
        for(let i=0;i<res;i++){
            const x = tflite.HEAPF32[resPointOffset/4 + i*2 + 0]
            const y = tflite.HEAPF32[resPointOffset/4 + i*2 + 1]
            const barcode_type = barcodes[i*2 +0]
            const barcode_data = barcodes[i*2 +1]

            const diff = 0.01
            const barcodeInfo: BarcodeInfo = {
                p1_x: x,
                p1_y: y,
                p2_x: x+diff,
                p2_y: y,
                p3_x: x+diff,
                p3_y: y+diff,
                p4_x: x,
                p4_y: y+diff,

                angle: 0,

                px_x: x,
                px_y: y,
                px_w: diff,
                px_h: diff,
                barcode_type: barcode_type,
                barcode_data: barcode_data,
                scan_type: BarcodeScannerType.original
            }
            barcodeInfos.push(barcodeInfo)
        }
        return barcodeInfos

    }

    scan_by_pure_zxing = (tflite:TFLite, org:HTMLCanvasElement, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams):BarcodeInfo[]  => {
        //// (1) generate original canvasCtx
        const orgCanvasCtx = org.getContext("2d")!        


        //// (2) Input data
        const imageData = orgCanvasCtx.getImageData(0, 0, org.width, org.height)
        const inputBarcodeImageBufferOffset = tflite._getInputBarcodeImageBufferOffset()
        tflite.HEAPU8.set(imageData.data, inputBarcodeImageBufferOffset);

        //// (3) scan
        const res = tflite._readBarcode_pure_zxing(org.width, org.height)


        //// (4) get result
        const barcodeInfos: BarcodeInfo[] = []
        ///////// offset for Point DATA
        const resPointOffset = tflite._getZbarScanPointsOffset()
        ///////// offset for data
        const resOffset = tflite._getBarcodeDataOffset()
        const barcode_data_array = Array.from(  tflite.HEAPU8.slice(resOffset, resOffset + 128*32)  );
        const barcode_data = String.fromCharCode( ...barcode_data_array)
        const barcodes = barcode_data.split("\0")
        ///////// set result
        for(let i=0;i<res;i++){
            const x = tflite.HEAPF32[resPointOffset/4 + i*2 + 0]
            const y = tflite.HEAPF32[resPointOffset/4 + i*2 + 1]
            const barcode_type = barcodes[i*2 +0]
            const barcode_data = barcodes[i*2 +1]

            const diff = 0.01

            const barcodeInfo: BarcodeInfo = {
                p1_x: x,
                p1_y: y,
                p2_x: x+diff,
                p2_y: y,
                p3_x: x+diff,
                p3_y: y+diff,
                p4_x: x,
                p4_y: y+diff,

                angle: 0,

                px_x: x,
                px_y: y,
                px_w: diff,
                px_h: diff,
                barcode_type: barcode_type,
                barcode_data: barcode_data,
                scan_type: BarcodeScannerType.original
            }
            barcodeInfos.push(barcodeInfo)
        }
        return barcodeInfos

    }
    

    predict = async (src:HTMLCanvasElement, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams) => {
        if(this.ready){
            let tflite
            if(params.useSIMD){
                tflite=this.tfliteSIMD
            }else{
                tflite=this.tflite
            }
            if(!tflite){
                return []
            }
            switch(params.type){
                case BarcodeScannerType.original:
                    return this.barcodeScan(tflite, src, config, params)
                case BarcodeScannerType.zbar:
                    return this.scan_by_pure_zbar(tflite, src, config, params)
                case BarcodeScannerType.zxing:
                    return this.scan_by_pure_zxing(tflite, src, config, params)
                default:
                    return []
            }
        }
        return []
    }
}

export class BarcodeScannerWorkerManager{
    private workerBSL:Worker|null = null
    orgCanvas = document.createElement("canvas") // to resize canvas for WebWorker  

    private config = generateBarcodeScannerDefaultConfig()
    private localWorker = new LocalWorker()
    init = async (config: BarcodeScannerConfig|null) => {
        if(config != null){
            this.config = config
        }
        if(this.workerBSL){
            this.workerBSL.terminate()
        }
        this.workerBSL = null

        //// Local
        if(this.config.processOnLocal == true){
            await this.localWorker.init(this.config!)
            return 
        }

        //// Remote
        const workerBSL = new Worker(this.config.workerPath, { type: 'module' })
        console.log("[manager] send initialize request")
        workerBSL!.postMessage({message: WorkerCommand.INITIALIZE, config:this.config})
        const p = new Promise<void>((onResolve, onFail)=>{
            workerBSL!.onmessage = (event) => {
                console.log("[manager] receive event", event)
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED")
                    this.workerBSL = workerBSL
                    onResolve()
                }else{
                    console.log("opencv Initialization something wrong..")
                    onFail(event)
                }
            }
        })
        await p
        return
    }









    predict = async (src:HTMLCanvasElement | HTMLImageElement | HTMLVideoElement, params = generateDefaultBarcodeScannerParams()) =>{
        //// (1) generate original canvas
        let processWidth, processHeight
        if(src instanceof HTMLImageElement){
            [processWidth, processHeight]= calcProcessSize(src.naturalWidth, src.naturalHeight)
        }
        if(src instanceof HTMLVideoElement){
            [processWidth, processHeight]= calcProcessSize(src.videoWidth, src.videoHeight)
        }
        if(src instanceof HTMLCanvasElement){
            processWidth  = src.width
            processHeight = src.height
        }
        if( processWidth === 0 ||  processHeight === 0 || !processWidth || !processHeight){
            return []
        }        

        //// (2) Local or Safari
        if(this.config.processOnLocal == true || this.config.browserType === BrowserType.SAFARI ){
            //// (2-1) generate original canvas
            this.orgCanvas.width = processWidth
            this.orgCanvas.height = processHeight

            const orgCanvasCtx = this.orgCanvas.getContext("2d")!        
            orgCanvasCtx.drawImage(src, 0, 0, this.orgCanvas.width, this.orgCanvas.height)
            
            //// (2-2) predict
            const res = await this.localWorker.predict(this.orgCanvas, this.config, params)            
            return res
        }


        //// (3) WebWorker
        /////// (3-1) Not initilaized return.
        if(!this.workerBSL){
            return []
        }

        /////// worker is initialized.
        ///// (3-2) geberate original canvas
        const offscreenCanvas = new OffscreenCanvas(processWidth, processHeight) 
        offscreenCanvas.getContext("2d")!.drawImage(src, 0, 0, processWidth, processHeight)
        const image = offscreenCanvas.transferToImageBitmap()
        ///// (3-3) post message 
        const uid = performance.now()
        this.workerBSL!.postMessage({
            message: WorkerCommand.PREDICT, uid:uid,
            config: this.config, params: params,
            image: image ,
        }, [image ])

        ///// (3-3) recevie message 
        const p = new Promise<BarcodeInfo[]>((resolve, reject)=>{
            this.workerBSL!.onmessage = (event) => {
                if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                    const prediction = event.data.prediction as BarcodeInfo[]
                    resolve(prediction)
                }else{
                    //// Only Drop the request...
                    console.log("something wrong..", event, event.data.message)
                    const prediction = event.data.prediction as BarcodeInfo[]
                    resolve(prediction)
                    // reject()
                }
            }        
        })
        const res = await p
        return res
    }
}




  