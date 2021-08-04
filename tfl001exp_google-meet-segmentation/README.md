# TFLite Wasm for Google Meet Segmentation

This folder is for blog [japanese](https://cloud.flect.co.jp/entry/2021/05/19/125034), [english](https://dannadori.medium.com/high-speed-and-high-accuracy-barcode-scanner-developed-with-reference-to-the-ai-model-of-google-a3b6631ab9df)

## Build wasm
```
$ npm run build_docker
$ npm run start_docker
$ npm run build_wasm
$ npm run build_wasm_simd
$ npm run build_wasm_for_safari
$ npm run stop_docker
```

## Demo
[Visit here](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/tfl001exp_google-meet-segmentation/index.html) or run below.

```
$ npm start
```

## Reference


## Caution
Google Meet Segmentation Model is used to under APACHE-2.0 License, but now it is not. I'm not a lawyer, and I don't know much about it, but I generally believe that license changes do not apply retroactively to previous deliverables. However, you should obtain the model at your own risk.
For example, there are the converted model at the model PINTO's zoo. 

Detail descussion is here ([issue](https://github.com/tensorflow/tfjs/issues/4177)).

Once you have obtained the model in a legitimate way, place it in the folder below.


