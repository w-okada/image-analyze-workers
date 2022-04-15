#ifndef __OPENCV_BARCODE_BARDETECT_HPP__
#define __OPENCV_BARCODE_BARDETECT_HPP__

#include "tensorflow/lite/kernels/register.h"
#include "tensorflow/lite/model.h"
#include "opencv2/opencv.hpp"
#include <list>
#include "handpose.hpp"
#include "custom_ops/transpose_conv_bias.h"
#include "mediapipe/Anchor.hpp"
#include "mediapipe/KeypointDecoder.hpp"
#include "mediapipe/NonMaxSuppression.hpp"
#include "mediapipe/PackPalmResult.hpp"
#include "const.hpp"
std::unique_ptr<tflite::Interpreter> interpreter;

static std::vector<Anchor> s_anchors;

/* -------------------------------------------------- *
 *  Decode palm detection result
 * -------------------------------------------------- */

#define CHECK_TFLITE_ERROR(x)                                  \
    if (!(x))                                                  \
    {                                                          \
        printf("[WASM] Error at %s:%d\n", __FILE__, __LINE__); \
    }

template <typename T, typename U>
class MemoryUtil
{
private:
public:
    char *modelBuffer;
    void initModelBuffer(int size)
    {
        modelBuffer = new char[size];
    }
    char *getModelBufferAddress()
    {
        return modelBuffer;
    }

