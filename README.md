This repository is the zoo of image processing webworkers for javascript.
You can use these workers as npm package.

Note. some module is not provided as webworker for safari because of it's restriction.

<a href="https://www.buymeacoffee.com/wokad" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

# Webworkers

<!-- @import "[TOC]" {cmd="toc" depthFrom=1 depthTo=6 orderedList=false} -->

<!-- code_chunk_output -->

- [Webworkers](#webworkers)
  - [bodypix](#bodypix)
    - [installation and usage](#installation-and-usage)
    - [demo](#demo)
  - [facemesh](#facemesh)
    - [installation and usage](#installation-and-usage-1)
    - [demo](#demo-1)
  - [asciiart](#asciiart)
    - [installation and usage](#installation-and-usage-2)
    - [demo](#demo-2)
  - [opencv](#opencv)
    - [installation and usage](#installation-and-usage-3)
    - [demo](#demo-3)
  - [PoseNet](#posenet)
    - [installation and usage](#installation-and-usage-4)
    - [demo](#demo-4)
  - [HandPose](#handpose)
    - [installation and usage](#installation-and-usage-5)
    - [demo](#demo-5)
  - [White-Box-Cartoon](#white-box-cartoon)
    - [installation and usage](#installation-and-usage-6)
    - [demo](#demo-6)
    - [License](#license)
    - [Citation](#citation)
  - [BiseNetv2 Celeb A Mask](#bisenetv2-celeb-a-mask)
    - [installation and usage](#installation-and-usage-7)
    - [demo](#demo-7)
    - [reference](#reference)
  - [U^2-Net Portrait Drawing](#u2-net-portrait-drawing)
    - [installation and usage](#installation-and-usage-8)
    - [demo](#demo-8)
  - [MODNet](#modnet)
    - [installation and usage](#installation-and-usage-9)
    - [demo](#demo-9)
    - [Licnece](#licnece)
  - [Google meet person segmentation](#google-meet-person-segmentation)
    - [installation and usage](#installation-and-usage-10)
    - [demo](#demo-10)
  - [Multi Barcode Scanner](#multi-barcode-scanner)
    - [installation and usage](#installation-and-usage-11)
    - [demo](#demo-11)
    - [demo(movie)](#demomovie)
    - [Licnece](#licnece-1)
  - [Super Resolution](#super-resolution)
    - [installation and usage](#installation-and-usage-12)
    - [demo](#demo-12)
  - [Blazeface](#blazeface)
    - [installation and usage](#installation-and-usage-13)
    - [demo](#demo-13)
  - [MediaPipe Hands](#mediapipe-hands)
    - [installation and usage](#installation-and-usage-14)
    - [demo](#demo-14)
  - [MediaPipe Face landmark detection](#mediapipe-face-landmark-detection)
    - [installation and usage](#installation-and-usage-15)
    - [demo](#demo-15)
  - [MediaPipe BlazePose](#mediapipe-blazepose)
    - [installation and usage](#installation-and-usage-16)
    - [demo](#demo-16)
  - [MediaPipe Mix](#mediapipe-mix)
    - [installation and usage](#installation-and-usage-17)
    - [demo](#demo-17)
  - [MediaPipe Mix2](#mediapipe-mix2)
    - [installation and usage](#installation-and-usage-18)
    - [demo](#demo-18)
- [TFLite Wasm](#tflite-wasm)
  - [Google meet person segmentation(TFLite wasm)](#google-meet-person-segmentationtflite-wasm)
    - [demo](#demo-19)
  - [White-Box-Cartoon(TFLite wasm)](#white-box-cartoontflite-wasm)
    - [demo](#demo-20)
    - [License](#license-1)
  - [ESPCN (TFLite wasm)](#espcn-tflite-wasm)
    - [demo](#demo-21)
- [Libs](#libs)
  - [FaceSwap](#faceswap)
    - [demo](#demo-22)
- [Experiments](#experiments)
  - [Exp.1 Multi-version based tfjs model](#exp1-multi-version-based-tfjs-model)
    - [demo](#demo-23)
    - [src](#src)
    - [Citation](#citation-1)
  - [Exp.2 Performance improvement](#exp2-performance-improvement)
    - [demo](#demo-24)
    - [src](#src-1)
    - [Citation](#citation-2)
- [Reference](#reference-1)

<!-- /code_chunk_output -->

## bodypix

![image](https://user-images.githubusercontent.com/48346627/95987700-be773780-0e62-11eb-9645-40b7c0adb826.png)

### installation and usage

[See here](/001_bodypix-worker-js)

### demo

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t01_bodypix/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t01_bodypix/index.html)

## facemesh

![image](https://user-images.githubusercontent.com/48346627/98291984-534afc00-1fef-11eb-9e89-33b5f267b28c.png)

https://user-images.githubusercontent.com/48346627/162351316-0b640df7-4b92-4bf7-97ea-39c531a591a2.mp4

### installation and usage

[See here](/002_facemesh-worker-js)

### demo

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t02_facemesh/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t02_facemesh/index.html)

## asciiart

![image](https://user-images.githubusercontent.com/48346627/95987874-fc745b80-0e62-11eb-95ac-43b3d998d50f.png)

### installation and usage

[See here](/003_ascii-worker-js)

### demo

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t03_asciiart/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t03_asciiart/index.html)

## opencv

![image](https://user-images.githubusercontent.com/48346627/95988031-40676080-0e63-11eb-81a6-0262a24f685e.png)

### installation and usage

[See here](/004_opencv-worker-js)

### demo

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t04_opencv/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t04_opencv/index.html)

## PoseNet

![image](https://user-images.githubusercontent.com/48346627/95988122-6260e300-0e63-11eb-9b1e-8712b47410dd.png)

### installation and usage

[See here](/005_posenet-worker-js)

### demo

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t05_posenet/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t05_posenet/index.html)

## HandPose

![image](https://user-images.githubusercontent.com/48346627/95988209-88868300-0e63-11eb-809a-35a52b7f77fe.png)

### installation and usage

[See here](/006_handpose-worker-js)

### demo

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t06_handpose/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t06_handpose/index.html)

## White-Box-Cartoon

![image](https://user-images.githubusercontent.com/48346627/96987969-aab48b00-155e-11eb-8b81-cd0e522ac974.png)

### installation and usage

[See here](/007_white-box-cartoonization-worker-js)

### demo

Note: very heavy process. It will take 40second or more to process one frame. be patient...
[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t07_white-box-cartoonization/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t07_white-box-cartoonization/index.html)

### License

White-box CartoonGAN

```
Copyright (C) Xinrui Wang All rights reserved. Licensed under the CC BY-NC-SA 4.0
license (https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode).
Commercial application is prohibited, please remain this license if you clone this repo
```

### Citation

- [Cartoonize your video on your browser](https://dannadori.medium.com/cartoonize-your-video-on-your-browser-1db8d1c18e4)
- [ブラウザ上で画像をアニメ化する。](https://note.com/wokwok/n/nef799e9a7d46)

## BiseNetv2 Celeb A Mask

![image](https://user-images.githubusercontent.com/48346627/97803282-822e3e80-1c8c-11eb-8635-74d937e5a8f6.png)

### installation and usage

[See here](/008_bisenetv2-celebamask-worker-js)

### demo

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t08_bisenetv2-celebamask/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t08_bisenetv2-celebamask/index.html)

### reference

[Enable arbitry resolution](https://github.com/w-okada/bisenetv2-tensorflow)

## U^2-Net Portrait Drawing

![image](https://user-images.githubusercontent.com/48346627/101999201-fba25d80-3d1d-11eb-8e63-445cb6abf204.png)

![image](https://user-images.githubusercontent.com/48346627/139657620-c5224e11-333d-422c-a0bb-51870af6219e.png)

### installation and usage

[See here](/009_u2net-portrait-worker-js)

### demo

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t09_u2net-portrait/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t09_u2net-portrait/index.html)

## MODNet

![image](https://user-images.githubusercontent.com/48346627/113265897-9c3d7d00-930f-11eb-95ca-98529cccb7a6.png)

### installation and usage

[See here](/010_modnet-worker-js)

### demo

Note: Very heavy processing to open.

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t10_modnet/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t10_modnet/index.html)

### Licnece

This project (code, pre-trained models, demos, etc.) is released under the Creative Commons Attribution NonCommercial ShareAlike 4.0 license.

NOTE: The license will be changed to allow commercial use after this work is accepted by a conference or a journal.

## Google meet person segmentation

![image](https://user-images.githubusercontent.com/48346627/104487132-0b101180-5610-11eb-8182-b1be3470c9c9.png)

### installation and usage

[See here](/011_googlemeet-segmentation-worker-js)

### demo

[all](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t11_googlemeet-segmentation/index.html)
[all(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t11_googlemeet-segmentation/index.html)
[96x160](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t11_googlemeet-segmentation/96x160/index.html)
[96x160(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t11_googlemeet-segmentation/96x160/index.html)
[128x128](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t11_googlemeet-segmentation/128x128/index.html)
[128x128(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t11_googlemeet-segmentation/128x128/index.html)
[144x256](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t11_googlemeet-segmentation/144x256/index.html)
[144x256(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t11_googlemeet-segmentation/144x256/index.html)
[256x256](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t11_googlemeet-segmentation/256x256/index.html)
[256x256(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t11_googlemeet-segmentation/256x256/index.html)

## Multi Barcode Scanner

![image](https://user-images.githubusercontent.com/48346627/118266526-b1ecb780-b4f5-11eb-9c25-d32a42e852ce.gif)

### installation and usage

[See here](/012_barcode-scanner-worker-js)

### demo

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t12_barcode-scanner/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t12_barcode-scanner/index.html)

### demo(movie)

- Pixel3
  https://youtu.be/IrPLMUuWaJk

- Pixel4
  https://youtu.be/Xxz1hFUAnKk

### Licnece

This project (code, pre-trained models, demos, etc.) is released under the Creative Commons Attribution NonCommercial ShareAlike 4.0 license.

## Super Resolution

![image](https://user-images.githubusercontent.com/48346627/128611056-978ee70c-b893-4ee6-96dd-650dec002eba.png)

### installation and usage

[See here](/013_super-resolution-worker-js)

### demo

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t13_super-resolution/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t13_super-resolution/index.html)

## Blazeface

![image](https://user-images.githubusercontent.com/48346627/162868657-d4d6eaa8-0438-49dd-9316-e5ab09d34bd3.png)
![image](https://user-images.githubusercontent.com/48346627/162868780-c5ac0aa0-2ea5-458c-ab0a-ed8b721eb034.png)

### installation and usage

[See here](/014_blazeface-worker-js)

### demo

[demo](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t14_blazeface/index.html)
[demo(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t14_blazeface/index.html)

## MediaPipe Hands

![image](https://user-images.githubusercontent.com/48346627/164013853-e05547f6-f0a3-4477-9b29-06f19b23c88f.png)

### installation and usage

[See here](/015_hand-pose-detection-worker-js)

### demo

[all](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t15_hand-pose-detection/index.html)
[all(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t15_hand-pose-detection/index.html)
[lite](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t15_hand-pose-detection/lite/index.html)
[lite(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t15_hand-pose-detection/lite/index.html)
[full](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t15_hand-pose-detection/full/index.html)
[full(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t15_hand-pose-detection/full/index.html)
[mediapipe](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t15_hand-pose-detection/mediapipe/index.html)
[mediapipe(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t15_hand-pose-detection/mediapipe/index.html)
[tfjs](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t15_hand-pose-detection/tfjs/index.html)
[tfjs(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t15_hand-pose-detection/tfjs/index.html)

## MediaPipe Face landmark detection

![image](https://user-images.githubusercontent.com/48346627/164580815-992b8e7d-4a26-479b-a057-9e7988f04e8d.png)

### installation and usage

[See here](/016_face-landmark-detection-worker-js)

### demo

[all](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t16_face-landmark-detection/index.html)
[all(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t16_face-landmark-detection/index.html)
[short](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t16_face-landmark-detection/short/index.html)
[short(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t16_face-landmark-detection/short/index.html)
[short_with_attention](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t16_face-landmark-detection/short_with_attention/index.html)
[short_with_attention(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t16_face-landmark-detection/short_with_attention/index.html)
[full](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t16_face-landmark-detection/full/index.html)
[full(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t16_face-landmark-detection/full/index.html)
[full_with_attention](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t16_face-landmark-detection/full_with_attention/index.html)
[full_with_attention(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t16_face-landmark-detection/full_with_attention/index.html)
[mediapipe](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t16_face-landmark-detection/mediapipe/index.html)
[mediapipe(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t16_face-landmark-detection/mediapipe/index.html)
[tfjs](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t16_face-landmark-detection/tfjs/index.html)
[tfjs(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t16_face-landmark-detection/tfjs/index.html)

## MediaPipe BlazePose

![image](https://user-images.githubusercontent.com/48346627/166098876-21d18cd1-fb25-40fe-96af-82fe15ff2558.png)

### installation and usage

[See here](/017_blaze-pose-worker-js)

### demo

[all](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t17_blaze-pose/index.html)
[all(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t17_blaze-pose/index.html)
[lite](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t17_blaze-pose/lite/index.html)
[lite(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t17_blaze-pose/lite/index.html)
[full](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t17_blaze-pose/full/index.html)
[full(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t17_blaze-pose/full/index.html)
[heavy](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t17_blaze-pose/heavy/index.html)
[heavy(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t17_blaze-pose/heavy/index.html)
[mediapipe](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t17_blaze-pose/mediapipe/index.html)
[mediapipe(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t17_blaze-pose/mediapipe/index.html)
[tfjs](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t17_blaze-pose/tfjs/index.html)
[tfjs(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t17_blaze-pose/tfjs/index.html)

## MediaPipe Mix

Compose Mediapipe models(hand, face, pose). This module bundles whole models in one file. If you want to split them, use [MediaPipe Mix2](#mediapipe-mix2).

### installation and usage

[See here](/018_mediapipe-mix-worker-js)

### demo

[all](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t18_mediapipe-mix/index.html)
[all(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t18_mediapipe-mix/index.html)


## MediaPipe Mix2
![image](https://user-images.githubusercontent.com/48346627/181917376-fd2cbb95-918c-4564-97df-b9051293fb07.png)

Compose Mediapipe models(hand, face, pose) version2. This module load models from external path. This requires some of skills. If you want to use simply, use  [MediaPipe Mix](#mediapipe-mix).

### installation and usage

[See here](/019_mediapipe-mix2-worker-js)

### demo

[all](https://d3iwgbxa9wipu8.cloudfront.net/P01_wokers/t19_mediapipe-mix2/index.html)
[all(slow)](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t19_mediapipe-mix2/index.html)



# TFLite Wasm

## Google meet person segmentation(TFLite wasm)

[see here](https://github.com/w-okada/image-analyze-workers/tree/master/tfl001_google-meet-segmentation)

### demo

https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/tfl001_google-meet-segmentation/index.html

Added Selfie Segmentation[modelcard](https://developers.google.com/ml-kit/images/vision/selfie-segmentation/selfie-model-card.pdf)

## White-Box-Cartoon(TFLite wasm)

[see here](https://github.com/w-okada/image-analyze-workers/tree/master/tfl002_white-box-cartoonization)

### demo

https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/tfl002_white-box-cartoonization/index.html

### License

White-box CartoonGAN

```
Copyright (C) Xinrui Wang All rights reserved. Licensed under the CC BY-NC-SA 4.0
license (https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode).
Commercial application is prohibited, please remain this license if you clone this repo
```

## ESPCN (TFLite wasm)

[see here](https://github.com/w-okada/image-analyze-workers/tree/master/tfl004_super_resolution)

### demo

https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/tfl004_super_resolution/index.html

# Libs

## FaceSwap

Faceswap by using facemesh worker

### demo

https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/lib001_faceswap/index.html

# Experiments

## Exp.1 Multi-version based tfjs model

With webworker, we can use models which based on the differenct tfjs models.

### demo

https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/exp01_multi-worker-performance/index.html

### src

[here](/exp01_multi-worker-performance)

### Citation

- [Faceswap and Virtual Background on your brower](https://medium.com/@dannadori/faceswap-and-virtual-background-on-your-brower-ada0e8042746)

- [ブラウザ上で顔入れ替えと背景入れ替えをするアプリを作った。](https://note.com/wokwok/n/n5626c8ca5295)

## Exp.2 Performance improvement

With webworker, we can improve performance when we use multiple models.

### demo

https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/exp02_multi-worker-performance_sub/index.html

### src

[src](/exp02_multi-tfjs-worker-performance)

### Citation

- Same as Exp.1

# Reference

This repository was inspired by this site.

https://github.com/terryky/tfjs_webgl_app

Demo images are from pakutaso

http://www.pakutaso.com
