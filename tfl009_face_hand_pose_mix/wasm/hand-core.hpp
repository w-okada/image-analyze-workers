#ifndef __HAND_CORE_HPP__
#define __HAND_CORE_HPP__

#include "tensorflow/lite/kernels/register.h"
#include "tensorflow/lite/model.h"
#include "opencv2/opencv.hpp"
#include <list>
#include "hand-core.hpp"
#include "custom_ops/transpose_conv_bias.h"
#include "mediapipe_hand/Anchor.hpp"
#include "mediapipe_hand/KeypointDecoder.hpp"
#include "mediapipe_hand/NonMaxSuppression.hpp"
#include "mediapipe_hand/PackPalmResult.hpp"
#include "const.hpp"
std::unique_ptr<tflite::Interpreter> palmInterpreter;
std::unique_ptr<tflite::Interpreter> handLandmarkInterpreter;
static std::vector<Anchor> s_anchors;

class HandCore
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

    // int palmTyp = PALM_DETECTOR_256;
    int palmType = PALM_DETECTOR_192;

public:
    ////////////////////////////////////
    // Palm
    ////////////////////////////////////
    char *palmDetectorModelBuffer;
    void initPalmDetectorModelBuffer(int size)
    {
        palmDetectorModelBuffer = new char[size];
    }
    char *getPalmDetectorModelBufferAddress()
    {
        return palmDetectorModelBuffer;
    }
    int loadPalmDetectorModel(int size)
    {
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] - TFLite Model Loader                                  -\n");
        printf("[WASM] - Bug report:                                          -\n");
        printf("[WASM] -   https://github.com/w-okada/image-analyze-workers   -\n");
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] \n");
        printf("[WASM] Palm Detector Model size: %d\n", size);

        // Load model
        std::unique_ptr<tflite::FlatBufferModel> model = tflite::FlatBufferModel::BuildFromBuffer(palmDetectorModelBuffer, size);
        CHECK_TFLITE_ERROR(model != nullptr);

        tflite::ops::builtin::BuiltinOpResolver resolver;
        resolver.AddCustom("Convolution2DTransposeBias",
                           mediapipe::tflite_operations::RegisterConvolution2DTransposeBias());
        tflite::InterpreterBuilder builder(*model, resolver);
        builder(&palmInterpreter);
        CHECK_TFLITE_ERROR(palmInterpreter != nullptr);
        CHECK_TFLITE_ERROR(palmInterpreter->AllocateTensors() == kTfLiteOk);

        printf("[WASM]: Model Info");

        printf("[WASM]: INTPUT NUM: %lu\n", palmInterpreter->inputs().size());
        for (auto i : palmInterpreter->inputs())
        {
            const TfLiteTensor *tensor = palmInterpreter->tensor(i);
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
            palmType = PALM_DETECTOR_192;
        }
        else
        {
            palmType = PALM_DETECTOR_256;
        }

        printf("[WASM]: OUTTPUT NUM: %lu\n", palmInterpreter->outputs().size());
        for (auto i : palmInterpreter->outputs())
        {
            const TfLiteTensor *tensor = palmInterpreter->tensor(i);
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

        int output_num = palmInterpreter->outputs().size();
        for (int i = 0; i < output_num; i++)
        {
            int tensor_idx = palmInterpreter->outputs()[i];
            const char *tensor_name = palmInterpreter->tensor(tensor_idx)->name;
            if (strcmp(tensor_name, "regressors") == 0 || strcmp(tensor_name, "Identity:0") == 0 || strcmp(tensor_name, "Identity") == 0)
            {
                // regressors: old-ver, Identity:0: Pinto's, Identity: new-ver
                points_ptr = palmInterpreter->typed_output_tensor<float>(i);
            }
            else if (strcmp(tensor_name, "classificators") == 0 || strcmp(tensor_name, "Identity_1:0") == 0 || strcmp(tensor_name, "Identity_1") == 0)
            {
                scores_ptr = palmInterpreter->typed_output_tensor<float>(i);
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
    char *handLandmarkModelBuffer;
    void initHandLandmarkModelBuffer(int size)
    {
        handLandmarkModelBuffer = new char[size];
    }
    char *getHandLandmarkModelBufferAddress()
    {
        return handLandmarkModelBuffer;
    }

    int loadHandLandmarkModel(int size)
    {
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] - TFLite Model Loader                                  -\n");
        printf("[WASM] - Bug report:                                          -\n");
        printf("[WASM] -   https://github.com/w-okada/image-analyze-workers   -\n");
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] \n");
        printf("[WASM] Hand Landmark Model size: %d\n", size);

        // Load model
        std::unique_ptr<tflite::FlatBufferModel> landmarkModel = tflite::FlatBufferModel::BuildFromBuffer(handLandmarkModelBuffer, size);
        CHECK_TFLITE_ERROR(landmarkModel != nullptr);

        tflite::ops::builtin::BuiltinOpResolver resolver;
        resolver.AddCustom("Convolution2DTransposeBias",
                           mediapipe::tflite_operations::RegisterConvolution2DTransposeBias());
        tflite::InterpreterBuilder builder(*landmarkModel, resolver);
        builder(&handLandmarkInterpreter);
        CHECK_TFLITE_ERROR(handLandmarkInterpreter != nullptr);
        CHECK_TFLITE_ERROR(handLandmarkInterpreter->AllocateTensors() == kTfLiteOk);

        printf("[WASM]: Model Info");

        printf("[WASM]: INTPUT NUM: %lu\n", handLandmarkInterpreter->inputs().size());
        for (auto i : handLandmarkInterpreter->inputs())
        {
            const TfLiteTensor *tensor = handLandmarkInterpreter->tensor(i);
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

        printf("[WASM]: OUTTPUT NUM: %lu\n", handLandmarkInterpreter->outputs().size());
        for (auto i : handLandmarkInterpreter->outputs())
        {
            const TfLiteTensor *tensor = handLandmarkInterpreter->tensor(i);
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
        int output_num = handLandmarkInterpreter->outputs().size();

        for (int j = 0; j < output_num; j++)
        {
            int tensor_idx = handLandmarkInterpreter->outputs()[j];
            const char *tensor_name = handLandmarkInterpreter->tensor(tensor_idx)->name;
            if (strcmp(tensor_name, "ld_21_3d") == 0 || strcmp(tensor_name, "Identity") == 0)
            {
                landmark_ptr = handLandmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "output_handflag") == 0 || strcmp(tensor_name, "Identity_1") == 0)
            {
                handflag_ptr = handLandmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "Identity_2") == 0)
            {
                handedness_ptr = handLandmarkInterpreter->typed_output_tensor<float>(j);
            }
            else
            {
                printf("[WASM]: UNKNOWN OUTPUT[%d,%d]: Name:%s\n", j, tensor_idx, tensor_name);
            }
        }

        return 0;
    }

    unsigned char *handInputBuffer;
    void initHandInputBuffer(int width, int height, int channel)
    {
        handInputBuffer = new unsigned char[width * height * channel];
        initHandOutputBuffer();
        initHandTemporaryBuffer();
    }
    unsigned char *getHandInputBufferAddress()
    {
        return handInputBuffer;
    }

    float *handOutputBuffer;
    void initHandOutputBuffer()
    {
        handOutputBuffer = new float[1024 * 4];
    }
    float *getHandOutputBufferAddress()
    {
        return handOutputBuffer;
    }

    unsigned char *handTemporaryBuffer;
    void initHandTemporaryBuffer()
    {
        handTemporaryBuffer = new unsigned char[1024 * 1024 * 4];
    }
    unsigned char *getHandTemporaryBufferAddress()
    {
        return handTemporaryBuffer;
    }

    void execHand(int width, int height, int max_palm_num, int resizedFactor)
    {
        float *input = palmInterpreter->typed_input_tensor<float>(0);

        cv::Mat inputImage(height, width, CV_8UC4, handInputBuffer);
        cv::Mat temporaryImage(1024, 1024, CV_8UC4, handTemporaryBuffer);

        cv::Mat inputImageRGB(height, width, CV_8UC3);
        int fromTo[] = {0, 0, 1, 1, 2, 2}; // split alpha channel
        cv::mixChannels(&inputImage, 1, &inputImageRGB, 1, fromTo, 3);
        cv::Mat resizedInputImageRGB(palm_input_height, palm_input_width, CV_8UC3);
        cv::resize(inputImageRGB, resizedInputImageRGB, resizedInputImageRGB.size());
        cv::Mat inputImage32F(palm_input_height, palm_input_width, CV_32FC3, input);
        resizedInputImageRGB.convertTo(inputImage32F, CV_32FC3);

        if (palmType == PALM_DETECTOR_256)
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
        CHECK_TFLITE_ERROR(palmInterpreter->Invoke() == kTfLiteOk);

        //// decode keyoiints
        float score_thresh = 0.2f;
        std::list<palm_t> palm_list;
        decode_keypoints(palm_list, score_thresh, points_ptr, scores_ptr, &s_anchors, palmType);

        //// NMS
        float iou_thresh = 0.005f;
        std::list<palm_t> palm_nms_list;
        non_max_suppression(palm_list, palm_nms_list, iou_thresh, max_palm_num);

        //// Pack
        palm_detection_result_t palm_result;
        pack_palm_result(&palm_result, palm_nms_list, max_palm_num);

        for (int i = 0; i < palm_result.num; i++)
        {
            int minX = width;
            int minY = height;
            int maxX = 0;
            int maxY = 0;

            for (int j = 0; j < 4; j++)
            {
                int pos_x = palm_result.palms[i].hand_pos[j].x * width;
                int pos_y = palm_result.palms[i].hand_pos[j].y * height;

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
            if (minY < 0)
            {
                minY = 0;
            }
            if (maxY > height)
            {
                maxY = height;
            }

            float *landmarkInput = handLandmarkInterpreter->typed_input_tensor<float>(0);

            // target Imageを切り抜き
            int crop_width = maxX - minX;
            int crop_height = maxY - minY;
            cv::Mat cropped(inputImage, cv::Rect(minX, minY, crop_width, crop_height));

            // Landmark用Input作成
            int translationCanvasSize = std::max(crop_width, crop_height);
            cv::Mat translationCanvas = cv::Mat::zeros(cv::Size(translationCanvasSize, translationCanvasSize), CV_8UC4);

            //// キャンバス内の貼り付け先の特定＋貼り付け
            int translateRoiMinX = translationCanvasSize / 2 - crop_width / 2;
            int translateRoiMinY = translationCanvasSize / 2 - crop_height / 2;
            cv::Mat copyArea(translationCanvas, cv::Rect(translateRoiMinX, translateRoiMinY, crop_width, crop_height));
            cropped.copyTo(copyArea);

            //// Affine変換が重いので軽量化のために縮小
            // int resizedSquareSize = 200;
            int resizedSquareSize = translationCanvasSize / resizedFactor;
            float resizedRatio = (resizedSquareSize * 1.0) / translationCanvasSize; // 倍率保存
            cv::Mat resizedSquare = cv::Mat::ones(cv::Size(resizedSquareSize, resizedSquareSize), CV_8UC4);
            cv::resize(translationCanvas, resizedSquare, resizedSquare.size(), 0, 0, cv::INTER_LINEAR);

            // 回転
            //// 回転軸
            cv::Point2f center = cv::Point2f(resizedSquareSize / 2, resizedSquareSize / 2);
            cv::Mat change = cv::getRotationMatrix2D(center, (palm_result.palms[i].rotation * 60), 1);
            //// 回転
            cv::Mat rotated_palm(resizedSquare.size(), CV_8UC4);
            cv::warpAffine(resizedSquare, rotated_palm, change, rotated_palm.size(), cv::INTER_CUBIC, cv::BORDER_CONSTANT, cv::Scalar(0, 0, 0));
            //// 逆行列生成
            cv::Mat reverse;
            cv::invertAffineTransform(change, reverse);
            cv::Mat reverse3x3;
            reverse3x3.push_back(reverse.row(0));
            reverse3x3.push_back(reverse.row(1));
            cv::Mat none = (cv::Mat_<double>(1, 3) << 0.0, 0.0, 1.0);
            reverse3x3.push_back(none.row(0));

            // // テンポラリイメージ(for debug)
            // if (i == 0)
            // {
            //     cv::resize(rotated_palm, temporaryImage, temporaryImage.size(), 0, 0, cv::INTER_LINEAR);
            // }

            //// インプットShapeにリサイズ
            cv::Mat resized(landmark_input_height, landmark_input_width, CV_8UC4);
            cv::resize(rotated_palm, resized, resized.size(), 0, 0, cv::INTER_LINEAR);

            //// 3チャンネル化
            cv::Mat inputImageRGB(landmark_input_height, landmark_input_width, CV_8UC3);
            int fromTo[] = {0, 0, 1, 1, 2, 2}; // split alpha channel
            cv::mixChannels(&resized, 1, &inputImageRGB, 1, fromTo, 3);

            //// 標準化
            cv::Mat inputImage32F(landmark_input_height, landmark_input_width, CV_32FC3, landmarkInput);
            inputImageRGB.convertTo(inputImage32F, CV_32FC3);

            if (palmType == PALM_DETECTOR_256)
            {
                float mean = 128.0f;
                float std = 128.0f;
                inputImage32F = (inputImage32F - mean) / std;
            }
            else
            {
                inputImage32F = inputImage32F / 255.0;
            }

            //// Landmark検出
            CHECK_TFLITE_ERROR(handLandmarkInterpreter->Invoke() == kTfLiteOk);

            float score = *handflag_ptr;
            if (score > 0.0000001)
            {
                for (int j = 0; j < 21; j++)
                {
                    float x_ratio = landmark_ptr[j * 3 + 0] / landmark_input_width;
                    float y_ratio = landmark_ptr[j * 3 + 1] / landmark_input_height;
                    float x_position_in_crop = x_ratio * (resizedSquareSize);
                    float y_position_in_crop = y_ratio * (resizedSquareSize);
                    std::vector<cv::Point2f> src_points;
                    std::vector<cv::Point2f> dst_points;
                    src_points.push_back(cv::Point2f(x_position_in_crop, y_position_in_crop));

                    cv::perspectiveTransform(src_points, dst_points, reverse3x3);

                    palm_result.palms[i].landmark_keys[j].x = (dst_points[0].x - translateRoiMinX * resizedRatio + minX * resizedRatio) / resizedRatio / width;
                    palm_result.palms[i].landmark_keys[j].y = (dst_points[0].y - translateRoiMinY * resizedRatio + minY * resizedRatio) / resizedRatio / height;
                    palm_result.palms[i].landmark_keys[j].z = landmark_ptr[j * 3 + 2] / resizedRatio / height;
                    palm_result.palms[i].score = *handflag_ptr;
                    palm_result.palms[i].handedness = *handedness_ptr;
                }
            }

            //// output
            /////
            float shiftRatioX = 1;
            float shiftRatioY = 1;
            ////
            *handOutputBuffer = 0.0; // 検出した手の数を初期化
            float *currentOutputPosition = handOutputBuffer + 1;
            if (palm_result.num > 0)
            {
                for (int i = 0; i < palm_result.num; i++)
                {

                    (*handOutputBuffer)++; // 検出した手の数をインクリメント
                    // score, rotateion
                    *currentOutputPosition = palm_result.palms[i].score;
                    currentOutputPosition++;
                    *currentOutputPosition = palm_result.palms[i].landmark_score;
                    currentOutputPosition++;
                    *currentOutputPosition = palm_result.palms[i].handedness;
                    currentOutputPosition++;
                    *currentOutputPosition = palm_result.palms[i].rotation;
                    currentOutputPosition++;

                    // palm minX, minY, maxX, maxY
                    *currentOutputPosition = palm_result.palms[i].rect.topleft.x * shiftRatioX;
                    currentOutputPosition++;
                    *currentOutputPosition = palm_result.palms[i].rect.topleft.y * shiftRatioY;
                    currentOutputPosition++;
                    *currentOutputPosition = palm_result.palms[i].rect.btmright.x * shiftRatioX;
                    currentOutputPosition++;
                    *currentOutputPosition = palm_result.palms[i].rect.btmright.y * shiftRatioY;
                    currentOutputPosition++;
                    // hand center, w,h
                    *currentOutputPosition = (palm_result.palms[i].hand_cx - (palm_result.palms[i].hand_w / 2)) * shiftRatioX;
                    currentOutputPosition++;
                    *currentOutputPosition = (palm_result.palms[i].hand_cy - (palm_result.palms[i].hand_h / 2)) * shiftRatioY;
                    currentOutputPosition++;
                    *currentOutputPosition = (palm_result.palms[i].hand_cx + (palm_result.palms[i].hand_w / 2)) * shiftRatioX;
                    currentOutputPosition++;
                    *currentOutputPosition = (palm_result.palms[i].hand_cy + (palm_result.palms[i].hand_h / 2)) * shiftRatioY;
                    currentOutputPosition++;
                    // rotated hand position
                    for (int j = 0; j < 4; j++)
                    {
                        *currentOutputPosition = palm_result.palms[i].hand_pos[j].x * shiftRatioX;
                        currentOutputPosition++;
                        *currentOutputPosition = palm_result.palms[i].hand_pos[j].y * shiftRatioY;
                        currentOutputPosition++;
                    }
                    // palm keypoint
                    for (int j = 0; j < 7; j++)
                    {
                        *currentOutputPosition = palm_result.palms[i].keys[j].x * shiftRatioX;
                        currentOutputPosition++;
                        *currentOutputPosition = palm_result.palms[i].keys[j].y * shiftRatioY;
                        currentOutputPosition++;
                    }

                    // landmark keypoint
                    for (int j = 0; j < 21; j++)
                    {
                        *currentOutputPosition = palm_result.palms[i].landmark_keys[j].x * shiftRatioX;
                        currentOutputPosition++;
                        *currentOutputPosition = palm_result.palms[i].landmark_keys[j].y * shiftRatioY;
                        currentOutputPosition++;
                        *currentOutputPosition = palm_result.palms[i].landmark_keys[j].z;
                        currentOutputPosition++;
                    }
                }
            }
        }
    }
};
#endif //__HAND_CORE_HPP__