    int loadModel(int size)
    {
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] - TFLite Model Loader                                  -\n");
        printf("[WASM] - Bug report:                                          -\n");
        printf("[WASM] -   https://github.com/w-okada/image-analyze-workers   -\n");
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] \n");
        printf("[WASM] Loading model of size: %d\n", size);

        // Load model
        std::unique_ptr<tflite::FlatBufferModel> model = tflite::FlatBufferModel::BuildFromBuffer(modelBuffer, size);
        CHECK_TFLITE_ERROR(model != nullptr);

        tflite::ops::builtin::BuiltinOpResolver resolver;
        resolver.AddCustom("Convolution2DTransposeBias",
                           mediapipe::tflite_operations::RegisterConvolution2DTransposeBias());
        tflite::InterpreterBuilder builder(*model, resolver);
        builder(&interpreter);
        CHECK_TFLITE_ERROR(interpreter != nullptr);
        CHECK_TFLITE_ERROR(interpreter->AllocateTensors() == kTfLiteOk);

        int tensorBatch = interpreter->input_tensor(0)->dims->data[0];
        int tensorWidth = interpreter->input_tensor(0)->dims->data[2];
        int tensorHeight = interpreter->input_tensor(0)->dims->data[1];
        int tensorCh = interpreter->input_tensor(0)->dims->data[3];
        printf("[WASM] TensorSize IN:(%d, %d, %d, %d)\n", tensorBatch, tensorWidth, tensorHeight, tensorCh);

        int out0 = interpreter->output_tensor(0)->dims->data[0];
        int outTensorWidth = interpreter->output_tensor(0)->dims->data[2];
        int outTensorHeight = interpreter->output_tensor(0)->dims->data[1];
        int out3 = interpreter->output_tensor(0)->dims->data[3];
        int out4 = interpreter->output_tensor(0)->dims->data[4];
        int out5 = interpreter->output_tensor(0)->dims->data[5];
        int out6 = interpreter->output_tensor(0)->dims->data[6];
        printf("[WASM] TensorSize OUT:(%d, %d, %d, %d, %d, %d, %d)\n", out0, outTensorWidth, outTensorHeight, out3, out4, out5, out6);

        printf("[WASM]: Model Info");

        printf("[WASM]: INTPUT NUM: %lu\n", interpreter->inputs().size());
        for (auto i : interpreter->inputs())
        {
            const TfLiteTensor *tensor = interpreter->tensor(i);
            printf("[WASM]: INTPUT[%d]: Name:%s Size:%zu\n", i, tensor->name, tensor->bytes);
            printf("[WASM]:    TYPE(1:float):%d\n", tensor->type);
            int num = tensor->dims->size;
            printf("[WASM]:    SHAPE:[");
            for (int j = 0; j < num; j++)
            {
                printf("%d ", tensor->dims->data[j]);
            }
            printf("]\n");
        }

        printf("[WASM]: OUTTPUT NUM: %lu\n", interpreter->outputs().size());
        for (auto i : interpreter->outputs())
        {
            const TfLiteTensor *tensor = interpreter->tensor(i);
            printf("[WASM]: OUTTPUT[%d]: Name:%s Size:%zu\n", i, tensor->name, tensor->bytes);
            printf("[WASM]:    TYPE(1:float):%d\n", tensor->type);
            int num = tensor->dims->size;
            printf("[WASM]:    SHAPE:[");
            for (int j = 0; j < num; j++)
            {
                printf("%d ", tensor->dims->data[j]);
            }
            printf("]\n");
        }

        generate_ssd_anchors(&s_anchors, PALM_256);
        return 0;
    }

    T *inputBuffer;
    void initInputBuffer(int width, int height, int channel)
    {
        inputBuffer = new T[width * height * channel];
    }
    T *getInputBufferAddress()
    {
        return inputBuffer;
    }

    U *outputBuffer;
    void initOutputBuffer(int width, int height, int channel)
    {
        outputBuffer = new T[width * height * channel];
    }
    U getOutputBufferAddress()
    {
        return outputBuffer;
    }

    void copySrc2Dst(int width, int height, int channel)
    {
        if (outputBuffer == nullptr)
        {
            initOutputBuffer(width, height, channel);
        }
        for (int i = 0; i < width * height * channel; i++)
        {
            if (i % 4 == 0)
            {
                outputBuffer[i] = 10;
            }
            else
            {
                outputBuffer[i] = inputBuffer[i];
            }
        }
    }

    void exec2(int width, int height)
    {
        float *input = interpreter->typed_input_tensor<float>(0);
        // for (auto i : interpreter->inputs())
        // {
        //     input = interpreter->typed_output_tensor<float>(i);
        //     // printf("input tensor[%d]\n", i);
        // }

        printf("%lf , w:%d, h:%d\n", *input, width, height);
        cv::Mat inputImage(height, width, CV_8UC4, inputBuffer);
        cv::Mat inputImageRGB(height, width, CV_8UC3);
        int fromTo[] = {0, 0, 1, 1, 2, 2}; // split alpha channel
        cv::mixChannels(&inputImage, 1, &inputImageRGB, 1, fromTo, 3);
        cv::Mat inputImage32F(height, width, CV_32FC3);

        inputImageRGB.convertTo(inputImage32F, CV_32FC3);
        inputImage32F = inputImage32F / 255.0;

        float mean = 128.0f;
        float std = 128.0f;
        int x, y;
        for (y = 0; y < height; y++)
        {
            for (x = 0; x < width; x++)
            {
                int r = *(inputBuffer + ((width * y) + x) * 4 + 0);
                int g = *(inputBuffer + ((width * y) + x) * 4 + 1);
                int b = *(inputBuffer + ((width * y) + x) * 4 + 2);
                // if (y == 255)
                // {
                //     printf("%d, %d, %d\n", r, g, b);
                // }

                *input++ = (float)(r - mean) / std;
                *input++ = (float)(g - mean) / std;
                *input++ = (float)(b - mean) / std;
            }
        }

        // // (2) Infer
        CHECK_TFLITE_ERROR(interpreter->Invoke() == kTfLiteOk);

        float score_thresh = 0.7f;
        std::list<palm_t> palm_list;

        float *scores_ptr;
        float *points_ptr;

        int output_num = interpreter->outputs().size();
        for (int i = 0; i < output_num; i++)
        {
            int tensor_idx = interpreter->outputs()[i];
            const char *tensor_name = interpreter->tensor(tensor_idx)->name;
            if (strcmp(tensor_name, "regressors") == 0 || strcmp(tensor_name, "Identity:0") == 0 || strcmp(tensor_name, "Identity") == 0)
            {
                // regressors: old-ver, Identity:0: Pinto's, Identity: new-ver
                points_ptr = interpreter->typed_output_tensor<float>(i);
            }
            else if (strcmp(tensor_name, "classificators") == 0 || strcmp(tensor_name, "Identity_1:0") == 0 || strcmp(tensor_name, "Identity_1") == 0)
            {
                scores_ptr = interpreter->typed_output_tensor<float>(i);
            }
            else
            {
                printf("[WASM]: UNKNOWN OUTPUT[%d,%d]: Name:%s\n", i, tensor_idx, tensor_name);
            }
        }

        decode_keypoints(palm_list, score_thresh, points_ptr, scores_ptr, &s_anchors, PALM_256);

        float iou_thresh = 0.03f;
        std::list<palm_t> palm_nms_list;

        non_max_suppression(palm_list, palm_nms_list, iou_thresh);
        // std::for_each(
        //     palm_nms_list.cbegin(), palm_nms_list.cend(), [](palm_t x)
        //     { std::cout << x.score << " " << x.rect.topleft.x << " " << x.rect.topleft.y << " " << x.rect.btmright.x << " " << x.rect.btmright.y << " \n"; });

        palm_detection_result_t *palm_result = new palm_detection_result_t;
        pack_palm_result(palm_result, palm_nms_list);
        printf("palm num::: %d\n", palm_result->num);
        if (palm_result->num > 0)
        {

            for (int i = 0; i < palm_result->num; i++)
            {
                if (i > 19)
                {
                    break;
                }
                std::cout << "result::::" << palm_result->palms[i].score << " " << palm_result->palms[i].rect.topleft.x << " " << palm_result->palms[i].rect.topleft.y << " " << palm_result->palms[i].rect.btmright.x << " " << palm_result->palms[i].rect.btmright.y << " "
                          << " \n";
            }
        }

        // for (auto i : interpreter->outputs())
        // {
        //     const TfLiteTensor *tensor = interpreter->tensor(i);
        //     if (!strcmp(tensor->name, "Identity") == 0)
        //     {
        //         int num = tensor->bytes / 4;
        //     }else if(!strcmp(tensor->name, "Identity_1"){

        //     }else{

        //     }

        //     printf("[wasm]: OUTPUT1:%s %zu\n", tensor->name, tensor->bytes);
        //     printf("[wasm]: OUTPUT2:%d, %d, %d, %d, %d, %d\n", tensor->dims->data[0], tensor->dims->data[1], tensor->dims->data[2], tensor->dims->data[3], tensor->dims->data[4], tensor->dims->data[5]);
        //     printf("[wasm]: OUTPUT3:%d %zu\n", tensor->type, tensor->bytes);
        //     float *output = interpreter->typed_output_tensor<float>(0);
        //     for (int j = 0; j < 4; j++)
        //     {
        //         printf("[wasm]: OUTPUT4:%lf\n", output[j]);
        //     }
        // }
    }
};
#endif //__OPENCV_BARCODE_BARDETECT_HPP__
