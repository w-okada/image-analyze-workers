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

#define CHECK_TFLITE_ERROR(x)                                  \
    if (!(x))                                                  \
    {                                                          \
        printf("[WASM] Error at %s:%d\n", __FILE__, __LINE__); \
    }

class MemoryUtil
{
private:
    int palm_input_width = 0;
    int palm_input_height = 0;
    int landmark_input_width = 0;
    int landmark_input_height = 0;

    float *scores_ptr;
    float *points_ptr;
    float *landmark_ptr;
    float *handflag_ptr;
    float *handedness_ptr;

    // int palmTyp = PALM_256;
    int palmType = PALM_192;

public:
    ////////////////////////////////////
    // Palm
    ////////////////////////////////////
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
                if (j == 1)
                {
                    palm_input_height = tensor->dims->data[j];
                }
                if (j == 2)
                {
                    palm_input_width = tensor->dims->data[j];
                }
            }
            printf("]\n");
        }
        if (palm_input_width == 192)
        {
            palmType = PALM_192;
        }
        else
        {
            palmType = PALM_256;
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

        generate_ssd_anchors(&s_anchors, palmType);
        return 0;
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
                if (j == 1)
                {
                    landmark_input_height = tensor->dims->data[j];
                }
                if (j == 2)
                {
                    landmark_input_width = tensor->dims->data[j];
                }
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
        int output_num = landmarkInterpreter->outputs().size();

        for (int j = 0; j < output_num; j++)
        {
            int tensor_idx = landmarkInterpreter->outputs()[j];
            const char *tensor_name = landmarkInterpreter->tensor(tensor_idx)->name;
            if (strcmp(tensor_name, "ld_21_3d") == 0 || strcmp(tensor_name, "Identity") == 0)
            {
                landmark_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "output_handflag") == 0 || strcmp(tensor_name, "Identity_1") == 0)
            {
                handflag_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "Identity_2") == 0)
            {
                handedness_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
            }
            else
            {
                printf("[WASM]: UNKNOWN OUTPUT[%d,%d]: Name:%s\n", j, tensor_idx, tensor_name);
            }
        }

        return 0;
    }

    unsigned char *inputBuffer;
    void initInputBuffer(int width, int height, int channel)
    {
        inputBuffer = new unsigned char[width * height * channel];
        initOutputBuffer();
        initTemporaryBuffer();
    }
    unsigned char *getInputBufferAddress()
    {
        return inputBuffer;
    }

    float *outputBuffer;
    void initOutputBuffer()
    {
        outputBuffer = new float[1024 * 4];
    }
    float *getOutputBufferAddress()
    {
        return outputBuffer;
    }

    unsigned char *temporaryBuffer;
    void initTemporaryBuffer()
    {
        temporaryBuffer = new unsigned char[1024 * 1024 * 4];
    }
    unsigned char *getTemporaryBufferAddress()
    {
        return temporaryBuffer;
    }

    void exec(int width, int height, int max_palm_num)
    {
        float *input = interpreter->typed_input_tensor<float>(0);

        // printf("[WASM] %lf , type:%d, input[w:%d, h:%d]  palm_input[%d, %d] landmark_input[%d, %d]\n", *input, palmType, width, height, palm_input_width, palm_input_height, landmark_input_width, landmark_input_height);
        cv::Mat inputImage(height, width, CV_8UC4, inputBuffer);
        // int squaredSize = std::max(height, width);
        cv::Mat temporaryImage(1024, 1024, CV_8UC4, temporaryBuffer);
        // cv::Mat roi1(temporaryImage, cv::Rect(0, 0, squaredSize, squaredSize));
        // roi1 = cv::Scalar(0, 255, 0, 255);

        cv::Mat inputImageRGB(height, width, CV_8UC3);
        // cv::Mat inputImageRGB(squaredSize, squaredSize, CV_8UC3);
        int fromTo[] = {0, 0, 1, 1, 2, 2}; // split alpha channel
        cv::mixChannels(&inputImage, 1, &inputImageRGB, 1, fromTo, 3);
        // cv::mixChannels(&squaredImage, 1, &inputImageRGB, 1, fromTo, 3);
        cv::Mat resizedInputImageRGB(palm_input_height, palm_input_width, CV_8UC3);
        cv::resize(inputImageRGB, resizedInputImageRGB, resizedInputImageRGB.size());
        cv::Mat inputImage32F(palm_input_height, palm_input_width, CV_32FC3, input);
        resizedInputImageRGB.convertTo(inputImage32F, CV_32FC3);

        if (palmType == PALM_256)
        {
            float mean = 128.0f;
            float std = 128.0f;
            inputImage32F = (inputImage32F - mean) / std;
        }
        else
        {
            inputImage32F = inputImage32F / 255.0;
        }

        // // (2) Infer
        CHECK_TFLITE_ERROR(interpreter->Invoke() == kTfLiteOk);

        //// decode keyoiints
        float score_thresh = 0.2f;
        std::list<palm_t> palm_list;

        decode_keypoints(palm_list, score_thresh, points_ptr, scores_ptr, &s_anchors, palmType);

        //// NMS
        float iou_thresh = 0.005f;
        std::list<palm_t> palm_nms_list;
        non_max_suppression(palm_list, palm_nms_list, iou_thresh, max_palm_num);
        // std::for_each(
        //     palm_nms_list.cbegin(), palm_nms_list.cend(), [](palm_t x)
        //     { std::cout << x.score << " " << x.rect.topleft.x << " " << x.rect.topleft.y << " " << x.rect.btmright.x << " " << x.rect.btmright.y << " \n"; });

        //// Pack
        palm_detection_result_t *palm_result = new palm_detection_result_t;
        pack_palm_result(palm_result, palm_nms_list, max_palm_num);
        // printf("palm num::: %d\n", palm_result->num);
        if (palm_result->num > 0)
        {

            // for (int i = 0; i < palm_result->num; i++)
            // {
            //     std::cout << "result::::" << palm_result->palms[i].score << " " << palm_result->palms[i].rect.topleft.x << " " << palm_result->palms[i].rect.topleft.y << " " << palm_result->palms[i].rect.btmright.x << " " << palm_result->palms[i].rect.btmright.y << " "
            //               << " \n";
            // }
        }

        // cv::Mat out(height, width, CV_8UC4, outputBuffer);
        // inputImage.copyTo(out);

        if (palm_result->num > 0)
        {
            for (int i = 0; i < palm_result->num; i++)
            {
                // if (i != 0)
                // {
                //     continue;
                // }
                int minX = width;
                int minY = height;
                // int minX = squaredSize;
                // int minY = squaredSize;
                int maxX = 0;
                int maxY = 0;

                for (int j = 0; j < 4; j++)
                {
                    // int pos_x = palm_result->palms[i].hand_pos[j].x * squaredSize;
                    // int pos_y = palm_result->palms[i].hand_pos[j].y * squaredSize;
                    int pos_x = palm_result->palms[i].hand_pos[j].x * width;
                    int pos_y = palm_result->palms[i].hand_pos[j].y * height;

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
                if (minX < 0)
                {
                    minX = 0;
                }
                if (maxX > width)
                {
                    maxX = width;
                }
                // if (maxX > squaredSize)
                // {
                //     maxX = squaredSize;
                // }
                if (minY < 0)
                {
                    minY = 0;
                }
                if (maxY > height)
                {
                    maxY = height;
                }
                // if (maxY > squaredSize)
                // {
                //     maxY = squaredSize;
                // }

                float *landmarkInput = landmarkInterpreter->typed_input_tensor<float>(0);

                int crop_width = maxX - minX;
                int crop_height = maxY - minY;
                float org_aspect = (float)height / (float)width;
                float crop_aspect = (float)height / (float)width;
                if (org_aspect < crop_aspect)
                {
                    // cropの縦が大きい -> 縦を基準に横幅を算出
                    crop_width = crop_height * ((float)width / (float)height);
                }
                else
                {
                    // cropの横が大きい -> 横を基準に縦を算出
                    crop_height = crop_width * ((float)height / (float)width);
                }
                if (crop_height + minY > height)
                {
                    crop_height = height - minY;
                }

                cv::Mat hand(inputImage, cv::Rect(minX, minY, crop_width, crop_height));
                // cv::Mat hand(squaredImage, cv::Rect(minX, minY, crop_width, crop_height));

                float centerX = crop_width / 2;
                float centerY = crop_height / 2;

                cv::Point2f center = cv::Point2f(centerX, centerY);
                cv::Mat change = cv::getRotationMatrix2D(center, palm_result->palms[i].rotation * 60, 1);
                cv::Mat reverse;
                cv::Mat rotated_hand(hand.size(), CV_8UC4);
                cv::warpAffine(hand, rotated_hand, change, rotated_hand.size(), cv::INTER_CUBIC, cv::BORDER_CONSTANT, cv::Scalar(0, 0, 0));
                cv::invertAffineTransform(change, reverse);
                cv::Mat reverse3x3;
                reverse3x3.push_back(reverse.row(0));
                reverse3x3.push_back(reverse.row(1));
                cv::Mat none = (cv::Mat_<double>(1, 3) << 0.0, 0.0, 1.0);
                reverse3x3.push_back(none.row(0));

                cv::Mat roi2(temporaryImage, cv::Rect(0, 0, crop_width, crop_height));
                rotated_hand.copyTo(roi2);
                // printf("Rotation: %f\n", palm_result->palms[i].rotation);

                // cv::Mat resized(height, width, CV_8UC4, outputBuffer);
                cv::Mat resized(landmark_input_height, landmark_input_width, CV_8UC4);
                cv::resize(rotated_hand, resized, resized.size(), 0, 0, cv::INTER_LINEAR);

                cv::Mat inputImageRGB(landmark_input_height, landmark_input_width, CV_8UC3);
                int fromTo[] = {0, 0, 1, 1, 2, 2}; // split alpha channel
                cv::mixChannels(&resized, 1, &inputImageRGB, 1, fromTo, 3);
                cv::Mat inputImage32F(landmark_input_height, landmark_input_width, CV_32FC3, landmarkInput);
                inputImageRGB.convertTo(inputImage32F, CV_32FC3);

                if (palmType == PALM_256)
                {
                    float mean = 128.0f;
                    float std = 128.0f;
                    inputImage32F = (inputImage32F - mean) / std;
                }
                else
                {
                    inputImage32F = inputImage32F / 255.0;
                }

                CHECK_TFLITE_ERROR(landmarkInterpreter->Invoke() == kTfLiteOk);

                float score = *handflag_ptr;
                if (score > 0.0000001)
                {
                    for (int j = 0; j < 21; j++)
                    {
                        float x_ratio = landmark_ptr[j * 3 + 0] / landmark_input_width;
                        float y_ratio = landmark_ptr[j * 3 + 1] / landmark_input_height;
                        float x_position_in_crop = x_ratio * crop_width;
                        float y_position_in_crop = y_ratio * crop_height;
                        std::vector<cv::Point2f> src_points;
                        std::vector<cv::Point2f> dst_points;
                        src_points.push_back(cv::Point2f(x_position_in_crop, y_position_in_crop));

                        cv::perspectiveTransform(src_points, dst_points, reverse3x3);

                        // float x = dst_points[0].x + minX;
                        // float y = dst_points[0].y + minY;
                        // float z = landmark_ptr[j * 3 + 2];

                        // if (*handedness_ptr > 0.5)
                        // {
                        //     cv::line(out, cv::Point(x, y), cv::Point(x + 2, y + 2), cv::Scalar(200, 200, 0, 255), 20, 4);
                        // }
                        // else
                        // {
                        //     cv::line(out, cv::Point(x, y), cv::Point(x + 2, y + 2), cv::Scalar(0, 200, 200, 255), 20, 4);
                        // }

                        // printf("handflag::::%f(%f,%d, %d), %f(%f,%d, %d), %f %f\n", x, x_ratio, width, crop_width, y, y_ratio, height, crop_height, *handflag_ptr, *handedness_ptr);

                        palm_result->palms[i].landmark_keys[j].x = (dst_points[0].x + minX) / width;
                        palm_result->palms[i].landmark_keys[j].y = (dst_points[0].y + minY) / height;
                        // palm_result->palms[i].landmark_keys[j].x = (dst_points[0].x + minX) / squaredSize;
                        // palm_result->palms[i].landmark_keys[j].y = (dst_points[0].y + minY) / squaredSize;
                        palm_result->palms[i].landmark_keys[j].z = landmark_ptr[j * 3 + 2];
                        palm_result->palms[i].score = *handflag_ptr;
                        palm_result->palms[i].handedness = *handedness_ptr;
                    }
                }
            }
        }

        //// output
        /////
        float shiftRatioX = 1;
        float shiftRatioY = 1;
        // float shiftRatioX = squaredSize / width;
        // float shiftRatioY = squaredSize / height;
        ////
        *outputBuffer = 0.0; // 検出した手の数を初期化
        float *currentOutputPosition = outputBuffer + 1;
        if (palm_result->num > 0)
        {
            for (int i = 0; i < palm_result->num; i++)
            {

                (*outputBuffer)++; // 検出した手の数をインクリメント
                // score, rotateion
                *currentOutputPosition = palm_result->palms[i].score;
                currentOutputPosition++;
                *currentOutputPosition = palm_result->palms[i].landmark_score;
                currentOutputPosition++;
                *currentOutputPosition = palm_result->palms[i].handedness;
                currentOutputPosition++;
                *currentOutputPosition = palm_result->palms[i].rotation;
                currentOutputPosition++;

                // palm minX, minY, maxX, maxY
                *currentOutputPosition = palm_result->palms[i].rect.topleft.x * shiftRatioX;
                currentOutputPosition++;
                *currentOutputPosition = palm_result->palms[i].rect.topleft.y * shiftRatioY;
                currentOutputPosition++;
                *currentOutputPosition = palm_result->palms[i].rect.btmright.x * shiftRatioX;
                currentOutputPosition++;
                *currentOutputPosition = palm_result->palms[i].rect.btmright.y * shiftRatioY;
                currentOutputPosition++;
                // hand center, w,h
                *currentOutputPosition = (palm_result->palms[i].hand_cx - (palm_result->palms[i].hand_w / 2)) * shiftRatioX;
                currentOutputPosition++;
                *currentOutputPosition = (palm_result->palms[i].hand_cy - (palm_result->palms[i].hand_h / 2)) * shiftRatioY;
                currentOutputPosition++;
                *currentOutputPosition = (palm_result->palms[i].hand_cx + (palm_result->palms[i].hand_w / 2)) * shiftRatioX;
                currentOutputPosition++;
                *currentOutputPosition = (palm_result->palms[i].hand_cy + (palm_result->palms[i].hand_h / 2)) * shiftRatioY;
                currentOutputPosition++;
                // rotated hand position
                for (int j = 0; j < 4; j++)
                {
                    *currentOutputPosition = palm_result->palms[i].hand_pos[j].x * shiftRatioX;
                    currentOutputPosition++;
                    *currentOutputPosition = palm_result->palms[i].hand_pos[j].y * shiftRatioY;
                    currentOutputPosition++;
                }
                // palm keypoint
                for (int j = 0; j < 7; j++)
                {
                    *currentOutputPosition = palm_result->palms[i].keys[j].x * shiftRatioX;
                    currentOutputPosition++;
                    *currentOutputPosition = palm_result->palms[i].keys[j].y * shiftRatioY;
                    currentOutputPosition++;
                }

                // landmark keypoint
                for (int j = 0; j < 21; j++)
                {
                    *currentOutputPosition = palm_result->palms[i].landmark_keys[j].x * shiftRatioX;
                    currentOutputPosition++;
                    *currentOutputPosition = palm_result->palms[i].landmark_keys[j].y * shiftRatioY;
                    currentOutputPosition++;
                    *currentOutputPosition = palm_result->palms[i].landmark_keys[j].z;
                    currentOutputPosition++;
                }
            }
        }
    }
};
#endif //__OPENCV_BARCODE_BARDETECT_HPP__
