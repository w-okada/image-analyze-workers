import { GoogleMeetSegmentationConfig,  GoogleMeetSegmentationOperationParams,  GoogleMeetSegmentationSmoothingType,  WorkerCommand, WorkerResponse, } from './const'
import * as tf from '@tensorflow/tfjs';
import { BrowserType } from './BrowserUtil';
import {setWasmPath} from '@tensorflow/tfjs-backend-wasm';
import { drawArrayToCanvas, imageToGrayScaleArray, padSymmetricImage } from './utils';
import { browser } from '@tensorflow/tfjs';

const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

let model:tf.GraphModel|null

class JBFWasm {
    private static _instance:JBFWasm
    private constructor(){}
    private mod?:any

    private sm?:WebAssembly.Memory
    srcMemory?:Float32Array 
    segMemory?:Float32Array 
    outMemory?:Float32Array

    public static async getInstance():Promise<JBFWasm>{
        if(!this._instance){
            console.log("create instance")
            this._instance = new JBFWasm()
            const promise = await import("../crate/pkg")
            this._instance.mod = await promise['default']
            console.log("module loeded",this._instance.mod)
            const res = this._instance.mod.get_config()
            this._instance.sm = this._instance.mod?.shared_memory() as WebAssembly.Memory
            this._instance.srcMemory = new Float32Array(this._instance.sm.buffer, res[0]);
            this._instance.segMemory = new Float32Array(this._instance.sm.buffer, res[1]);
            this._instance.outMemory = new Float32Array(this._instance.sm.buffer, res[2]);
        }
        return this._instance
    }

    doFilter = (w:number, h:number, sp:number, range:number) =>{
        this.mod.do_filter(w, h ,sp, range)
    }
}


const load_module = async (config: GoogleMeetSegmentationConfig) => {
    console.log(config.browserType)
    if(config.useTFWasmBackend || config.browserType === BrowserType.SAFARI){
      console.log("use cpu backend, wasm doesnot support enough function")
      require('@tensorflow/tfjs-backend-wasm')
      setWasmPath(config.wasmPath)
      await tf.setBackend("wasm")
    //   await tf.setBackend("cpu")
    }else{
      console.log("use webgl backend")
      require('@tensorflow/tfjs-backend-webgl')
      try{
        await tf.setBackend("webgl")
      }catch{
        await tf.setBackend("cpu")
      }
    }
}

// Case.1 Use ImageBitmap (for Chrome default)
//// (1) Only Google Meet Segmentation (not Joint Bilateral Filter)
const predict = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

    let bm:number[][][]|null = null
    tf.tidy(()=>{
        let tensor = tf.browser.fromPixels(imageData)
        tensor = tensor.expandDims(0)
        tensor = tf.cast(tensor, 'float32')

        tensor = tensor.div(255.0)

        let prediction = model!.predict(tensor) as tf.Tensor
        prediction = prediction.squeeze()
        prediction = prediction.softmax()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)
        predTensor0 = tf.cast(predTensor0.mul(255),'float32')
        bm = predTensor0.arraySync() as number[][][]
    }) 
    return bm!
}



