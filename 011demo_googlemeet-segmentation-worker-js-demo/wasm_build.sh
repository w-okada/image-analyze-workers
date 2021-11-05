cd ../tfl001_google-meet-segmentation && npm run build_wasm_simd && cd -
cp ../tfl001_google-meet-segmentation/public/tflite/* ../011_googlemeet-segmentation-worker-js/resources/wasm/
