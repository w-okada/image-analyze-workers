export const padSymmetricImage = (img:number[][], t:number, b:number, l:number, r:number):number[][] =>{
    const h = img.length
    const w = img[0].length

    const n_h = h + t + b
    const n_w = w + l + r

    const image = Array.from(new Array(n_h)).map((v,i) => Array.from(new Array(n_w)).map((v2,i2) => -1))
    // 生成先の配列のインデックスを基準にする
    //// 縦から攻める(imgを参照)
    for(let i = l; i < l + w; i++){ // 列を固定
        // Top部分
        for(let j = 0; j < t; j++){
            const dist = t - j
            const pos = (dist - 1) % h
            image[j][i] = img[pos][i-l]
        }
        // image 部分
        for(let j = t; j < (t + h); j++){
            image[j][i] = img[j-t][i-l]
        }
        // Bottom部分
        for(let j = (t +h); j < (t + h + b); j++){
            const dist = j - (t + h)
            const pos  = (h - (dist % h)) - 1
            image[j][i] = img[pos][i-l]
        }
    }


    //// 横から攻める (imageを参照) 
    for(let i = 0; i < h + t + b; i++){ // 行を固定
        // Left部分
        for(let j = 0; j < l; j++){
            const dist = l - j
            const pos = (dist - 1) % w
            image[i][j] = image[i][pos+l]
        }
        // Right部分
        for(let j = (l + w); j < (l + w + r); j++){
            const dist = j - (l + w)
            const pos  = (w - (dist % w)) - 1
            image[i][j] = image[i][pos+l]
        }
    }
    
    return image
}


export const drawArrayToCanvas = (array:number[][], canvas:HTMLCanvasElement|OffscreenCanvas) => {
    const h = array.length
    const w = array[0].length
    canvas.width  = w
    canvas.height = h
    const ctx = canvas.getContext("2d")!
    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data

    
    for (let rowIndex = 0; rowIndex < h; rowIndex++) {
      for (let colIndex = 0; colIndex < w; colIndex++) {
        const pix_offset = ((rowIndex * w) + colIndex) * 4
        data[pix_offset + 0] = array[rowIndex][colIndex] * 255
        data[pix_offset + 1] = array[rowIndex][colIndex] * 255
        data[pix_offset + 2] = array[rowIndex][colIndex] * 255
        data[pix_offset + 3] = 255
      }
    }
    const imageDataTransparent = new ImageData(data, w, h);
    ctx.putImageData(imageDataTransparent, 0, 0)
}

export const imageToGrayScaleArray = (img:ImageData):number[][] =>{
    const w = img.width
    const h = img.height
    const data = img.data
    const arr = Array.from(new Array(h)).map((v,i) => Array.from(new Array(w)).map((v2,i2) => -1))
    for (let rowIndex = 0; rowIndex < h; rowIndex++) {
        for (let colIndex = 0; colIndex < w; colIndex++) {
          const pix_offset = ((rowIndex * w) + colIndex) * 4
          arr[rowIndex][colIndex] = (data[pix_offset + 0] + data[pix_offset + 1] +  data[pix_offset + 2]) / 3
        }
    }
    return arr
}

