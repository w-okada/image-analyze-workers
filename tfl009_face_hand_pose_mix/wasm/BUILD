# Description:
#   TensorFlow Lite minimal inference tool.

load("@org_tensorflow//tensorflow/lite:build_def.bzl", "tflite_linkopts")

cc_binary(
  name = "tflite",
  srcs = [
    "const.hpp",
    "pose-core.cpp", 
    "pose-core.hpp", 
    "pose.hpp", 
    "mediapipe_pose/Anchor.cpp",
    "mediapipe_pose/Anchor.hpp",
    "mediapipe_pose/KeypointDecoder.cpp",
    "mediapipe_pose/KeypointDecoder.hpp",
    "mediapipe_pose/NonMaxSuppression.cpp",
    "mediapipe_pose/NonMaxSuppression.hpp",
    "mediapipe_pose/PackPoseResult.cpp",
    "mediapipe_pose/PackPoseResult.hpp",


    "hand-core.cpp", 
    "hand-core.hpp", 
    "hand.hpp", 
    "custom_ops/transpose_conv_bias.cc", 
    "custom_ops/transpose_conv_bias.h",
    "mediapipe_hand/Anchor.cpp",
    "mediapipe_hand/Anchor.hpp",
    "mediapipe_hand/KeypointDecoder.cpp",
    "mediapipe_hand/KeypointDecoder.hpp",
    "mediapipe_hand/NonMaxSuppression.cpp",
    "mediapipe_hand/NonMaxSuppression.hpp",
    "mediapipe_hand/PackPalmResult.cpp",
    "mediapipe_hand/PackPalmResult.hpp",

    "face-core.cpp", 
    "face-core.hpp", 
    "face.hpp", 
    "mediapipe_face/Anchor.cpp",
    "mediapipe_face/Anchor.hpp",
    "mediapipe_face/KeypointDecoder.cpp",
    "mediapipe_face/KeypointDecoder.hpp",
    "mediapipe_face/NonMaxSuppression.cpp",
    "mediapipe_face/NonMaxSuppression.hpp",
    "mediapipe_face/PackFaceResult.cpp",
    "mediapipe_face/PackFaceResult.hpp",


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
    "pose-core.cpp", 
    "pose-core.hpp", 
    "pose.hpp", 
    "mediapipe_pose/Anchor.cpp",
    "mediapipe_pose/Anchor.hpp",
    "mediapipe_pose/KeypointDecoder.cpp",
    "mediapipe_pose/KeypointDecoder.hpp",
    "mediapipe_pose/NonMaxSuppression.cpp",
    "mediapipe_pose/NonMaxSuppression.hpp",
    "mediapipe_pose/PackPoseResult.cpp",
    "mediapipe_pose/PackPoseResult.hpp",


    "hand-core.cpp", 
    "hand-core.hpp", 
    "hand.hpp", 
    "custom_ops/transpose_conv_bias.cc", 
    "custom_ops/transpose_conv_bias.h",
    "mediapipe_hand/Anchor.cpp",
    "mediapipe_hand/Anchor.hpp",
    "mediapipe_hand/KeypointDecoder.cpp",
    "mediapipe_hand/KeypointDecoder.hpp",
    "mediapipe_hand/NonMaxSuppression.cpp",
    "mediapipe_hand/NonMaxSuppression.hpp",
    "mediapipe_hand/PackPalmResult.cpp",
    "mediapipe_hand/PackPalmResult.hpp",

    "face-core.cpp", 
    "face-core.hpp", 
    "face.hpp", 
    "mediapipe_face/Anchor.cpp",
    "mediapipe_face/Anchor.hpp",
    "mediapipe_face/KeypointDecoder.cpp",
    "mediapipe_face/KeypointDecoder.hpp",
    "mediapipe_face/NonMaxSuppression.cpp",
    "mediapipe_face/NonMaxSuppression.hpp",
    "mediapipe_face/PackFaceResult.cpp",
    "mediapipe_face/PackFaceResult.hpp",
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

