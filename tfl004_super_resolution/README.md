# TFLite Wasm for ESPCN
## Build wasm
```
$ npm run build_docker
$ npm run start_docker
$ npm run build_wasm
$ npm run build_wasm_simd
$ npm run stop_docker
```
## Note
Safari SIMD is not supported. 

```
invalid opcode 253
```


## Demo
[Visit here](https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/tfl004_super_resolution/index.html) or run below.

```
$ npm start
```


## Reference

This repository's model is generated with the code [here](). And this repository is inspired by [the repository](https://github.com/HighVoltageRocknRoll/sr). And some code is originally in [the repository](https://github.com/HighVoltageRocknRoll/sr).


[paper](https://arxiv.org/abs/1609.05158)


## License

