import { GoogleMeetSegmentationConfig,  GoogleMeetSegmentationOperationParams,  WorkerCommand, WorkerResponse, } from './const'
import * as tf from '@tensorflow/tfjs';
import { BrowserType } from './BrowserUtil';
import {setWasmPath} from '@tensorflow/tfjs-backend-wasm';
import { drawArrayToCanvas, imageToGrayScaleArray, padSymmetricImage } from './utils';
import { JointBilateralFilter } from '../crate/pkg'

const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

let model:tf.GraphModel|null
// import("../crate/pkg").then(async(module) => {
//     console.log("MMMMMMMMMMMMMMMMMM1",module)
//     mod = await module['default']
//     console.log("MMMMMMMMMMMMMMMMMM2",mod)
//     console.log("MMMMMMMMMMMMMMMMMM3",mod.greeting())
//     console.log("MMMMMMMMMMMMMMMMMM3",mod.add(1,2))
//     console.log("MMMMMMMMMMMMMMMMMM3",mod.sum1(Uint32Array.from([1,2,3,4,5])))
//     console.log("MMMMMMMMMMMMMMMMMM3",mod.sum2(1))

//     jbf = new mod.JointBilateralFilter(1,2,3,4)
//     console.log("Config:::",jbf.get_config())
// });

class JBF {
    private static _instance:JBF
    private constructor(){}
    private mod?:any
    private jbf?:JointBilateralFilter
    

    public static async  getInstance():Promise<JBF>{
        if(!this._instance){
            console.log("create instance")
            this._instance = new JBF()
            const promise = await import("../crate/pkg")
            this._instance.mod = await promise['default']
            // this._instance.jbf = new this._instance.mod.JointBilateralFilter(1,2,3,4)
        }
        return this._instance
    }

    getConfig = () => {
        console.log("GET CONFIG:::", this.mod?.get_config())
    }
}


const load_module = async (config: GoogleMeetSegmentationConfig) => {
    console.log(config.browserType)
    if(config.useTFWasmBackend || config.browserType === BrowserType.SAFARI){
      console.log("use cpu backend, wasm doesnot support enough function")
      require('@tensorflow/tfjs-backend-wasm')
      setWasmPath(config.wasmPath)
      //await tf.setBackend("wasm")
      await tf.setBackend("cpu")
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
const predict = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)


    let bm:number[][][]|null = null
    tf.tidy(()=>{
        let tensor = tf.browser.fromPixels(imageData)
        // tensor = tf.image.resizeBilinear(tensor,[params.processWidth, params.processHeight])
        tensor = tensor.expandDims(0)
        tensor = tf.cast(tensor, 'float32')
        // tensor = tensor.div(tf.max(tensor))
        // tensor = tensor.sub(0.485).div(0.229)

        // tensor = tensor.div(tf.max(tensor).div(2))
        // tensor = tensor.sub(1.0)

        tensor = tensor.div(255.0)

        let prediction = model!.predict(tensor) as tf.Tensor
        // console.log("Max!",tf.max(prediction).arraySync(), "Min!",tf.min(prediction).arraySync(), )
        //console.log(prediction)
        prediction = prediction.squeeze()
        prediction = prediction.softmax()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)

        bm = predTensor0.arraySync() as number[][][]
    }) 
    // console.log(bm)
    return bm!
}


// Case.1 Use ImageBitmap (for Chrome default)
let spatialKern = 3
const rangeKern = 3
const gaussianRange   = 1 / Math.sqrt(2*Math.PI * (rangeKern*rangeKern))
const matrix = (()=>{
    const t = tf.tensor1d(Array.from(new Array(256)).map((v,i) => i))
    const matrix = t.mul(-1).mul(t).mul(gaussianRange).exp()
    return matrix
})()

const matrix_js_map:{[key:string]:any} = {}
const output_memory_map:{[key:string]:any} = {}
const predict_jbf = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

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
        let outvals = [] 
        for(let i=spatialKern; i<spatialKern+height; i++){
            console.log("row:",i)
            for(let j=spatialKern; j<spatialKern+width; j++){
                // console.log(i,j)
                const neighbourhood = (newTensor as tf.Tensor2D).slice([i-spatialKern, j-spatialKern],[2 * spatialKern + 1, 2 * spatialKern + 1])
                const centerVal = (newTensor as tf.Tensor2D).slice([i,j],[1,1])
                const indexes = neighbourhood.sub(centerVal).abs().toInt()
                const res = matrix.gather(indexes)
                const norm = res.sum()
                const val = newTensor.slice([i-spatialKern, j-spatialKern],[2 * spatialKern + 1, 2 * spatialKern + 1]).mul(res).sum().div(norm) as tf.Tensor1D
                //console.log(val)
                outvals.push(val)
                neighbourhood.dispose()
                centerVal.dispose()
                indexes.dispose()
                res.dispose
                norm.dispose()
            }
        }
        console.log(outvals)
        console.log(outvals.length)
        console.log(outvals[0])
        const result = tf.concat1d(outvals).reshape([width, height])
        result.expandDims(2)
        console.log("RESULT:!!A",result)
        console.log("RESULT:!!B",result.shape)
        console.log("RESULT:!!C",result.toString())

        bm = result.arraySync() as number[][][]

    }) 
    return bm!
}