//// (2) With GPU JBF
const matrix_gpu_map:{[key:string]:any} = {}
const predict_jbf_gpu = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

    const spatialKern = params.smoothingS
    const rangeKern   = params.smoothingR

    if(!matrix_gpu_map[`${params.smoothingR}`]){
        const gaussianRange   = 1 / Math.sqrt(2*Math.PI * (rangeKern*rangeKern))
        const matrix = (()=>{
            const t = tf.tensor1d(Array.from(new Array(256)).map((v,i) => i))
            const matrix = t.mul(-1).mul(t).mul(gaussianRange).exp()
            return matrix
        })()
        matrix_gpu_map[`${rangeKern}`] = matrix
    }
    const matrix = matrix_gpu_map[`${rangeKern}`]


    let bm:number[][][]|null = null
    tf.tidy(()=>{
        let orgTensor = tf.browser.fromPixels(imageData)
        const width  = imageData.width
        const height = imageData.height
        
        let tensor = orgTensor.expandDims(0)
        tensor = tf.cast(tensor, 'float32')
        tensor = tensor.div(255.0)
        let prediction = model!.predict(tensor) as tf.Tensor
        prediction = prediction.squeeze()
        prediction = prediction.softmax()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)
        // ↑ここまで同じ
        let newTensor = orgTensor.mean(2).toFloat()
        predTensor0 = predTensor0.squeeze()

        console.log("before", predTensor0.shape, newTensor.shape)
        newTensor   = newTensor.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')
        predTensor0 = predTensor0.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')
        console.log("after", predTensor0.shape, newTensor.shape)
        let outTensor = tf.ones([width, height])
        let outvals:tf.Tensor[] = [] 
        for(let i=spatialKern; i<spatialKern+height; i++){
            console.log("row:",i)
            for(let j=spatialKern; j<spatialKern+width; j++){
                /// https://github.com/tensorflow/tensorflow/issues/39750
                /// Slice is magnitude slower!!! 
                // console.log(i,j)
                // const neighbourhood = (newTensor as tf.Tensor2D).slice([i-spatialKern, j-spatialKern],[2 * spatialKern + 1, 2 * spatialKern + 1])
                // const centerVal = (newTensor as tf.Tensor2D).slice([i,j],[1,1])
                // const indexes = neighbourhood.sub(centerVal).abs().toInt()
                // const res = matrix.gather(indexes)
                // const norm = res.sum()
                // const val = newTensor.slice([i-spatialKern, j-spatialKern],[2 * spatialKern + 1, 2 * spatialKern + 1]).mul(res).sum().div(norm) as tf.Tensor1D
                // //console.log(val)
                // outvals.push(val)
                // neighbourhood.dispose()
                // centerVal.dispose()
                // indexes.dispose()
                // res.dispose
                // norm.dispose()
            }
        }
        console.log(outvals)
        console.log(outvals.length)
        console.log(outvals[0])
        // // const result = tf.concat1d(outvals).reshape([width, height])
        // // result.expandDims(2)
        // console.log("RESULT:!!A",result)
        // console.log("RESULT:!!B",result.shape)
        // console.log("RESULT:!!C",result.toString())

        // bm = result.arraySync() as number[][][]

    }) 
    return bm!
}



//// (3) With JS JBF, Only BJF (resize and greyscale, padding are done in gpu)
const matrix_js_map:{[key:string]:any} = {}
const output_memory_map:{[key:string]:any} = {}
const predict_jbf_js = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {

    const off = new OffscreenCanvas(image.width, image.height)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

    const spatialKern = params.smoothingS
    let seg:number[][]|null = null
    let img:number[][]|null = null
    tf.tidy(()=>{
        let orgTensor = tf.browser.fromPixels(imageData)
        let tensor = tf.image.resizeBilinear(orgTensor,[params.processHeight, params.processWidth])
        tensor = tensor.expandDims(0)        
        tensor = tf.cast(tensor, 'float32')
        tensor = tensor.div(255.0)
        let prediction = model!.predict(tensor) as tf.Tensor
        prediction = prediction.squeeze()
        prediction = prediction.softmax()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)

        orgTensor = tf.image.resizeBilinear(orgTensor, [params.jbfWidth, params.jbfHeight])
        predTensor0 = tf.image.resizeBilinear(predTensor0, [params.jbfWidth, params.jbfHeight])
        let newTensor = orgTensor.mean(2).toFloat()
        predTensor0 = predTensor0.squeeze()
        newTensor   = newTensor.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')
        predTensor0 = predTensor0.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')        

        predTensor0 = predTensor0.squeeze()
        predTensor0 = tf.cast(predTensor0.mul(255),'float32')

        seg = predTensor0.arraySync() as number[][]
        img = newTensor.arraySync()  as number[][]
    })

    const width  = params.jbfWidth
    const height = params.jbfHeight

    const matrix_js_map_key = `${params.smoothingR}`
    if(!matrix_js_map[matrix_js_map_key]){
        const gaussianRange   = 1 / Math.sqrt(2*Math.PI * (params.smoothingR*params.smoothingR))
        matrix_js_map[matrix_js_map_key] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*gaussianRange))
        // matrix_js_map[matrix_js_map_key] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*params.smoothingR))
    }

    const output_memory_map_key = `${width}x${height}`
    if(!output_memory_map[output_memory_map_key] || params.staticMemory === false){
        output_memory_map[output_memory_map_key] = Array.from(new Array(height), () => new Array(width).fill(0))
    }

    const matrix_js = matrix_js_map[matrix_js_map_key]
    const result    = output_memory_map[output_memory_map_key]

    for(let i=spatialKern; i<spatialKern+height; i++){
        for(let j=spatialKern; j<spatialKern+width; j++){
            const centerVal = img![i][j]
            let norm = 0
            let sum  = 0
            for(let ki = 0 ; ki < spatialKern*2+1; ki++){
                for(let kj = 0 ; kj < spatialKern*2+1; kj++){
                    const index = Math.floor(Math.abs(img![i - spatialKern + ki][j-spatialKern + kj] - centerVal))
                    const val = matrix_js[index]
                    norm += val
                    sum += seg![i - spatialKern + ki][j-spatialKern + kj] * val
                }
            }
            result[i - spatialKern][j - spatialKern] = sum/norm
        }
    }
    return result
}

