#ifndef __OPENCV_BARCODE_BARDETECT_HPP__
#define __OPENCV_BARCODE_BARDETECT_HPP__

#include "tensorflow/lite/kernels/register.h"
#include "tensorflow/lite/model.h"
#include "opencv2/opencv.hpp"
#include <list>
#include "pose.hpp"
#include "mediapipe/Anchor.hpp"
#include "mediapipe/KeypointDecoder.hpp"
#include "mediapipe/NonMaxSuppression.hpp"
#include "mediapipe/PackPoseResult.hpp"
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
    int detector_input_width = 0;
    int detector_input_height = 0;
    int landmark_input_width = 0;
    int landmark_input_height = 0;

    float *scores_ptr;
    float *points_ptr;
    float *landmark_ptr;
    float *poseflag_ptr;
    float *output_segmentation_ptr;
    float *output_heatmap_ptr;
    float *output_world3d_ptr;

public:
    ////////////////////////////////////
    // Detector
    ////////////////////////////////////
    char *detectorModelBuffer;
    void initDetectorModelBuffer(int size)
    {
        detectorModelBuffer = new char[size];
    }
    char *getDetectorModelBufferAddress()
    {
        return detectorModelBuffer;
    }
    int loadDetectorModel(int size)
    {
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] - TFLite Model Loader                                  -\n");
        printf("[WASM] - Bug report:                                          -\n");
        printf("[WASM] -   https://github.com/w-okada/image-analyze-workers   -\n");
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] \n");
        printf("[WASM] Loading model of size: %d\n", size);

        // Load model
        std::unique_ptr<tflite::FlatBufferModel> model = tflite::FlatBufferModel::BuildFromBuffer(detectorModelBuffer, size);
        CHECK_TFLITE_ERROR(model != nullptr);

        tflite::ops::builtin::BuiltinOpResolver resolver;
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
                    detector_input_height = tensor->dims->data[j];
                }
                if (j == 2)
                {
                    detector_input_width = tensor->dims->data[j];
                }
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

        int output_num = interpreter->outputs().size();
        for (int i = 0; i < output_num; i++)
        {
            int tensor_idx = interpreter->outputs()[i];
            const char *tensor_name = interpreter->tensor(tensor_idx)->name;
            if (strcmp(tensor_name, "Identity") == 0)
            {
                points_ptr = interpreter->typed_output_tensor<float>(i);
            }
            else if (strcmp(tensor_name, "Identity_1") == 0)
            {
                scores_ptr = interpreter->typed_output_tensor<float>(i);
            }
            else
            {
                printf("[WASM]: UNKNOWN OUTPUT[%d,%d]: Name:%s\n", i, tensor_idx, tensor_name);
            }
        }

        generate_ssd_anchors(&s_anchors);
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
            if (strcmp(tensor_name, "Identity") == 0)
            {
                landmark_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "Identity_1") == 0)
            {
                poseflag_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "Identity_2") == 0)
            { //output_segmentation
                output_segmentation_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "Identity_3") == 0)
            { //output_heatmap
                output_heatmap_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "Identity_4") == 0)
            { //world_3d
                output_world3d_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
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
        outputBuffer = new float[1024 * 1024];
    }
    float *getOutputBufferAddress()
    {
        return outputBuffer;
    }

    unsigned char *temporaryBuffer;
    void initTemporaryBuffer()
    {
        temporaryBuffer = new unsigned char[2048 * 2048 * 4];
    }
    unsigned char *getTemporaryBufferAddress()
    {
        return temporaryBuffer;
    }

    void exec(int width, int height, int max_pose_num, int resizedFactor, float cropExtention)
    {
        float *input = interpreter->typed_input_tensor<float>(0);

        cv::Mat inputImage(height, width, CV_8UC4, inputBuffer);
        cv::Mat temporaryImage(1024, 1024, CV_8UC4, temporaryBuffer);

        cv::Mat inputImageRGB(height, width, CV_8UC3);
        int fromTo[] = {0, 0, 1, 1, 2, 2}; // split alpha channel
        cv::mixChannels(&inputImage, 1, &inputImageRGB, 1, fromTo, 3);
        // printf("detector input: %d,%d\n", detector_input_height, detector_input_width);
        cv::Mat resizedInputImageRGB(detector_input_height, detector_input_width, CV_8UC3);
        cv::resize(inputImageRGB, resizedInputImageRGB, resizedInputImageRGB.size());
        cv::Mat inputImage32F(detector_input_height, detector_input_width, CV_32FC3, input);
        resizedInputImageRGB.convertTo(inputImage32F, CV_32FC3);
        float mean = 128.0f;
        float std = 128.0f;
        inputImage32F = (inputImage32F - mean) / std;

        // // (2) Infer
        // printf("Infer!\n");
        CHECK_TFLITE_ERROR(interpreter->Invoke() == kTfLiteOk);

        //// decode keyoiints
        float score_thresh = 0.2f;
        std::list<pose_t> pose_list;
        decode_keypoints(pose_list, score_thresh, points_ptr, scores_ptr, &s_anchors);

        //// NMS
        float iou_thresh = 0.005f;
        std::list<pose_t> pose_nms_list;
        non_max_suppression(pose_list, pose_nms_list, iou_thresh, max_pose_num);

        //// Pack
        pose_detection_result_t pose_result;
        pack_pose_result(&pose_result, pose_nms_list, max_pose_num);

        for (int i = 0; i < pose_result.num; i++)
        {
            float *landmarkInput = landmarkInterpreter->typed_input_tensor<float>(0);

            float hipX = pose_result.poses[i].keys[0].x;
            float hipY = pose_result.poses[i].keys[0].y;
            float radius = std::max(std::abs(pose_result.poses[i].keys[3].x - pose_result.poses[i].keys[0].x), std::abs(pose_result.poses[i].keys[3].y - pose_result.poses[i].keys[0].y));
            radius = radius * cropExtention;
            float cropMinX = hipX - radius < 0 ? 0 : hipX - radius;
            float cropMinY = hipY - radius < 0 ? 0 : hipY - radius;
            float cropMaxX = hipX + radius > 1 ? 1 : hipX + radius;
            float cropMaxY = hipY + radius > 1 ? 1 : hipY + radius;

            // Crop
            cv::Mat cropped(inputImage, cv::Rect(cropMinX * width, cropMinY * height, (cropMaxX - cropMinX) * width, (cropMaxY - cropMinY) * height));
            float croppedHipX = hipX - cropMinX;
            float croppedHipY = hipY - cropMinY;

            // Landmark用Input作成
            //// 移動しても画像が切れないキャンバスを用意(hipが中心になるようにするためにhipの座標の2倍の大きさ)
            int translationCanvasWidth = std::max(croppedHipX * width, (cropMaxX - cropMinX) * width - croppedHipX * width) * 2;
            int translationCanvasHeight = std::max(croppedHipY * height, (cropMaxY - cropMinY) * height - croppedHipY * height) * 2;
            int translationCanvasSize = std::max(translationCanvasWidth, translationCanvasHeight);
            cv::Mat translationCanvas = cv::Mat::zeros(cv::Size(translationCanvasSize, translationCanvasSize), CV_8UC4);
            // printf("(%f, %f, %f, %f), %d\n", cropMinX, cropMinY, cropMaxX, cropMaxY, translationCanvasSize);

            //// キャンバス内の貼り付け先の特定＋貼り付け
            int translateRoiMinX = translationCanvasSize / 2 - croppedHipX * width;
            int translateRoiMinY = translationCanvasSize / 2 - croppedHipY * height;
            cv::Mat copyArea(translationCanvas, cv::Rect(translateRoiMinX, translateRoiMinY, (cropMaxX - cropMinX) * width, (cropMaxY - cropMinY) * height));
            cropped.copyTo(copyArea);
            // printf("%d,%d\n", translateRoiMinX, translateRoiMinY);

            //// Affine変換が重いので軽量化のために縮小
            cv::Mat resizedTranslationCanvas = cv::Mat::ones(cv::Size(translationCanvasSize / resizedFactor, translationCanvasSize / resizedFactor), CV_8UC4);
            cv::resize(translationCanvas, resizedTranslationCanvas, resizedTranslationCanvas.size(), 0, 0, cv::INTER_LINEAR);
            // 回転
            //// 回転軸（hipが中心に張るはずなので中心で回転させればよい）
            cv::Point2f center = cv::Point2f(translationCanvasSize / (resizedFactor * 2), translationCanvasSize / (resizedFactor * 2));
            cv::Mat change = cv::getRotationMatrix2D(center, (pose_result.poses[i].rotation * 60), 1);
            //// 回転
            cv::Mat rotated_pose(resizedTranslationCanvas.size(), CV_8UC4);
            cv::warpAffine(resizedTranslationCanvas, rotated_pose, change, rotated_pose.size(), cv::INTER_CUBIC, cv::BORDER_CONSTANT, cv::Scalar(0, 0, 0));
            //// 逆行列生成
            cv::Mat reverse;
            cv::invertAffineTransform(change, reverse);
            cv::Mat reverse3x3;
            reverse3x3.push_back(reverse.row(0));
            reverse3x3.push_back(reverse.row(1));
            cv::Mat none = (cv::Mat_<double>(1, 3) << 0.0, 0.0, 1.0);
            reverse3x3.push_back(none.row(0));

            // テンポラリイメージ(for debug)
            // cv::resize(cropped, temporaryImage, temporaryImage.size(), 0, 0, cv::INTER_LINEAR);
            cv::resize(translationCanvas, temporaryImage, temporaryImage.size(), 0, 0, cv::INTER_LINEAR);
            // cv::resize(rotated_pose, temporaryImage, temporaryImage.size(), 0, 0, cv::INTER_LINEAR);

            //// インプットShapeにリサイズ
            cv::Mat resized(landmark_input_height, landmark_input_width, CV_8UC4);
            cv::resize(rotated_pose, resized, resized.size(), 0, 0, cv::INTER_LINEAR);

            //// 3チャンネル化
            cv::Mat inputImageRGB(landmark_input_height, landmark_input_width, CV_8UC3);
            int fromTo[] = {0, 0, 1, 1, 2, 2}; // split alpha channel
            cv::mixChannels(&resized, 1, &inputImageRGB, 1, fromTo, 3);

            //// 標準化
            cv::Mat inputImage32F(landmark_input_height, landmark_input_width, CV_32FC3, landmarkInput);
            inputImageRGB.convertTo(inputImage32F, CV_32FC3);
            inputImage32F = inputImage32F / 255.0;

            //// Landmark検出
            CHECK_TFLITE_ERROR(landmarkInterpreter->Invoke() == kTfLiteOk);

            float score = *poseflag_ptr;
            if (score > 0.0000001)
            {
                pose_result.poses[i].landmark_score = *poseflag_ptr;
                // landmark
                for (int j = 0; j < 39; j++)
                {
                    float x_ratio = landmark_ptr[j * 5 + 0] / landmark_input_width; // 比率
                    float y_ratio = landmark_ptr[j * 5 + 1] / landmark_input_height;
                    float x_position_in_crop = x_ratio * (translationCanvasSize / resizedFactor); // resized内座標
                    float y_position_in_crop = y_ratio * (translationCanvasSize / resizedFactor);
                    std::vector<cv::Point2f> src_points;
                    std::vector<cv::Point2f> dst_points;
                    src_points.push_back(cv::Point2f(x_position_in_crop, y_position_in_crop));

                    cv::perspectiveTransform(src_points, dst_points, reverse3x3);

                    pose_result.poses[i].landmark_keys[j].x = ((dst_points[0].x - (translateRoiMinX / resizedFactor)) * resizedFactor + cropMinX * width) / width; // *resizedFactorで元画像サイズに戻して、比率算出
                    pose_result.poses[i].landmark_keys[j].y = ((dst_points[0].y - (translateRoiMinY / resizedFactor)) * resizedFactor + cropMinY * height) / height;
                    pose_result.poses[i].landmark_keys[j].z = landmark_ptr[j * 5 + 2];
                    pose_result.poses[i].visibility[j] = 1.0f / (1.0f + exp(-1 * landmark_ptr[j * 5 + 3]));
                    pose_result.poses[i].presence[j] = 1.0f / (1.0f + exp(-1 * landmark_ptr[j * 5 + 4]));

                    // printf("dstCtx.fillRect(%f*dst.width, %f*dst.height, 10, 10)\n", pose_result.poses[i].landmark_keys[j].x, pose_result.poses[i].landmark_keys[j].y);
                }

                // landmark3D
                for (int j = 0; j < 39; j++)
                {
                    float x_ratio = output_world3d_ptr[j * 3 + 0] / landmark_input_width; // 比率
                    float y_ratio = output_world3d_ptr[j * 3 + 1] / landmark_input_height;
                    float x_position_in_crop = x_ratio * (translationCanvasSize / resizedFactor); // resized内座標
                    float y_position_in_crop = y_ratio * (translationCanvasSize / resizedFactor);
                    std::vector<cv::Point2f> src_points;
                    std::vector<cv::Point2f> dst_points;
                    src_points.push_back(cv::Point2f(x_position_in_crop, y_position_in_crop));

                    cv::perspectiveTransform(src_points, dst_points, reverse3x3);

                    pose_result.poses[i].landmark3d_keys[j].x = ((dst_points[0].x - (translateRoiMinX / resizedFactor)) * resizedFactor + cropMinX * width) / width; // *resizedFactorで元画像サイズに戻して、比率算出
                    pose_result.poses[i].landmark3d_keys[j].y = ((dst_points[0].y - (translateRoiMinY / resizedFactor)) * resizedFactor + cropMinY * height) / height;
                    pose_result.poses[i].landmark3d_keys[j].z = output_world3d_ptr[j * 3 + 2] * resizedFactor / height;
                }
            }
        }

        //// output
        *outputBuffer = 0.0; // 検出した顔の数を初期化
        float *currentOutputPosition = outputBuffer + 1;
        if (pose_result.num > 0)
        {
            for (int i = 0; i < pose_result.num; i++)
            {

                (*outputBuffer)++; // 検出した手の数をインクリメント
                // score, rotateion
                *currentOutputPosition = pose_result.poses[i].score;
                currentOutputPosition++;
                *currentOutputPosition = pose_result.poses[i].landmark_score;
                currentOutputPosition++;
                *currentOutputPosition = pose_result.poses[i].rotation;
                currentOutputPosition++;

                // pose minX, minY, maxX, maxY
                *currentOutputPosition = pose_result.poses[i].rect.topleft.x;
                currentOutputPosition++;
                *currentOutputPosition = pose_result.poses[i].rect.topleft.y;
                currentOutputPosition++;
                *currentOutputPosition = pose_result.poses[i].rect.btmright.x;
                currentOutputPosition++;
                *currentOutputPosition = pose_result.poses[i].rect.btmright.y;
                currentOutputPosition++;
                // pose center, w,h
                *currentOutputPosition = (pose_result.poses[i].pose_cx - (pose_result.poses[i].pose_w / 2));
                currentOutputPosition++;
                *currentOutputPosition = (pose_result.poses[i].pose_cy - (pose_result.poses[i].pose_h / 2));
                currentOutputPosition++;
                *currentOutputPosition = (pose_result.poses[i].pose_cx + (pose_result.poses[i].pose_w / 2));
                currentOutputPosition++;
                *currentOutputPosition = (pose_result.poses[i].pose_cy + (pose_result.poses[i].pose_h / 2));
                currentOutputPosition++;
                // rotated pose position
                for (int j = 0; j < 4; j++)
                {
                    *currentOutputPosition = pose_result.poses[i].pose_pos[j].x;
                    currentOutputPosition++;
                    *currentOutputPosition = pose_result.poses[i].pose_pos[j].y;
                    currentOutputPosition++;
                }
                // pose keypoint
                for (int j = 0; j < 4; j++)
                {
                    *currentOutputPosition = pose_result.poses[i].keys[j].x;
                    currentOutputPosition++;
                    *currentOutputPosition = pose_result.poses[i].keys[j].y;
                    currentOutputPosition++;
                }

                // landmark keypoint
                for (int j = 0; j < 39; j++)
                {
                    *currentOutputPosition = pose_result.poses[i].landmark_keys[j].x;
                    currentOutputPosition++;
                    *currentOutputPosition = pose_result.poses[i].landmark_keys[j].y;
                    currentOutputPosition++;
                    *currentOutputPosition = pose_result.poses[i].landmark_keys[j].z;
                    currentOutputPosition++;
                    *currentOutputPosition = pose_result.poses[i].visibility[j];
                    currentOutputPosition++;
                    *currentOutputPosition = pose_result.poses[i].presence[j];
                    currentOutputPosition++;
                }

                // landmark3d keypoint
                for (int j = 0; j < 39; j++)
                {
                    *currentOutputPosition = pose_result.poses[i].landmark3d_keys[j].x;
                    currentOutputPosition++;
                    *currentOutputPosition = pose_result.poses[i].landmark3d_keys[j].y;
                    currentOutputPosition++;
                    *currentOutputPosition = pose_result.poses[i].landmark3d_keys[j].z;
                    currentOutputPosition++;
                }
            }
        }
    }
};
#endif //__OPENCV_BARCODE_BARDETECT_HPP__
