# Description:
#   TensorFlow Lite minimal inference tool.

load("@org_tensorflow//tensorflow/lite:build_def.bzl", "tflite_linkopts")

cc_binary(
  name = "tflite",
  srcs = [
    "const.hpp",
    "tflite.cpp", 
    "tflite.hpp", 
    "facemesh.hpp", 
    "mediapipe/Anchor.cpp",
    "mediapipe/Anchor.hpp",
    "mediapipe/KeypointDecoder.cpp",
    "mediapipe/KeypointDecoder.hpp",
    "mediapipe/NonMaxSuppression.cpp",
    "mediapipe/NonMaxSuppression.hpp",
    "mediapipe/PackFaceResult.cpp",
    "mediapipe/PackFaceResult.hpp",
    ],
  linkopts = tflite_linkopts() + [
    "-s ALLOW_MEMORY_GROWTH=1",
    "-s USE_PTHREADS=0",
    "-s MODULARIZE=1",
    "-s EXPORT_NAME=createTFLiteModule",
    "-s INITIAL_MEMORY=1073741824",
    "-O3",
  ],
  deps = [
    "@org_tensorflow//tensorflow/lite:framework",
    "@org_tensorflow//tensorflow/lite:tflite_with_xnnpack",
    "@org_tensorflow//tensorflow/lite/kernels:builtin_ops",
    "@opencv//:opencv",
  ],
)

cc_binary(
  name = "tflite-simd",
  srcs = [
    "const.hpp",
    "tflite.cpp", 
    "tflite.hpp", 
    "facemesh.hpp", 
    "mediapipe/Anchor.cpp",
    "mediapipe/Anchor.hpp",
    "mediapipe/KeypointDecoder.cpp",
    "mediapipe/KeypointDecoder.hpp",
    "mediapipe/NonMaxSuppression.cpp",
    "mediapipe/NonMaxSuppression.hpp",
    "mediapipe/PackFaceResult.cpp",
    "mediapipe/PackFaceResult.hpp",
  ],
  linkopts = tflite_linkopts() + [
    "-s ALLOW_MEMORY_GROWTH=1",
    "-s USE_PTHREADS=0",
    "-s MODULARIZE=1",
    "-s EXPORT_NAME=createTFLiteSIMDModule",
    "-s INITIAL_MEMORY=1073741824",
    "-O3",
  ],
  deps = [
    "@org_tensorflow//tensorflow/lite:framework",
    "@org_tensorflow//tensorflow/lite:tflite_with_xnnpack",
    "@org_tensorflow//tensorflow/lite/kernels:builtin_ops",
    "@opencv//:opencv_simd",
  ],
)