//// (4) With WASM JBF, Only BJF (resize and greyscale, padding are done in gpu)
const predict_jbf_wasm = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {

    const jbf = await JBFWasm.getInstance()
    

    const off = new OffscreenCanvas(image.width, image.height)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

    const spatialKern = params.smoothingS

    let seg:number[][]|null = null
    let img:number[][]|null = null
    tf.tidy(()=>{
        let orgTensor = tf.browser.fromPixels(imageData)
        let tensor = tf.image.resizeBilinear(orgTensor,[params.processHeight, params.processWidth])
        tensor = tensor.expandDims(0)        
        tensor = tf.cast(tensor, 'float32')
        tensor = tensor.div(255.0)
        let prediction = model!.predict(tensor) as tf.Tensor
        prediction = prediction.squeeze()
        prediction = prediction.softmax()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)

        orgTensor = tf.image.resizeBilinear(orgTensor, [params.jbfWidth, params.jbfHeight])
        predTensor0 = tf.image.resizeBilinear(predTensor0, [params.jbfWidth, params.jbfHeight])
        let newTensor = orgTensor.mean(2).toFloat()
        predTensor0 = predTensor0.squeeze()
        newTensor   = newTensor.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')
        predTensor0 = predTensor0.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')        

        predTensor0 = predTensor0.squeeze()

        predTensor0 = tf.cast(predTensor0.mul(255),'float32')
        newTensor   = tf.cast(newTensor, 'float32')
        seg = predTensor0.arraySync() as number[][]
        img = newTensor.arraySync()  as number[][]
    })

    const width  = params.jbfWidth
    const height = params.jbfHeight
    jbf.srcMemory?.set(img!.flat())
    jbf.segMemory?.set(seg!.flat())


    const output_memory_map_key = `${width}x${height}`
    if(!output_memory_map[output_memory_map_key] || params.staticMemory === false){
        output_memory_map[output_memory_map_key] = Array.from(new Array(height), () => new Array(width).fill(0))
    }
    const result    = output_memory_map[output_memory_map_key]

    jbf.doFilter(width, height, spatialKern, params.smoothingR)

    for(let i=0; i<height; i++){
        for(let j=0; j<width; j++){
            result[i][j] = jbf.outMemory![i*width + j]
        }
    }
    return result
}

