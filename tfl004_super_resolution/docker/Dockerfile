
FROM tensorflow/tensorflow:latest

RUN apt-get update -y && apt-get install -y cmake emacs mlocate git wget

### EMSCRIPTEN
WORKDIR /
RUN git clone https://github.com/emscripten-core/emsdk.git -b 3.1.61 --depth 1 emsdk
# RUN git clone https://github.com/emscripten-core/emsdk.git -b 2.0.31 --depth 1 emsdk
WORKDIR /emsdk
RUN ./emsdk install latest
RUN ./emsdk activate latest

# ### openCV
# WORKDIR /
# RUN git clone https://github.com/opencv/opencv.git -b 4.10.0 --depth 1 opencv
# WORKDIR /opencv
# RUN python3  platforms/js/build_js.py build_wasm             --emscripten_dir=/emsdk/upstream/emscripten --config_only
# RUN python3  platforms/js/build_js.py build_wasm_simd --simd --emscripten_dir=/emsdk/upstream/emscripten --config_only
# ENV OPENCV_JS_WHITELIST /opencv/platforms/js/opencv_js.config.py
# RUN cd build_wasm && /emsdk/upstream/emscripten/emmake make -j$(nproc) && /emsdk/upstream/emscripten/emmake make install
# RUN cd build_wasm_simd && /emsdk/upstream/emscripten/emmake make -j$(nproc) && /emsdk/upstream/emscripten/emmake make install


### Tensorflow
WORKDIR /
# RUN git clone https://github.com/tensorflow/tensorflow.git -b v2.16.2 --depth 1 tensorflow_src
#RUN git clone https://github.com/tensorflow/tensorflow.git -b v2.15.1 --depth 1 tensorflow_src
#RUN git clone https://github.com/tensorflow/tensorflow.git -b v2.14.0 --depth 1 tensorflow_src
# RUN git clone https://github.com/tensorflow/tensorflow.git -b v2.13.1 --depth 1 tensorflow_src
RUN git clone https://github.com/tensorflow/tensorflow.git -b v2.10.1 --depth 1 tensorflow_src
#RUN git clone https://github.com/tensorflow/tensorflow.git -b v2.8.4 --depth 1 tensorflow_src
# RUN git -C /tensorflow_src pull
# RUN git -C /tensorflow_src checkout -b v2.16.2

RUN sed -i 's/"crosstool_top": "\/\/external:android\/emscripten"/"crosstool_top": "\/\/emscripten_toolchain\/everything"/' /tensorflow_src/tensorflow/BUILD

RUN echo "local_repository("              >> /tensorflow_src/WORKSPACE
RUN echo "    name = \"emsdk\","          >> /tensorflow_src/WORKSPACE
RUN echo "    path = \"/emsdk/bazel\","   >> /tensorflow_src/WORKSPACE
RUN echo ")"                              >> /tensorflow_src/WORKSPACE

RUN echo "load(\"@emsdk//:deps.bzl\", emsdk_deps = \"deps\")"   >> /tensorflow_src/WORKSPACE
RUN echo "emsdk_deps()"                                         >> /tensorflow_src/WORKSPACE
RUN echo "load(\"@emsdk//:emscripten_deps.bzl\", emsdk_emscripten_deps = \"emscripten_deps\")"   >> /tensorflow_src/WORKSPACE
RUN echo "emsdk_emscripten_deps()"                                                               >> /tensorflow_src/WORKSPACE

RUN echo "build:wasm --crosstool_top=@emsdk//emscripten_toolchain:everything" >> /tensorflow_src/.bazelrc
RUN echo "build:wasm --cpu=wasm" >> /tensorflow_src/.bazelrc
RUN echo "build:wasm --host_crosstool_top=@bazel_tools//tools/cpp:toolchain" >> /tensorflow_src/.bazelrc

###
WORKDIR /


RUN apt install -y apt-transport-https curl gnupg
RUN curl -fsSL https://bazel.build/bazel-release.pub.gpg | gpg --dearmor >bazel-archive-keyring.gpg
RUN mv bazel-archive-keyring.gpg /usr/share/keyrings
RUN echo "deb [signed-by=/usr/share/keyrings/bazel-archive-keyring.gpg] https://storage.googleapis.com/bazel-apt stable jdk1.8" | tee /etc/apt/sources.list.d/bazel.list
RUN apt update && apt install -y bazel bazel-6.5.0

## docker内で実行。
# /tensorflow/.bazelrcに以下を追加
# build:wasm --crosstool_top=@emsdk//emscripten_toolchain:everything
# build:wasm --cpu=wasm
# build:wasm --host_crosstool_top=@bazel_tools//tools/cpp:toolchain
# 
# /tensorflow/WORKSPACEに以下を追加
#local_repository(
#  name = "emsdk",
#  path = "/emsdk/bazel",
#)
# load("@emsdk//:deps.bzl", emsdk_deps = "deps")
# emsdk_deps()
# 
# load("@emsdk//:emscripten_deps.bzl", emsdk_emscripten_deps = "emscripten_deps")
# emsdk_emscripten_deps()

# minimumのBUIDを変更
# linkopts = tflite_linkopts() + [
#     "-s ALLOW_MEMORY_GROWTH=1",
#     "-s USE_PTHREADS=0",
#     "-s MODULARIZE=1",
#     "-s EXPORT_NAME=createTFLiteModule",
#     "-s INITIAL_MEMORY=536870912",
#     "-O3",
#   ],


# キャッシュが残るからsimdに対応する場合としない場合で環境をクリアして実行する必要がある。
#  bazel build --config=wasm -c opt --copt='-msimd128' //tensorflow/lite/examples/minimal:minimal
#  bazel build --config=wasm -c opt  //tensorflow/lite/examples/minimal:minimal



# cp bazel-bin/external/flatbuffers/flatc .
# cp flatc bazel-bin/external/flatbuffers/flatc
