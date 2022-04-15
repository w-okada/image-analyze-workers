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
std::unique_ptr<tflite::Interpreter> landmarkInterpreter;
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

    ////////////////////////////////////
    // Landmark
    ////////////////////////////////////
    char *landmarkModelBuffer;
    void initLandmarkModelBuffer(int size)
    {
        landmarkModelBuffer = new char[size];
    }
    char *getLandmarkModelBufferAddress()
    {
        return landmarkModelBuffer;
    }

    int loadLandmarkModel(int size)
    {
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] - TFLite Model Loader                                  -\n");
        printf("[WASM] - Bug report:                                          -\n");
        printf("[WASM] -   https://github.com/w-okada/image-analyze-workers   -\n");
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] \n");
        printf("[WASM] Loading model of size: %d\n", size);

        // Load model
        std::unique_ptr<tflite::FlatBufferModel> landmarkModel = tflite::FlatBufferModel::BuildFromBuffer(landmarkModelBuffer, size);
        CHECK_TFLITE_ERROR(landmarkModel != nullptr);

        tflite::ops::builtin::BuiltinOpResolver resolver;
        resolver.AddCustom("Convolution2DTransposeBias",
                           mediapipe::tflite_operations::RegisterConvolution2DTransposeBias());
        tflite::InterpreterBuilder builder(*landmarkModel, resolver);
        builder(&landmarkInterpreter);
        CHECK_TFLITE_ERROR(landmarkInterpreter != nullptr);
        CHECK_TFLITE_ERROR(landmarkInterpreter->AllocateTensors() == kTfLiteOk);

        printf("[WASM]: Model Info");

        printf("[WASM]: INTPUT NUM: %lu\n", landmarkInterpreter->inputs().size());
        for (auto i : landmarkInterpreter->inputs())
        {
            const TfLiteTensor *tensor = landmarkInterpreter->tensor(i);
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

        printf("[WASM]: OUTTPUT NUM: %lu\n", landmarkInterpreter->outputs().size());
        for (auto i : landmarkInterpreter->outputs())
        {
            const TfLiteTensor *tensor = landmarkInterpreter->tensor(i);
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

        return 0;
    }

    T *landmarkInputBuffer;
    void initLandmarkInputBuffer(int width, int height, int channel)
    {
        landmarkInputBuffer = new T[width * height * channel];
    }
    T *getLandmarkInputBufferAddress()
    {
        return landmarkInputBuffer;
    }

    U *landmarkOutputBuffer;
    void initLandmarkOutputBuffer(int width, int height, int channel)
    {
        landmarkOutputBuffer = new T[width * height * channel];
    }
    U getLandmarkOutputBufferAddress()
    {
        return landmarkOutputBuffer;
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
        cv::Mat inputImage32F(height, width, CV_32FC3, input);
        inputImageRGB.convertTo(inputImage32F, CV_32FC3);

        int type = PALM_256;
        if (type == PALM_256)
        {
            float mean = 128.0f;
            float std = 128.0f;
            inputImage32F = (inputImage32F - mean) / std;
        }
        else
        {
            inputImage32F = inputImage32F / 255.0;
        }

        // float mean = 128.0f;
        // float std = 128.0f;
        // int x, y;
        // for (y = 0; y < height; y++)
        // {
        //     for (x = 0; x < width; x++)
        //     {
        //         int r = *(inputBuffer + ((width * y) + x) * 4 + 0);
        //         int g = *(inputBuffer + ((width * y) + x) * 4 + 1);
        //         int b = *(inputBuffer + ((width * y) + x) * 4 + 2);
        //         // if (y == 255)
        //         // {
        //         //     printf("%d, %d, %d\n", r, g, b);
        //         // }

        //         *input++ = (float)(r - mean) / std;
        //         *input++ = (float)(g - mean) / std;
        //         *input++ = (float)(b - mean) / std;
        //     }
        // }

        // // (2) Infer
        CHECK_TFLITE_ERROR(interpreter->Invoke() == kTfLiteOk);

        //// access point to output
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

        //// decode keyoiints
        float score_thresh = 0.7f;
        std::list<palm_t> palm_list;

        decode_keypoints(palm_list, score_thresh, points_ptr, scores_ptr, &s_anchors, PALM_256);

        //// NMS
        float iou_thresh = 0.03f;
        std::list<palm_t> palm_nms_list;
        non_max_suppression(palm_list, palm_nms_list, iou_thresh);
        // std::for_each(
        //     palm_nms_list.cbegin(), palm_nms_list.cend(), [](palm_t x)
        //     { std::cout << x.score << " " << x.rect.topleft.x << " " << x.rect.topleft.y << " " << x.rect.btmright.x << " " << x.rect.btmright.y << " \n"; });

        //// Pack
        palm_detection_result_t *palm_result = new palm_detection_result_t;
        pack_palm_result(palm_result, palm_nms_list);
        printf("palm num::: %d\n", palm_result->num);
        if (palm_result->num > 0)
        {

            for (int i = 0; i < palm_result->num; i++)
            {
                std::cout << "result::::" << palm_result->palms[i].score << " " << palm_result->palms[i].rect.topleft.x << " " << palm_result->palms[i].rect.topleft.y << " " << palm_result->palms[i].rect.btmright.x << " " << palm_result->palms[i].rect.btmright.y << " "
                          << " \n";
            }
        }

        cv::Mat out(256, 256, CV_8UC4, outputBuffer);
        inputImage.copyTo(out);

        if (palm_result->num > 0)
        {
            int width = 256;
            int height = 256;
            for (int i = 0; i < palm_result->num; i++)
            {
                int minX = width;
                int minY = height;
                int maxX = 0;
                int maxY = 0;

                for (int j = 0; j < 4; j++)
                {
                    int pos_x = palm_result->palms[i].hand_pos[j].x * width;
                    int pos_y = palm_result->palms[i].hand_pos[j].y * height;
                    // if (j == 0)
                    // {
                    //     cv::line(out, cv::Point(pos_x, pos_y), cv::Point(pos_x + 2, pos_y + 2), cv::Scalar(200, 0, 0, 255), 20, 4);
                    // }
                    // else if (j == 1)
                    // {
                    //     cv::line(out, cv::Point(pos_x, pos_y), cv::Point(pos_x + 2, pos_y + 2), cv::Scalar(0, 200, 0, 255), 20, 4);
                    // }
                    // else if (j == 2)
                    // {
                    //     cv::line(out, cv::Point(pos_x, pos_y), cv::Point(pos_x + 2, pos_y + 2), cv::Scalar(0, 0, 200, 255), 20, 4);
                    // }
                    // else if (j == 3)
                    // {
                    //     cv::line(out, cv::Point(pos_x, pos_y), cv::Point(pos_x + 2, pos_y + 2), cv::Scalar(200, 200, 0, 255), 20, 4);
                    // }

                    if (pos_x < minX)
                    {
                        minX = pos_x;
                    }
                    if (pos_x > maxX)
                    {
                        maxX = pos_x;
                    }

                    if (pos_y < minY)
                    {
                        minY = pos_y;
                    }
                    if (pos_y > maxY)
                    {
                        maxY = pos_y;
                    }
                }
                printf("crop::%d, %d, %d, %d\n", minX, minY, maxX, maxY);
                if (minX < 0)
                {
                    minX = 0;
                }
                if (maxX > width)
                {
                    maxX = width;
                }
                if (minY < 0)
                {
                    minY = 0;
                }
                if (maxY > height)
                {
                    maxY = height;
                }

                float *landmarkInput = landmarkInterpreter->typed_input_tensor<float>(0);

                int crop_width = maxX - minX;
                int crop_height = maxY - minY;

                cv::Mat hand(inputImage, cv::Rect(minX, minY, crop_width, crop_height));
                cv::Mat resized(height, width, CV_8UC3);
                cv::resize(hand, resized, cv::Size(height, width), 0, 0, cv::INTER_LINEAR);

                cv::Mat inputImageRGB(height, width, CV_8UC3);
                int fromTo[] = {0, 0, 1, 1, 2, 2}; // split alpha channel
                cv::mixChannels(&resized, 1, &inputImageRGB, 1, fromTo, 3);
                cv::Mat inputImage32F(height, width, CV_32FC3, landmarkInput);
                inputImageRGB.convertTo(inputImage32F, CV_32FC3);

                float mean = 128.0f;
                float std = 128.0f;
                inputImage32F = (inputImage32F - mean) / std;

                CHECK_TFLITE_ERROR(landmarkInterpreter->Invoke() == kTfLiteOk);

                int output_num = landmarkInterpreter->outputs().size();
                float *landmark_ptr;
                float *handflag_ptr;
                for (int j = 0; j < output_num; j++)
                {
                    int tensor_idx = landmarkInterpreter->outputs()[j];
                    const char *tensor_name = landmarkInterpreter->tensor(tensor_idx)->name;
                    if (strcmp(tensor_name, "ld_21_3d") == 0)
                    {
                        landmark_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
                    }
                    else if (strcmp(tensor_name, "output_handflag") == 0)
                    {
                        handflag_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
                    }
                    else
                    {
                        printf("[WASM]: UNKNOWN OUTPUT[%d,%d]: Name:%s\n", j, tensor_idx, tensor_name);
                    }
                }
                for (int j = 0; j < 21; j++)
                {
                    // float x = ((*(landmark_ptr + (j * 3) + 0) / width) * (maxX - minX)) + minX;
                    // float y = ((*(landmark_ptr + (j * 3) + 1) / height) * (maxY - minY)) + minY;
                    float x_ratio = landmark_ptr[j * 3 + 0] / width;
                    float y_ratio = landmark_ptr[j * 3 + 1] / height;
                    float x = x_ratio * (maxX - minX) + minX;
                    float y = y_ratio * (maxY - minY) + minY;
                    // float z = *(landmark_ptr + j * 3 + 2);
                    cv::line(out, cv::Point(x, y), cv::Point(x + 2, y + 2), cv::Scalar(200, 200, 0, 255), 20, 4);
                    printf("handflag::::%f(%f,%d, %d), %f(%f,%d, %d), %f\n", x, x_ratio, width, crop_width, y, y_ratio, height, crop_height, *handflag_ptr);
                }
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
