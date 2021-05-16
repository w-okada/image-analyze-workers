
FROM tensorflow/tensorflow:devel

RUN apt-get update -y && apt-get install -y cmake emacs mlocate

### EMSCRIPTEN
RUN git clone https://github.com/emscripten-core/emsdk.git -b 2.0.14 --depth 1
WORKDIR /emsdk
RUN ./emsdk install latest
RUN ./emsdk activate latest

### openCV
WORKDIR /
RUN git clone https://github.com/opencv/opencv.git -b 4.5.1 --depth 1
RUN git -C /opencv checkout -b 4.5.1
WORKDIR /opencv
RUN python3  platforms/js/build_js.py build_wasm             --emscripten_dir=/emsdk/upstream/emscripten --config_only
RUN python3  platforms/js/build_js.py build_wasm_simd --simd --emscripten_dir=/emsdk/upstream/emscripten --config_only
ENV OPENCV_JS_WHITELIST /opencv/platforms/js/opencv_js.config.py
RUN cd build_wasm && /emsdk/upstream/emscripten/emmake make -j && /emsdk/upstream/emscripten/emmake make install
RUN cd build_wasm_simd && /emsdk/upstream/emscripten/emmake make -j && /emsdk/upstream/emscripten/emmake make install

### Tensorflow
WORKDIR /
RUN git -C /tensorflow_src pull
RUN git -C /tensorflow_src checkout 9d461da4cb0af2f737bbfc68cca3f6445f1ceb60  # May 15, 2021 latest

RUN sed -i 's/"crosstool_top": "\/\/external:android\/emscripten"/"crosstool_top": "\/\/emscripten_toolchain\/everything"/' /tensorflow_src/tensorflow/BUILD


###
WORKDIR /



