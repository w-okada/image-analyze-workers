#ifndef __OPENCV_BARCODE_BARDETECT_HPP__
#define __OPENCV_BARCODE_BARDETECT_HPP__

#include "tensorflow/lite/kernels/register.h"
#include "tensorflow/lite/model.h"
#include "opencv2/opencv.hpp"
#include <list>
#include "facemesh.hpp"
#include "mediapipe/Anchor.hpp"
#include "mediapipe/KeypointDecoder.hpp"
#include "mediapipe/NonMaxSuppression.hpp"
#include "mediapipe/PackFaceResult.hpp"
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
    float *faceflag_ptr;
    float *output_lips_ptr;
    float *output_left_eye_ptr;
    float *output_right_eye_ptr;
    float *output_left_iris_ptr;
    float *output_right_iris_ptr;

    int detectorType = DETECTOR_SHORT;
    int landmarkType = LANDMARK_WITH_ATTENTION;

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
            if (strcmp(tensor_name, "regressors") == 0 || strcmp(tensor_name, "reshaped_regressor_face_4") == 0 || strcmp(tensor_name, "Identity") == 0)
            {
                points_ptr = interpreter->typed_output_tensor<float>(i);
                if (strcmp(tensor_name, "regressors") == 0)
                {
                    detectorType = DETECTOR_SHORT;
                }
                else if (strcmp(tensor_name, "reshaped_regressor_face_4") == 0)
                {
                    detectorType = DETECTOR_FULL;
                }
                else
                {
                    detectorType = DETECTOR_FULL_SPARSE;
                }
            }
            else if (strcmp(tensor_name, "classificators") == 0 || strcmp(tensor_name, "reshaped_classifier_face_4") == 0 || strcmp(tensor_name, "Identity_1") == 0)
            {
                scores_ptr = interpreter->typed_output_tensor<float>(i);
            }
            else
            {
                printf("[WASM]: UNKNOWN OUTPUT[%d,%d]: Name:%s\n", i, tensor_idx, tensor_name);
            }
        }

        generate_ssd_anchors(&s_anchors, detectorType);
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
            if (strcmp(tensor_name, "output_mesh_identity") == 0 || strcmp(tensor_name, "conv2d_21") == 0 || strcmp(tensor_name, "output_mesh_identity:0") == 0)
            {
                landmark_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
                if (strcmp(tensor_name, "output_mesh_identity") == 0 || strcmp(tensor_name, "output_mesh_identity:0") == 0)
                {
                    landmarkType = LANDMARK_WITH_ATTENTION;
                }
                else
                {
                    landmarkType = LANDMARK;
                }
            }
            else if (strcmp(tensor_name, "conv_faceflag") == 0 || strcmp(tensor_name, "conv2d_31") == 0 || strcmp(tensor_name, "conv_faceflag:0") == 0)
            {
                faceflag_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "output_lips") == 0 || strcmp(tensor_name, "output_lips:0") == 0)
            {
                output_lips_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "output_left_eye") == 0 || strcmp(tensor_name, "output_left_eye:0") == 0)
            {
                output_left_eye_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "output_right_eye") == 0 || strcmp(tensor_name, "output_right_eye:0") == 0)
            {
                output_right_eye_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "output_left_iris") == 0 || strcmp(tensor_name, "output_left_iris:0") == 0)
            {
                output_left_iris_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
            }
            else if (strcmp(tensor_name, "output_right_iris") == 0 || strcmp(tensor_name, "output_right_iris:0") == 0)
            {
                output_right_iris_ptr = landmarkInterpreter->typed_output_tensor<float>(j);
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
        temporaryBuffer = new unsigned char[1024 * 1024 * 4];
    }
    unsigned char *getTemporaryBufferAddress()
    {
        return temporaryBuffer;
    }

    void exec(int width, int height, int max_face_num)
    {
        float *input = interpreter->typed_input_tensor<float>(0);

        cv::Mat inputImage(height, width, CV_8UC4, inputBuffer);
        cv::Mat temporaryImage(1024, 1024, CV_8UC4, temporaryBuffer);

        cv::Mat inputImageRGB(height, width, CV_8UC3);
        int fromTo[] = {0, 0, 1, 1, 2, 2}; // split alpha channel
        cv::mixChannels(&inputImage, 1, &inputImageRGB, 1, fromTo, 3);
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
        std::list<face_t> face_list;
        decode_keypoints(face_list, score_thresh, points_ptr, scores_ptr, &s_anchors, detectorType);

        //// NMS
        float iou_thresh = 0.005f;
        std::list<face_t> face_nms_list;
        non_max_suppression(face_list, face_nms_list, iou_thresh, max_face_num);
        //// Pack
        face_detection_result_t face_result;
        pack_face_result(&face_result, face_nms_list, max_face_num);

        for (int i = 0; i < face_result.num; i++)
        {
            int minX = width;
            int minY = height;
            int maxX = 0;
            int maxY = 0;

            for (int j = 0; j < 4; j++)
            {
                int pos_x = face_result.faces[i].face_pos[j].x * width;
                int pos_y = face_result.faces[i].face_pos[j].y * height;

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

            float *landmarkInput = landmarkInterpreter->typed_input_tensor<float>(0);

            // target Imageを切り抜き
            int crop_width = maxX - minX;
            int crop_height = maxY - minY;
            cv::Mat cropped(inputImage, cv::Rect(minX, minY, crop_width, crop_height));

            // Landmark用Input作成
            int squared_size = std::max(crop_width, crop_height);
            cv::Mat squared = cv::Mat::zeros(cv::Size(squared_size, squared_size), CV_8UC4);

            //// キャンバス内の貼り付け先の特定＋貼り付け
            int squaredRoiMinX = squared_size / 2 - crop_width / 2;
            int squaredRoiMinY = squared_size / 2 - crop_height / 2;
            cv::Mat copyArea(squared, cv::Rect(squaredRoiMinX, squaredRoiMinY, crop_width, crop_height));
            cropped.copyTo(copyArea);

            // 回転
            //// 回転軸（左目）
            float rotationAxisX = (face_result.faces[i].keys[0].x * width) - minX + squaredRoiMinX;
            float rotationAxisY = (face_result.faces[i].keys[0].y * height) - minY + squaredRoiMinY;

            // cv::Point2f center = cv::Point2f(squared_size / 2, squared_size / 2);
            cv::Point2f center = cv::Point2f(rotationAxisX, rotationAxisY);
            cv::Mat change = cv::getRotationMatrix2D(center, (face_result.faces[i].rotation * 60) - 90, 1);
            //// 回転
            cv::Mat rotated_face(squared.size(), CV_8UC4);
            cv::warpAffine(squared, rotated_face, change, rotated_face.size(), cv::INTER_CUBIC, cv::BORDER_CONSTANT, cv::Scalar(0, 0, 0));
            //// 逆行列生成
            cv::Mat reverse;
            cv::invertAffineTransform(change, reverse);
            cv::Mat reverse3x3;
            reverse3x3.push_back(reverse.row(0));
            reverse3x3.push_back(reverse.row(1));
            cv::Mat none = (cv::Mat_<double>(1, 3) << 0.0, 0.0, 1.0);
            reverse3x3.push_back(none.row(0));

            // テンポラリイメージ(for debug)
            if (i == 0)
            {
                // cv::Mat roi2(temporaryImage, cv::Rect(0, 0, crop_width, crop_height));
                // rotated_face.copyTo(roi2);
                cv::resize(rotated_face, temporaryImage, temporaryImage.size(), 0, 0, cv::INTER_LINEAR);
            }

            //// インプットShapeにリサイズ
            cv::Mat resized(landmark_input_height, landmark_input_width, CV_8UC4);
            cv::resize(rotated_face, resized, resized.size(), 0, 0, cv::INTER_LINEAR);

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
            float score = *faceflag_ptr;
            if (score > 0.0000001)
            {
                face_result.faces[i].landmark_score = *faceflag_ptr;

                ////////
                // pattern2. apply affin at each time. I took this because of ease of maintenance.
                ////////

                // landmark
                for (int j = 0; j < 468; j++)
                {
                    float x_ratio = landmark_ptr[j * 3 + 0] / landmark_input_width;
                    float y_ratio = landmark_ptr[j * 3 + 1] / landmark_input_height;
                    float x_position_in_crop = x_ratio * squared_size;
                    float y_position_in_crop = y_ratio * squared_size;
                    std::vector<cv::Point2f> src_points;
                    std::vector<cv::Point2f> dst_points;
                    src_points.push_back(cv::Point2f(x_position_in_crop, y_position_in_crop));

                    cv::perspectiveTransform(src_points, dst_points, reverse3x3);

                    face_result.faces[i].landmark_keys[j].x = (dst_points[0].x - squaredRoiMinX + minX) / width;
                    face_result.faces[i].landmark_keys[j].y = (dst_points[0].y - squaredRoiMinY + minY) / height;
                    face_result.faces[i].landmark_keys[j].z = landmark_ptr[j * 3 + 2];
                }
                // lip
                for (int j = 0; j < 80; j++)
                {
                    float x_ratio = output_lips_ptr[j * 2 + 0] / landmark_input_width;
                    float y_ratio = output_lips_ptr[j * 2 + 1] / landmark_input_height;
                    float x_position_in_crop = x_ratio * squared_size;
                    float y_position_in_crop = y_ratio * squared_size;
                    std::vector<cv::Point2f> src_points;
                    std::vector<cv::Point2f> dst_points;
                    src_points.push_back(cv::Point2f(x_position_in_crop, y_position_in_crop));

                    cv::perspectiveTransform(src_points, dst_points, reverse3x3);

                    face_result.faces[i].landmark_lips[j].x = (dst_points[0].x - squaredRoiMinX + minX) / width;
                    face_result.faces[i].landmark_lips[j].y = (dst_points[0].y - squaredRoiMinY + minY) / height;
                }
                // left eye
                for (int j = 0; j < 71; j++)
                {
                    float x_ratio = output_left_eye_ptr[j * 2 + 0] / landmark_input_width;
                    float y_ratio = output_left_eye_ptr[j * 2 + 1] / landmark_input_height;
                    float x_position_in_crop = x_ratio * squared_size;
                    float y_position_in_crop = y_ratio * squared_size;
                    std::vector<cv::Point2f> src_points;
                    std::vector<cv::Point2f> dst_points;
                    src_points.push_back(cv::Point2f(x_position_in_crop, y_position_in_crop));

                    cv::perspectiveTransform(src_points, dst_points, reverse3x3);

                    face_result.faces[i].landmark_left_eye[j].x = (dst_points[0].x - squaredRoiMinX + minX) / width;
                    face_result.faces[i].landmark_left_eye[j].y = (dst_points[0].y - squaredRoiMinY + minY) / height;
                }
                // right eye
                for (int j = 0; j < 71; j++)
                {
                    float x_ratio = output_right_eye_ptr[j * 2 + 0] / landmark_input_width;
                    float y_ratio = output_right_eye_ptr[j * 2 + 1] / landmark_input_height;
                    float x_position_in_crop = x_ratio * squared_size;
                    float y_position_in_crop = y_ratio * squared_size;
                    std::vector<cv::Point2f> src_points;
                    std::vector<cv::Point2f> dst_points;
                    src_points.push_back(cv::Point2f(x_position_in_crop, y_position_in_crop));

                    cv::perspectiveTransform(src_points, dst_points, reverse3x3);

                    face_result.faces[i].landmark_right_eye[j].x = (dst_points[0].x - squaredRoiMinX + minX) / width;
                    face_result.faces[i].landmark_right_eye[j].y = (dst_points[0].y - squaredRoiMinY + minY) / height;
                }

                // left iris
                for (int j = 0; j < 5; j++)
                {
                    float x_ratio = output_left_iris_ptr[j * 2 + 0] / landmark_input_width;
                    float y_ratio = output_left_iris_ptr[j * 2 + 1] / landmark_input_height;
                    float x_position_in_crop = x_ratio * squared_size;
                    float y_position_in_crop = y_ratio * squared_size;
                    std::vector<cv::Point2f> src_points;
                    std::vector<cv::Point2f> dst_points;
                    src_points.push_back(cv::Point2f(x_position_in_crop, y_position_in_crop));

                    cv::perspectiveTransform(src_points, dst_points, reverse3x3);

                    face_result.faces[i].landmark_left_iris[j].x = (dst_points[0].x - squaredRoiMinX + minX) / width;
                    face_result.faces[i].landmark_left_iris[j].y = (dst_points[0].y - squaredRoiMinY + minY) / height;
                }
                // right iris
                for (int j = 0; j < 5; j++)
                {
                    float x_ratio = output_right_iris_ptr[j * 2 + 0] / landmark_input_width;
                    float y_ratio = output_right_iris_ptr[j * 2 + 1] / landmark_input_height;
                    float x_position_in_crop = x_ratio * squared_size;
                    float y_position_in_crop = y_ratio * squared_size;
                    std::vector<cv::Point2f> src_points;
                    std::vector<cv::Point2f> dst_points;
                    src_points.push_back(cv::Point2f(x_position_in_crop, y_position_in_crop));

                    cv::perspectiveTransform(src_points, dst_points, reverse3x3);

                    face_result.faces[i].landmark_right_iris[j].x = (dst_points[0].x - squaredRoiMinX + minX) / width;
                    face_result.faces[i].landmark_right_iris[j].y = (dst_points[0].y - squaredRoiMinY + minY) / height;
                }
            }
        }

        //// output
        *outputBuffer = 0.0; // 検出した顔の数を初期化
        float *currentOutputPosition = outputBuffer + 1;
        if (face_result.num > 0)
        {
            for (int i = 0; i < face_result.num; i++)
            {

                (*outputBuffer)++; // 検出した手の数をインクリメント
                // score, rotateion
                *currentOutputPosition = face_result.faces[i].score;
                currentOutputPosition++;
                *currentOutputPosition = face_result.faces[i].landmark_score;
                currentOutputPosition++;
                *currentOutputPosition = face_result.faces[i].rotation;
                currentOutputPosition++;

                // face minX, minY, maxX, maxY
                *currentOutputPosition = face_result.faces[i].rect.topleft.x;
                currentOutputPosition++;
                *currentOutputPosition = face_result.faces[i].rect.topleft.y;
                currentOutputPosition++;
                *currentOutputPosition = face_result.faces[i].rect.btmright.x;
                currentOutputPosition++;
                *currentOutputPosition = face_result.faces[i].rect.btmright.y;
                currentOutputPosition++;
                // face center, w,h
                *currentOutputPosition = (face_result.faces[i].face_cx - (face_result.faces[i].face_w / 2));
                currentOutputPosition++;
                *currentOutputPosition = (face_result.faces[i].face_cy - (face_result.faces[i].face_h / 2));
                currentOutputPosition++;
                *currentOutputPosition = (face_result.faces[i].face_cx + (face_result.faces[i].face_w / 2));
                currentOutputPosition++;
                *currentOutputPosition = (face_result.faces[i].face_cy + (face_result.faces[i].face_h / 2));
                currentOutputPosition++;
                // rotated face position
                for (int j = 0; j < 4; j++)
                {
                    *currentOutputPosition = face_result.faces[i].face_pos[j].x;
                    currentOutputPosition++;
                    *currentOutputPosition = face_result.faces[i].face_pos[j].y;
                    currentOutputPosition++;
                }
                // face keypoint
                for (int j = 0; j < 6; j++)
                {
                    *currentOutputPosition = face_result.faces[i].keys[j].x;
                    currentOutputPosition++;
                    *currentOutputPosition = face_result.faces[i].keys[j].y;
                    currentOutputPosition++;
                }

                // landmark keypoint
                for (int j = 0; j < 468; j++)
                {
                    *currentOutputPosition = face_result.faces[i].landmark_keys[j].x;
                    currentOutputPosition++;
                    *currentOutputPosition = face_result.faces[i].landmark_keys[j].y;
                    currentOutputPosition++;
                    *currentOutputPosition = face_result.faces[i].landmark_keys[j].z;
                    currentOutputPosition++;
                }

                // landmark lips
                for (int j = 0; j < 80; j++)
                {
                    *currentOutputPosition = face_result.faces[i].landmark_lips[j].x;
                    currentOutputPosition++;
                    *currentOutputPosition = face_result.faces[i].landmark_lips[j].y;
                    currentOutputPosition++;
                }

                // landmark left_eye
                for (int j = 0; j < 71; j++)
                {
                    *currentOutputPosition = face_result.faces[i].landmark_left_eye[j].x;
                    currentOutputPosition++;
                    *currentOutputPosition = face_result.faces[i].landmark_left_eye[j].y;
                    currentOutputPosition++;
                }

                // landmark right_eye
                for (int j = 0; j < 71; j++)
                {
                    *currentOutputPosition = face_result.faces[i].landmark_right_eye[j].x;
                    currentOutputPosition++;
                    *currentOutputPosition = face_result.faces[i].landmark_right_eye[j].y;
                    currentOutputPosition++;
                }

                // landmark left_iris
                for (int j = 0; j < 5; j++)
                {
                    *currentOutputPosition = face_result.faces[i].landmark_left_iris[j].x;
                    currentOutputPosition++;
                    *currentOutputPosition = face_result.faces[i].landmark_left_iris[j].y;
                    currentOutputPosition++;
                }
                // landmark right_iris
                for (int j = 0; j < 5; j++)
                {
                    *currentOutputPosition = face_result.faces[i].landmark_right_iris[j].x;
                    currentOutputPosition++;
                    *currentOutputPosition = face_result.faces[i].landmark_right_iris[j].y;
                    currentOutputPosition++;
                }
            }
        }
    }
};
#endif //__OPENCV_BARCODE_BARDETECT_HPP__