const predict_jbf_js = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    // const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    // const ctx = off.getContext("2d")!
    // ctx.drawImage(image, 0, 0, off.width, off.height)
    // const imageData = ctx.getImageData(0, 0, off.width, off.height)


    const off = new OffscreenCanvas(image.width, image.height)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

    spatialKern = params.smoothingS

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
        seg = predTensor0.arraySync() as number[][]
        img = newTensor.arraySync()  as number[][]
    })

    const width  = params.jbfWidth
    const height = params.jbfHeight

    const matrix_js_map_key = `${params.smoothingR}`
    if(!matrix_js_map[matrix_js_map_key]){
        matrix_js_map[matrix_js_map_key] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*params.smoothingR))
    }
    const output_memory_map_key = `${width}x${height}`
    if(!output_memory_map[output_memory_map_key] || params.staticMemory === false){
        output_memory_map[output_memory_map_key] = Array.from(new Array(height), () => new Array(width).fill(0))
    }

    const matrix_js = matrix_js_map[matrix_js_map_key]
    const result    = output_memory_map[output_memory_map_key]

    for(let i=spatialKern; i<spatialKern+height; i++){
        // console.log("row:",i)
        for(let j=spatialKern; j<spatialKern+width; j++){
            // console.log("col:",j)
            const centerVal = img![i][j]
            let norm = 0
            let sum  = 0
            for(let ki = 0 ; ki < spatialKern*2+1; ki++){
                // console.log("krow:",ki)
                for(let kj = 0 ; kj < spatialKern*2+1; kj++){
                    // console.log("kcol:",kj)
                    const index = Math.floor(Math.abs(img![i - spatialKern + ki][j-spatialKern + kj] - centerVal))
                    const val = matrix_js[index]
                    // console.log("kcol:a", val, index)
                    // console.log("kcol:b1",kj, kresult, kresult[ki] ,kresult[ki][kj])
                    // console.log("kcol:c",kj)
                    norm += val
                    // console.log("kcol:d",kj)
                    sum += seg![i - spatialKern + ki][j-spatialKern + kj] * val
                    // console.log("kcol:e",kj)
                }
            }
            result[i - spatialKern][j - spatialKern] = sum/norm
        }
    }


    // console.log(result)
    return result
}


const predict_jbf_wasm = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    // const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    // const ctx = off.getContext("2d")!
    // ctx.drawImage(image, 0, 0, off.width, off.height)
    // const imageData = ctx.getImageData(0, 0, off.width, off.height)


    const off = new OffscreenCanvas(image.width, image.height)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

    spatialKern = params.smoothingS

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
        seg = predTensor0.arraySync() as number[][]
        img = newTensor.arraySync()  as number[][]
    })

    const width  = params.jbfWidth
    const height = params.jbfHeight

    if(!matrix_js_map[`${params.smoothingR}`]){
        matrix_js_map[`${params.smoothingR}`] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*params.smoothingR))
    }

    const matrix_js = matrix_js_map[`${params.smoothingR}`]
    // const result:number[][][] = []
    const result = Array.from(new Array(height), () => new Array(width).fill(0));
    for(let i=spatialKern; i<spatialKern+height; i++){
        // console.log("row:",i)
        for(let j=spatialKern; j<spatialKern+width; j++){
            // console.log("col:",j)
            const centerVal = img![i][j]
            let norm = 0
            let sum  = 0
            for(let ki = 0 ; ki < spatialKern*2+1; ki++){
                // console.log("krow:",ki)
                for(let kj = 0 ; kj < spatialKern*2+1; kj++){
                    // console.log("kcol:",kj)
                    const index = Math.floor(Math.abs(img![i - spatialKern + ki][j-spatialKern + kj] - centerVal))
                    const val = matrix_js[index]
                    // console.log("kcol:a", val, index)
                    // console.log("kcol:b1",kj, kresult, kresult[ki] ,kresult[ki][kj])
                    // console.log("kcol:c",kj)
                    norm += val
                    // console.log("kcol:d",kj)
                    sum += seg![i - spatialKern + ki][j-spatialKern + kj] * val
                    // console.log("kcol:e",kj)
                }
            }
            result[i - spatialKern][j - spatialKern] = sum/norm
        }
    }
    // console.log(result)
    return result
}