//// (5) With JS JBF, JBF and resize and greyscale, padding
const segCanvas = new OffscreenCanvas(100,100)
const segResizedCanvas = new OffscreenCanvas(100,100)
const imgResizedCanvas = new OffscreenCanvas(100,100)
const predict_jbf_js_canvas = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

    const spatialKern = params.smoothingS

    let seg:number[][]|null = null
    let img:number[][]|null = null
    tf.tidy(()=>{
        let orgTensor = tf.browser.fromPixels(imageData)
        // let tensor = tf.image.resizeBilinear(orgTensor,[params.processHeight, params.processWidth])
        let tensor = orgTensor.expandDims(0)        
        tensor = tf.cast(tensor, 'float32')
        tensor = tensor.div(255.0)
        let prediction = model!.predict(tensor) as tf.Tensor
        prediction = prediction.squeeze()
        prediction = prediction.softmax()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)

        predTensor0 = predTensor0.squeeze()
        seg = predTensor0.arraySync() as number[][]
    })

    const width  = params.jbfWidth
    const height = params.jbfHeight
    drawArrayToCanvas(seg!, segCanvas)
    segResizedCanvas.width  = width
    segResizedCanvas.height = height
    const segCtx = segResizedCanvas.getContext("2d")!
    // segCtx.imageSmoothingEnabled = true;
    // segCtx.imageSmoothingQuality = "low"
    // //@ts-ignore
    // segCtx.mozImageSmoothingEnabled = true;
    // //@ts-ignore
    // segCtx.webkitImageSmoothingEnabled = true;
    // //@ts-ignore
    // segCtx.msImageSmoothingEnabled = true;

    segCtx.drawImage(segCanvas, 0, 0, width, height)
    const segImg = segCtx.getImageData(0, 0, width, height)
    seg = imageToGrayScaleArray(segImg)
    seg = padSymmetricImage(seg, spatialKern, spatialKern, spatialKern, spatialKern)
    imgResizedCanvas.width  = width
    imgResizedCanvas.height = height
    const imgCtx = segResizedCanvas.getContext("2d")!
    imgCtx.drawImage(image, 0, 0, width, height)
    const imgImg = imgCtx.getImageData(0, 0, width, height)
    img = imageToGrayScaleArray(imgImg)
    img = padSymmetricImage(img, spatialKern, spatialKern, spatialKern, spatialKern)


    const matrix_js_map_key = `${params.smoothingR}`
    if(!matrix_js_map[matrix_js_map_key]){
        const gaussianRange   = 1 / Math.sqrt(2*Math.PI * (params.smoothingR*params.smoothingR))
        matrix_js_map[matrix_js_map_key] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*gaussianRange))
    }
    const matrix_js = matrix_js_map[`${params.smoothingR}`]

    const result = Array.from(new Array(height), () => new Array(width).fill(0));
    for(let i=spatialKern; i<spatialKern+height; i++){
        for(let j=spatialKern; j<spatialKern+width; j++){
            const centerVal = img![i][j]
            let norm = 0
            let sum  = 0
            for(let ki = 0 ; ki < spatialKern*2+1; ki++){
                for(let kj = 0 ; kj < spatialKern*2+1; kj++){
                    const index = Math.floor(Math.abs(img![i - spatialKern + ki][j-spatialKern + kj] - centerVal))
                    const val = matrix_js[index]
                    norm += val
                    sum += seg![i - spatialKern + ki][j-spatialKern + kj] * val
                }
            }
            result[i - spatialKern][j - spatialKern] = sum/norm
        }
    }
    return result
}

// Case.2 Use ImageBitmap (for Safari or special intent)
//// (1) 
const predictWithData = async (data: Uint8ClampedArray , config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]> => {
    // const imageData = new ImageData(data, params.processWidth, params.processHeight)
    const imageData = new ImageData(data, params.originalWidth, params.originalHeight)

       
    let bm:number[][][]|null = null
    tf.tidy(()=>{
        let tensor = tf.browser.fromPixels(imageData)
        tensor = tf.image.resizeBilinear(tensor,[params.processHeight, params.processWidth])

        tensor = tensor.expandDims(0)
        tensor = tf.cast(tensor, 'float32')

        tensor = tensor.div(255.0)

        let prediction = model!.predict(tensor) as tf.Tensor
        prediction = prediction.softmax()
        prediction = prediction.squeeze()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)
        predTensor0 = predTensor0.squeeze()
        predTensor0 = tf.cast(predTensor0.mul(255),'float32')
        bm = predTensor0.arraySync() as number[][][]
   })
    return bm!
}

