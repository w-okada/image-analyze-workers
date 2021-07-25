import { useEffect, useState } from 'react'

declare function createTFLiteModule(): Promise<TFLite>
declare function createTFLiteSIMDModule(): Promise<TFLite>

export interface TFLite extends EmscriptenModule {
    _getModelBufferMemoryOffset(): number
    _getInputImageBufferOffset(): number
    _getOutputImageBufferOffset(): number

    _getInputMemoryOffset():number
    _getOutputMemoryOffset():number

    _loadModel(bufferSize: number): number
    _exec(widht: number, height: number, scale:number, mode:number): number
}

function useTFLite() {
    const [tflite, setTFLite] = useState<TFLite>()
    const [tfliteSIMD, setTFLiteSIMD] = useState<TFLite>()
    const [modelPath, setModelPath] = useState<string>()

    const loadModel = async (t:TFLite, modelPath:string) => {
        const modelResponse = await fetch(modelPath)
        const model = await modelResponse.arrayBuffer()
        console.log('[useTFLite Hook] [loadMeetModel] Model buffer size:', model.byteLength);
        const modelBufferOffset = t._getModelBufferMemoryOffset()
        console.log('[useTFLite] [loadMeetModel] Model buffer memory offset:', modelBufferOffset)
        console.log('[useTFLite] [loadMeetModel] Loading model buffer...')
        t.HEAPU8.set(new Uint8Array(model), modelBufferOffset)

        console.log('[useTFLite] [loadMeetModel] _loadModel result:', t._loadModel(model.byteLength))
        console.log('[useTFLite] [loadMeetModel] Input Image Buffer Offset:', t._getInputImageBufferOffset())
        console.log('[useTFLite] [loadMeetModel] Output Image Buffer Offset:', t._getOutputImageBufferOffset())
        console.log("[useTFLite] [loadMeetModel] TFLITE Loaded!!!!!")
        console.log("[useTFLite] [loadMeetModel] TFLITE Loaded!!!!!" + t._getInputMemoryOffset())
        console.log("[useTFLite] [loadMeetModel] TFLITE Loaded!!!!!" + t._getOutputMemoryOffset())
    }

    useEffect(() => {
        console.log("[useTFLite] Creating Model", modelPath)
        if(!modelPath){
            console.log("[useTFLite] modelPath is undefined")
            return
        }

        createTFLiteModule().then(tflite => {
            loadModel(tflite, modelPath).then(()=>{
                setTFLite(tflite)
            })
        })
        try{
            createTFLiteSIMDModule().then(tflite_simd=>{
                loadModel(tflite_simd, modelPath).then(()=>{
                    setTFLiteSIMD(tflite_simd)
                })
            })
        }catch(e){
            console.log("[useTFLite] simd error",e)
            setTFLiteSIMD(undefined)
        }
    }, [modelPath])


    return { tflite, tfliteSIMD, setModelPath}
}

export default useTFLite