///// 速度は向上するが精度が劣化する。(GPU -> RAMの転送が遅い部分を解消しているが、精度が落ちる。)
const segCanvas = new OffscreenCanvas(100,100)
const segResizedCanvas = new OffscreenCanvas(100,100)
const imgResizedCanvas = new OffscreenCanvas(100,100)
const predict_jbf_js2 = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

    spatialKern = params.smoothingS

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

        // orgTensor = tf.image.resizeBilinear(orgTensor, [params.jbfWidth, params.jbfHeight])
        // predTensor0 = tf.image.resizeBilinear(predTensor0, [params.jbfWidth, params.jbfHeight])
        // let newTensor = orgTensor.mean(2).toFloat()
        predTensor0 = predTensor0.squeeze()
        // newTensor   = newTensor.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')
        // predTensor0 = predTensor0.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')        

        predTensor0 = predTensor0.squeeze()
        seg = predTensor0.arraySync() as number[][]
        // img = newTensor.arraySync()  as number[][]
    })

    const width  = params.jbfWidth
    const height = params.jbfHeight
    drawArrayToCanvas(seg!, segCanvas)
    segResizedCanvas.width  = width
    segResizedCanvas.height = height
    const segCtx = segResizedCanvas.getContext("2d")!
    segCtx.imageSmoothingEnabled = true;
    segCtx.imageSmoothingQuality = "low"
    //@ts-ignore
    segCtx.mozImageSmoothingEnabled = true;
    //@ts-ignore
    segCtx.webkitImageSmoothingEnabled = true;
    //@ts-ignore
    segCtx.msImageSmoothingEnabled = true;

    segCtx.drawImage(segCanvas, 0, 0, width, height)
    const segImg = segCtx.getImageData(0, 0, width, height)
    seg = imageToGrayScaleArray(segImg)
    seg = padSymmetricImage(seg, spatialKern, spatialKern, spatialKern, spatialKern)
    imgResizedCanvas.width  = width
    imgResizedCanvas.height = height
    const imgCtx = segResizedCanvas.getContext("2d")!
    // imgCtx.imageSmoothingEnabled = true
    // imgCtx.imageSmoothingQuality = "high"
    imgCtx.drawImage(image, 0, 0, width, height)
    const imgImg = imgCtx.getImageData(0, 0, width, height)
    img = imageToGrayScaleArray(imgImg)
    img = padSymmetricImage(img, spatialKern, spatialKern, spatialKern, spatialKern)

    if(!matrix_js_map[`${params.smoothingR}`]){
        matrix_js_map[`${params.smoothingR}`] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*params.smoothingR))
    }
    const matrix_js = matrix_js_map[`${params.smoothingR}`]

    const result = Array.from(new Array(height), () => new Array(width).fill(0));
    for(let i=spatialKern; i<spatialKern+height; i++){
        // console.log("row:",i)
        for(let j=spatialKern; j<spatialKern+width; j++){
            // console.log("col:",j)
            const centerVal = img![i][j]
            let norm = 0
            let sum  = 0
            for(let ki = 0 ; ki < spatialKern*2+1; ki++){
                // console.log("krow:",ki)
                for(let kj = 0 ; kj < spatialKern*2+1; kj++){
                    // console.log("kcol:",kj)
                    const index = Math.floor(Math.abs(img![i - spatialKern + ki][j-spatialKern + kj] - centerVal))
                    const val = matrix_js[index]
                    // console.log("kcol:a", val, index)
                    // console.log("kcol:c",kj)
                    norm += val
                    // console.log("kcol:d",kj)
                    sum += seg![i - spatialKern + ki][j-spatialKern + kj] * val
                    // console.log("kcol:e",kj)
                }
            }
            result[i - spatialKern][j - spatialKern] = sum/norm
        }
    }
    // console.log(result)
    return result
}



// Case.1 Use ImageBitmap (for Chrome default)
const predict_tmp = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)


    let bm:number[][][]|null = null