// //// (2) not implement
// //// (3) With JS JBF, Only BJF (resize and greyscale, padding are done in gpu)
const predict_jbf_js_WithData = async (data: Uint8ClampedArray, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    const imageData = new ImageData(data, params.originalWidth, params.originalHeight)

    const spatialKern = params.smoothingS
    let seg:number[][]|null = null
    let img:number[][]|null = null
    tf.tidy(()=>{
        let orgTensor = tf.browser.fromPixels(imageData)
        let tensor = tf.image.resizeBilinear(orgTensor,[params.processHeight, params.processWidth])
        tensor = tensor.expandDims(0)        
        tensor = tf.cast(tensor, 'float32')
        tensor = tensor.div(255.0)
        let prediction = model!.predict(tensor) as tf.Tensor
        prediction = prediction.squeeze()
        prediction = prediction.softmax()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)

        orgTensor = tf.image.resizeBilinear(orgTensor, [params.jbfWidth, params.jbfHeight])
        predTensor0 = tf.image.resizeBilinear(predTensor0, [params.jbfWidth, params.jbfHeight])
        let newTensor = orgTensor.mean(2).toFloat()
        predTensor0 = predTensor0.squeeze()
        newTensor   = newTensor.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')
        predTensor0 = predTensor0.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')        

        predTensor0 = predTensor0.squeeze()
        predTensor0 = tf.cast(predTensor0.mul(255),'float32')

        seg = predTensor0.arraySync() as number[][]
        img = newTensor.arraySync()  as number[][]
    })

    const width  = params.jbfWidth
    const height = params.jbfHeight

    const matrix_js_map_key = `${params.smoothingR}`
    if(!matrix_js_map[matrix_js_map_key]){
        const gaussianRange   = 1 / Math.sqrt(2*Math.PI * (params.smoothingR*params.smoothingR))
        matrix_js_map[matrix_js_map_key] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*gaussianRange))
        // matrix_js_map[matrix_js_map_key] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*params.smoothingR))
    }

    const output_memory_map_key = `${width}x${height}`
    if(!output_memory_map[output_memory_map_key] || params.staticMemory === false){
        output_memory_map[output_memory_map_key] = Array.from(new Array(height), () => new Array(width).fill(0))
    }

    const matrix_js = matrix_js_map[matrix_js_map_key]
    const result    = output_memory_map[output_memory_map_key]

    for(let i=spatialKern; i<spatialKern+height; i++){
        for(let j=spatialKern; j<spatialKern+width; j++){
            const centerVal = img![i][j]
            let norm = 0
            let sum  = 0
            for(let ki = 0 ; ki < spatialKern*2+1; ki++){
                for(let kj = 0 ; kj < spatialKern*2+1; kj++){
                    const index = Math.floor(Math.abs(img![i - spatialKern + ki][j-spatialKern + kj] - centerVal))
                    const val = matrix_js[index]
                    norm += val
                    sum += seg![i - spatialKern + ki][j-spatialKern + kj] * val
                }
            }
            result[i - spatialKern][j - spatialKern] = sum/norm
        }
    }
    return result
}


