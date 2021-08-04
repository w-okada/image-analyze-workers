
FROM tensorflow/tensorflow:devel

RUN apt-get update -y && apt-get install -y cmake emacs mlocate


## For Chrome, Firefox
### EMSCRIPTEN
WORKDIR /
RUN git clone https://github.com/emscripten-core/emsdk.git -b 2.0.14 --depth 1 emsdk2.0.14
WORKDIR /emsdk2.0.14
RUN ./emsdk install latest
RUN ./emsdk activate latest
### openCV
WORKDIR /
RUN git clone https://github.com/opencv/opencv.git -b 4.5.1 --depth 1 opencv_for_emsdk2.0.14
WORKDIR /opencv_for_emsdk2.0.14
RUN python3  platforms/js/build_js.py build_wasm             --emscripten_dir=/emsdk2.0.14/upstream/emscripten --config_only
RUN python3  platforms/js/build_js.py build_wasm_simd --simd --emscripten_dir=/emsdk2.0.14/upstream/emscripten --config_only
ENV OPENCV_JS_WHITELIST /opencv_for_emsdk2.0.14/platforms/js/opencv_js.config.py
RUN cd build_wasm && /emsdk2.0.14/upstream/emscripten/emmake make -j$(nproc) && /emsdk2.0.14/upstream/emscripten/emmake make install
RUN cd build_wasm_simd && /emsdk2.0.14/upstream/emscripten/emmake make -j$(nproc) && /emsdk2.0.14/upstream/emscripten/emmake make install

## For Safari
### EMSCRIPTEN
WORKDIR /
RUN git clone https://github.com/emscripten-core/emsdk.git -b 1.40.1 --depth 1 emsdk1.40.1
WORKDIR /emsdk1.40.1
RUN ./emsdk install latest
RUN ./emsdk activate latest

### openCV
WORKDIR /
RUN git clone https://github.com/opencv/opencv.git -b 4.5.1 --depth 1 opencv_for_emsdk1.40.1
WORKDIR /opencv_for_emsdk1.40.1
RUN python3  platforms/js/build_js.py build_wasm             --emscripten_dir=/emsdk1.40.1/upstream/emscripten --config_only
RUN python3  platforms/js/build_js.py build_wasm_simd --simd --emscripten_dir=/emsdk1.40.1/upstream/emscripten --config_only
ENV OPENCV_JS_WHITELIST /opencv_for_emsdk1.40.1/platforms/js/opencv_js.config.py
RUN cd build_wasm && /emsdk1.40.1/upstream/emscripten/emmake make -j$(nproc) && /emsdk1.40.1/upstream/emscripten/emmake make install
RUN sed -i -e "2660,2661d" /opencv_for_emsdk1.40.1/modules/core/include/opencv2/core/hal/intrin_wasm.hpp
RUN cd build_wasm_simd && /emsdk1.40.1/upstream/emscripten/emmake make -j$(nproc) && /emsdk1.40.1/upstream/emscripten/emmake make install




### Tensorflow
WORKDIR /
RUN git -C /tensorflow_src checkout refs/tags/v2.4.1 -b v2.4.1
RUN sed -i 's/"crosstool_top": "\/\/external:android\/emscripten"/"crosstool_top": "\/\/emscripten_toolchain\/everything"/' /tensorflow_src/tensorflow/BUILD
RUN sed -i '/":tvos_arm64": COMMON_SRCS + MACH_SRCS + MACH_ARM_SRCS,/a ":emscripten_wasm": COMMON_SRCS + EMSCRIPTEN_SRCS,' /tensorflow_src/third_party/cpuinfo/BUILD.bazel
COPY workspace.bzl.patch /tensorflow_src/tensorflow/
WORKDIR /tensorflow_src/tensorflow
RUN patch -u < workspace.bzl.patch

### Zbar
WORKDIR /
RUN apt-get update -y 
RUN apt-get install -y autoconf libtool gettext autogen imagemagick libmagickcore-dev 
RUN git clone https://github.com/ZBar/ZBar
WORKDIR /ZBar
###### Delete all -Werror strings from configure.ac
###### Don't treat warnings as errors!
RUN sed -i "s/ -Werror//" $(pwd)/configure.ac
RUN autoreconf -i
RUN /emsdk2.0.14/upstream/emscripten/emconfigure ./configure --without-x --without-jpeg --without-imagemagick --without-npapi --without-gtk --without-python --without-qt --without-xshm --disable-video --disable-pthread
RUN /emsdk2.0.14/upstream/emscripten/emmake make -j && /emsdk2.0.14/upstream/emscripten/emmake make install



### ZXing
WORKDIR /
RUN git clone https://github.com/yushulx/zxing-cpp-emscripten
WORKDIR /zxing-cpp-emscripten/build-wasm
RUN sed -i "s/emconfigure/\/emsdk2.0.14\/upstream\/emscripten\/emcmake/" configure.sh
RUN sed -i "s/emmake/\/emsdk2.0.14\/upstream\/emscripten\/emmake/" build.sh
RUN sed -i '/project(zxing)/a\set(EMSCRIPTEN 1)' CMakeLists.txt
# RUN sed -i 's/set(CMAKE_AR "emcc")/set(CMAKE_AR "\/emsdk\/upstream\/emscripten\/emcc")/' CMakeLists.txt

RUN sed -i 's/set(CMAKE_AR "emcc")/set(CMAKE_AR "\/emsdk2.0.14\/upstream\/emscripten\/emar")/' CMakeLists.txt
RUN sed -i 's/set(CMAKE_STATIC_LIBRARY_SUFFIX ".bc")/set(CMAKE_STATIC_LIBRARY_SUFFIX ".a")/' CMakeLists.txt
RUN sed -i 's/set(CMAKE_C_CREATE_STATIC_LIBRARY "<CMAKE_AR> -o <TARGET> <LINK_FLAGS> <OBJECTS>")/set(CMAKE_C_CREATE_STATIC_LIBRARY "<CMAKE_AR> rcs <TARGET> <LINK_FLAGS> <OBJECTS>")/' CMakeLists.txt
RUN sed -i 's/set(CMAKE_CXX_CREATE_STATIC_LIBRARY "<CMAKE_AR> -o <TARGET> <LINK_FLAGS> <OBJECTS>")/set(CMAKE_CXX_CREATE_STATIC_LIBRARY "<CMAKE_AR> rcs <TARGET> <LINK_FLAGS> <OBJECTS>")/' CMakeLists.txt



RUN ./configure.sh
RUN ./build.sh

###
WORKDIR /