//    const p = new Promise((onResolve:(v:number[][][])=>void, onFail)=>{
    const p = new Promise((resolve:(v:number[][][])=>void, reject)=>{
        tf.tidy(()=>{
            let tensor = tf.browser.fromPixels(imageData)
            tensor = tensor.expandDims(0)
            tensor = tf.cast(tensor, 'float32')
            tensor = tensor.div(255.0)
    
            let prediction = model!.predict(tensor) as tf.Tensor
            prediction = prediction.squeeze()
            prediction = prediction.softmax()
            let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)
    
            // const tens = tf.ones([1024,1024,3]) as tf.Tensor3D    
            bm = predTensor0.arraySync() as number[][][]
            resolve(bm!)
            // tf.browser.toPixels(tens).then(res=>{
            //     // resolve(bm!)
            // })
            //bm = tens.arraySync() as number[][][]
        }) 
    })
    const res = await p
    return res
}




// // 
// // 特に高速化しない！！(fin.arraySyncで処理時間が爆発する)
// const tiles:{[key:string]:tf.Tensor} = {}
// const tile_zeros:{[key:string]:tf.Tensor} = {}
// const tile_ones:{[key:string]:tf.Tensor} = {}

// const predict_nouse = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
//     const off = new OffscreenCanvas(image.width, image.height)
//     const ctx = off.getContext("2d")!
//     ctx.drawImage(image, 0, 0, off.width, off.height)
//     const imageData = ctx.getImageData(0, 0, off.width, off.height)

//     const th_key = `{params.processWidth}x{params.processHeight}`
//     if(!tiles[th_key]){
//         console.log("create threshold1")
//         tiles[th_key] = tf.ones([params.processHeight, params.processWidth, 1]).mul(0.5)
//     }
//     if(!tile_ones[th_key]){
//         console.log("create threshold2")
//         tile_ones[th_key] = tf.ones([params.processHeight, params.processWidth, 1]).mul(255)
//     }
//     if(!tile_zeros[th_key]){
//         console.log("create threshold3")
//         tile_zeros[th_key] = tf.zeros([params.processHeight, params.processWidth, 1])
//     }
//     const th = tiles[th_key]
//     const tile_one = tile_ones[th_key]
//     const tile_zero = tile_zeros[th_key]

//     let bm:number[][][]|null = null
//     tf.tidy(()=>{
//         let orgTensor = tf.browser.fromPixels(imageData)
//         let tensor = tf.image.resizeBilinear(orgTensor, [params.processWidth, params.processHeight])
//         tensor = tensor.expandDims(0)
//         tensor = tf.cast(tensor, 'float32')
//         tensor = tensor.div(255.0)

//         let prediction = model!.predict(tensor) as tf.Tensor
//         console.log(prediction)
//         prediction = prediction.softmax()
//         prediction = prediction.squeeze()

//         let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)

//         const cond = tf.less(predTensor0, th)
//         predTensor0 = tf.where(cond, tile_zero, tile_one)

//         let predTensor = tf.image.resizeBilinear(predTensor0 as tf.Tensor<tf.Rank.R3>,[image.height, image.width])
//         const fin = tf.concat([orgTensor, predTensor], 2)

//         bm = fin.arraySync() as number[][][]
//     }) 
//     return bm!
// }



// Case.2 Use ImageBitmap (for Safari or special intent)
const predictWithData = async (data: Uint8ClampedArray , config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]> => {
    const imageData = new ImageData(data, params.processWidth, params.processHeight)

    let bm:number[][][]|null = null
    tf.tidy(()=>{
        let tensor = tf.browser.fromPixels(imageData)
        tensor = tensor.expandDims(0)
        tensor = tf.cast(tensor, 'float32')
        // tensor = tensor.div(tf.max(tensor))
        // tensor = tensor.sub(0.485).div(0.229)

        // tensor = tensor.div(tf.max(tensor).div(2))
        // tensor = tensor.sub(1.0)

        tensor = tensor.div(255.0)

        let prediction = model!.predict(tensor) as tf.Tensor
        prediction = prediction.softmax()
        prediction = prediction.squeeze()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)
        bm = predTensor0.arraySync() as number[][][]
   })
    return bm!
}

onmessage = async (event) => {
    //  console.log("event", event)
    // const jbf = await JBF.getInstance()
    // console.log("JBF!", jbf)
    // console.log("JBF!", jbf.getConfig())

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
            console.log("Browser SAFARI")
            const prediction  = await predictWithData(data, config, params)
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
        }else{ // Case.1
            if(params.smoothingS == 0 && params.smoothingR == 0){
                //const prediction = await predict_jbf_wasm(image, config, params)
                const prediction = await predict(image, config, params)
                ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
            }else{
                if(params.resizeWithCanvas){
                    const prediction = await predict_jbf_js2(image, config, params)
                    ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
                }else{
                    const prediction = await predict_jbf_js(image, config, params)
                    ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
                }
            }
        }
    }
}