//// (4) With WASM JBF, Only BJF (resize and greyscale, padding are done in gpu)
const predict_jbf_wasm_WithData = async (data: Uint8ClampedArray, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {

    const jbf = await JBFWasm.getInstance()
    
    const imageData = new ImageData(data, params.originalWidth, params.originalHeight)

    const spatialKern = params.smoothingS

    let seg:number[][]|null = null
    let img:number[][]|null = null
    tf.tidy(()=>{
        let orgTensor = tf.browser.fromPixels(imageData)
        let tensor = tf.image.resizeBilinear(orgTensor,[params.processHeight, params.processWidth])
        tensor = tensor.expandDims(0)        
        tensor = tf.cast(tensor, 'float32')
        tensor = tensor.div(255.0)
        let prediction = model!.predict(tensor) as tf.Tensor
        prediction = prediction.squeeze()
        prediction = prediction.softmax()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)

        orgTensor = tf.image.resizeBilinear(orgTensor, [params.jbfWidth, params.jbfHeight])
        predTensor0 = tf.image.resizeBilinear(predTensor0, [params.jbfWidth, params.jbfHeight])
        let newTensor = orgTensor.mean(2).toFloat()
        predTensor0 = predTensor0.squeeze()
        newTensor   = newTensor.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')
        predTensor0 = predTensor0.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')        

        predTensor0 = predTensor0.squeeze()

        predTensor0 = tf.cast(predTensor0.mul(255),'float32')
        newTensor   = tf.cast(newTensor, 'float32')
        seg = predTensor0.arraySync() as number[][]
        img = newTensor.arraySync()  as number[][]
    })

    const width  = params.jbfWidth
    const height = params.jbfHeight
    jbf.srcMemory?.set(img!.flat())
    jbf.segMemory?.set(seg!.flat())


    const output_memory_map_key = `${width}x${height}`
    if(!output_memory_map[output_memory_map_key] || params.staticMemory === false){
        output_memory_map[output_memory_map_key] = Array.from(new Array(height), () => new Array(width).fill(0))
    }
    const result    = output_memory_map[output_memory_map_key]

    jbf.doFilter(width, height, spatialKern, params.smoothingR)

    for(let i=0; i<height; i++){
        for(let j=0; j<width; j++){
            result[i][j] = jbf.outMemory![i*width + j]
        }
    }
    return result
}

//// (5) With JS JBF, JBF and resize and greyscale, padding
// Not implement. resize function is not implemented without Canvas


onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config = event.data.config as GoogleMeetSegmentationConfig


        await load_module(config)
        tf.ready().then(async()=>{
            tf.env().set('WEBGL_CPU_FORWARD', false)
            model = await tf.loadGraphModel(config.modelPath)
            console.log(model.inputs)
            console.log(model.inputNodes)
            console.log(model.outputs)
            console.log(model.outputNodes)
            ctx.postMessage({ message: WorkerResponse.INITIALIZED})
        })
    } else if (event.data.message === WorkerCommand.PREDICT) {
        //    console.log("requested predict bodypix.")
        const image: ImageBitmap = event.data.image
        const data = event.data.data
        const config: GoogleMeetSegmentationConfig = event.data.config
        const params: GoogleMeetSegmentationOperationParams = event.data.params
        const uid: number = event.data.uid

        console.log("current backend[worker thread]:",tf.getBackend())
        if(data){ // Case.2
            if(params.smoothingS == 0 && params.smoothingR == 0){
                const prediction  = await predictWithData(data, config, params)
                ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
            }else{
                let prediction
                switch(params.smoothingType){
                    case GoogleMeetSegmentationSmoothingType.JS:
                        prediction = await predict_jbf_js_WithData(data, config, params)
                        break
                    case GoogleMeetSegmentationSmoothingType.WASM:
                        prediction = await predict_jbf_wasm_WithData(data, config, params)
                        break
                    case GoogleMeetSegmentationSmoothingType.JS_CANVAS:
                        console.log("not support smoothing type", "JS_CANVAS")
                        prediction = await predict_jbf_js_WithData(data, config, params)
                        break
                }
                ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
            }
        }else{ // Case.1
            if(params.smoothingS == 0 && params.smoothingR == 0){
                const prediction = await predict(image, config, params)
                ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
            }else{
                let prediction
                switch(params.smoothingType){
                    case GoogleMeetSegmentationSmoothingType.JS:
                        prediction = await predict_jbf_js(image, config, params)
                        break
                    case GoogleMeetSegmentationSmoothingType.WASM:
                        prediction = await predict_jbf_wasm(image, config, params)
                        break
                    case GoogleMeetSegmentationSmoothingType.GPU:
                        prediction = await predict_jbf_gpu(image, config, params)
                        break
                    case GoogleMeetSegmentationSmoothingType.JS_CANVAS:
                        prediction = await predict_jbf_js_canvas(image, config, params)
                        break
                }
                ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
            }
        }
    }
}
