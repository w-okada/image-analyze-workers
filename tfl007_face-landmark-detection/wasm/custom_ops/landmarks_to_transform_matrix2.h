#ifndef TENSORFLOW_LITE_DELEGATES_GPU_COMMON_MEDIAPIPE_LANDMARKS_TO_TRANSFORM_MATRIX_H_
#define TENSORFLOW_LITE_DELEGATES_GPU_COMMON_MEDIAPIPE_LANDMARKS_TO_TRANSFORM_MATRIX_H_

#include <cstdint>
#include <vector>

#include "absl/types/any.h"
#include "tensorflow/lite/delegates/gpu/common/model.h"
#include "tensorflow/lite/delegates/gpu/common/model_transformer.h"
#include "tensorflow/lite/delegates/gpu/common/object_reader.h"
#include "tensorflow/lite/delegates/gpu/common/operation_parser.h"
#include "tensorflow/lite/delegates/gpu/common/shape.h"
#include "tensorflow/lite/delegates/gpu/common/status.h"
#include "tensorflow/lite/delegates/gpu/common/types.h"

namespace tflite
{
    namespace gpu
    {

        constexpr const char kLandmarksToTransformMatrixType[] =
            "landmarks_to_transform_matrix";

        struct LandmarksToTransformMatrixV1Attributes
        {
            int dimensions;
            int landmarks_range;
            int left_rotation_idx;
            int right_rotation_idx;
            float bbox_size_multiplier;
            HW input_hw;
            HW output_hw;
            std::vector<int2> subset;
        };

        struct LandmarksToTransformMatrixV2Attributes
        {
            std::vector<int2> subset_idxs;
            int left_rotation_idx;
            int right_rotation_idx;
            float target_rotation_radians;
            int output_height;
            int output_width;
            float scale_x;
            float scale_y;
            float multiplier = 1.0;
        };

        class LandmarksToTransformMatrixOperationParser : public TFLiteOperationParser
        {
        public:
            absl::Status IsSupported(const TfLiteContext *context,
                                     const TfLiteNode *tflite_node,
                                     const TfLiteRegistration *registration) final;
            absl::Status Parse(const TfLiteNode *tflite_node,
                               const TfLiteRegistration *registration,
                               GraphFloat32 *graph, ObjectReader *reader) final;
        };

        absl::Status ParseLandmarksToTransformMatrixV1Attributes(
            const void *data, uint32_t data_size,
            LandmarksToTransformMatrixV1Attributes *attr, BHWC *output_shape);

        absl::Status ParseLandmarksToTransformMatrixV2Attributes(
            const void *data, uint32_t data_size,
            LandmarksToTransformMatrixV2Attributes *attr, BHWC *output_shape);

        // Converts subgraph of Reshape + Mul + Landmarks2TransformMatrix.v2 into
        // Landmarks2TransformMatrix.v2 with multiplier:
        // Source subgraph:
        //
        //        Value_0 [1, 1, 1, 30]
        //                |
        //             Reshape
        //                |
        //        Value_1 [1, 10, 3]
        //                |
        //          Mul (* 0.25)
        //                |
        //        Value_2 [1, 10, 3]
        //                |
        //    Landmarks2TransformMatrix.v2
        //                |
        //        Value_3 [1, 1, 4]
        //
        // Resulting subgraph:
        //
        //        Value_0 [1, 1, 1, 30]
        //                |
        //    Landmarks2TransformMatrix.v2
        //                |
        //        Value_3 [1, 1, 4]
        class LandmarksToTransformMatrixV2ToV2WithMul : public NodeTransformation
        {
        public:
            TransformResult ApplyToNode(Node *node, GraphFloat32 *graph) final;
        };

    } // namespace gpu
} // namespace tflite

#endif // TENSORFLOW_LITE_DELEGATES_GPU_COMMON_MEDIAPIPE_LANDMARKS_TO_TRANSFORM_MATRIX_H_