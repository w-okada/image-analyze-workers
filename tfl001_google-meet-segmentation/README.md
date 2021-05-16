# TFLite Wasm for Google Meet Segmentation
## Build wasm
```
$ npm run build_docker
$ npm run start_docker
$ npm run start_docker_simd
$ npm run build_wasm
$ npm run build_wasm_simd
$ npm run stop_docker
$ npm run stop_docker_simd
```

## Demo
[Visit here]() or run below.

```
$ npm start
```

## Reference


## Caution
Google Meet Segmentation Model is used to under APACHE-2.0 License, but now it is not. I'm not a lawyer, and I don't know much about it, but I generally believe that license changes do not apply retroactively to previous deliverables. However, you should obtain the model at your own risk.
For example, there are the converted model at the model PINTO's zoo. 

Detail descussion is here ([issue](https://github.com/tensorflow/tfjs/issues/4177)).

Once you have obtained the model in a legitimate way, place it in the folder below.
