#ifndef __OPENCV_BARCODE_BARDETECT_HPP__
#define __OPENCV_BARCODE_BARDETECT_HPP__

#include "tensorflow/lite/kernels/register.h"
#include "tensorflow/lite/model.h"
#include "opencv2/opencv.hpp"
#include <list>
#include "handpose.hpp"
#include "custom_ops/transpose_conv_bias.h"
#include "mediapipe/Anchor.hpp"
#include "const.hpp"
std::unique_ptr<tflite::Interpreter> interpreter;

static std::vector<Anchor> s_anchors;

/* -------------------------------------------------- *
 *  Decode palm detection result
 * -------------------------------------------------- */
static int
decode_keypoints(std::list<palm_t> &palm_list, float score_thresh)
{
    palm_t palm_item;
    float *scores_ptr;
    float *points_ptr;
    int img_w = 256;
    int img_h = 256;
    // int img_w = 192;
    // int img_h = 192;

    for (auto i : interpreter->outputs())
    {
        const TfLiteTensor *tensor = interpreter->tensor(i);
        // if (strcmp(tensor->name, "Identity:0") == 0)
        // if (strcmp(tensor->name, "Identity") == 0)
        if (strcmp(tensor->name, "regressors") == 0)
        {
            // scores_ptr = interpreter->typed_output_tensor<float>(i); // fake
            points_ptr = interpreter->typed_output_tensor<float>(0);
        }
        // else if (strcmp(tensor->name, "Identity_1:0") == 0)
        // else if (strcmp(tensor->name, "Identity_1") == 0)
        else if (strcmp(tensor->name, "classificators") == 0)
        {
            // points_ptr = interpreter->typed_output_tensor<float>(i); // fake
            scores_ptr = interpreter->typed_output_tensor<float>(1);
        }
        else
        {
            printf("[WASM]: UNKNOWN OUTPUT[%d]: Name:%s Size:%zu\n", i, tensor->name, tensor->bytes);
        }
    }

    int i = 0;
    for (auto itr = s_anchors.begin(); itr != s_anchors.end(); i++, itr++)
    {
        Anchor anchor = *itr;
        float score0 = scores_ptr[i];
        float score = 1.0f / (1.0f + exp(-score0));
        // printf("score %f ,  %f \n", score, score0);

        if (score > score_thresh)
        {
            float *p = points_ptr + (i * 18);

            /* boundary box */
            float sx = p[0];
            float sy = p[1];
            float w = p[2];
            float h = p[3];
            // printf("pos %f %f %f %f\n", sx, sy, w, h);

            float cx = sx + anchor.x_center * img_w;
            float cy = sy + anchor.y_center * img_h;

            cx /= (float)img_w;
            cy /= (float)img_h;
            w /= (float)img_w;
            h /= (float)img_h;

            fvec2 topleft, btmright;
            topleft.x = cx - w * 0.5f;
            topleft.y = cy - h * 0.5f;
            btmright.x = cx + w * 0.5f;
            btmright.y = cy + h * 0.5f;

            palm_item.score = score;
            palm_item.rect.topleft = topleft;
            palm_item.rect.btmright = btmright;

            /* landmark positions (7 keys) */
            for (int j = 0; j < 7; j++)
            {
                float lx = p[4 + (2 * j) + 0];
                float ly = p[4 + (2 * j) + 1];
                lx += anchor.x_center * img_w;
                ly += anchor.y_center * img_h;
                lx /= (float)img_w;
                ly /= (float)img_h;

                palm_item.keys[j].x = lx;
                palm_item.keys[j].y = ly;
            }

            palm_list.push_back(palm_item);
        }
    }
    return 0;
}

static bool
compare(palm_t &v1, palm_t &v2)
{
    if (v1.score > v2.score)
        return true;
    else
        return false;
}

static float
calc_intersection_over_union(rect_t &rect0, rect_t &rect1)
{
    float sx0 = rect0.topleft.x;
    float sy0 = rect0.topleft.y;
    float ex0 = rect0.btmright.x;
    float ey0 = rect0.btmright.y;
    float sx1 = rect1.topleft.x;
    float sy1 = rect1.topleft.y;
    float ex1 = rect1.btmright.x;
    float ey1 = rect1.btmright.y;

    float xmin0 = std::min(sx0, ex0);
    float ymin0 = std::min(sy0, ey0);
    float xmax0 = std::max(sx0, ex0);
    float ymax0 = std::max(sy0, ey0);
    float xmin1 = std::min(sx1, ex1);
    float ymin1 = std::min(sy1, ey1);
    float xmax1 = std::max(sx1, ex1);
    float ymax1 = std::max(sy1, ey1);

    float area0 = (ymax0 - ymin0) * (xmax0 - xmin0);
    float area1 = (ymax1 - ymin1) * (xmax1 - xmin1);
    if (area0 <= 0 || area1 <= 0)
        return 0.0f;

    float intersect_xmin = std::max(xmin0, xmin1);
    float intersect_ymin = std::max(ymin0, ymin1);
    float intersect_xmax = std::min(xmax0, xmax1);
    float intersect_ymax = std::min(ymax0, ymax1);

    float intersect_area = std::max(intersect_ymax - intersect_ymin, 0.0f) *
                           std::max(intersect_xmax - intersect_xmin, 0.0f);

    return intersect_area / (area0 + area1 - intersect_area);
}
static int
non_max_suppression(std::list<palm_t> &face_list, std::list<palm_t> &face_sel_list, float iou_thresh)
{
    face_list.sort(compare);

    for (auto itr = face_list.begin(); itr != face_list.end(); itr++)
    {
        palm_t face_candidate = *itr;

        int ignore_candidate = false;
        for (auto itr_sel = face_sel_list.rbegin(); itr_sel != face_sel_list.rend(); itr_sel++)
        {
            palm_t face_sel = *itr_sel;

            float iou = calc_intersection_over_union(face_candidate.rect, face_sel.rect);
            if (iou >= iou_thresh)
            {
                ignore_candidate = true;
                break;
            }
        }

        if (!ignore_candidate)
        {
            face_sel_list.push_back(face_candidate);
            if (face_sel_list.size() >= MAX_PALM_NUM)
                break;
        }
    }

    return 0;
}

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

    static float
    normalize_radians(float angle)
    {
        return angle - 2 * M_PI * std::floor((angle - (-M_PI)) / (2 * M_PI));
    }

    static void
    compute_rotation(palm_t &palm)
    {
        float x0 = palm.keys[0].x; // Center of wrist.
        float y0 = palm.keys[0].y;
        float x1 = palm.keys[2].x; // MCP of middle finger.
        float y1 = palm.keys[2].y;

        float target_angle = M_PI * 0.5f;
        float rotation = target_angle - std::atan2(-(y1 - y0), x1 - x0);

        palm.rotation = normalize_radians(rotation);
    }
    static void
    rot_vec(fvec2 &vec, float rotation)
    {
        float sx = vec.x;
        float sy = vec.y;
        vec.x = sx * std::cos(rotation) - sy * std::sin(rotation);
        vec.y = sx * std::sin(rotation) + sy * std::cos(rotation);
    }

    static void
    compute_hand_rect(palm_t &palm)
    {
        float width = palm.rect.btmright.x - palm.rect.topleft.x;
        float height = palm.rect.btmright.y - palm.rect.topleft.y;
        float palm_cx = palm.rect.topleft.x + width * 0.5f;
        float palm_cy = palm.rect.topleft.y + height * 0.5f;
        float hand_cx;
        float hand_cy;
        float rotation = palm.rotation;
        float shift_x = 0.0f;
        float shift_y = -0.5f;

        if (rotation == 0.0f)
        {
            hand_cx = palm_cx + (width * shift_x);
            hand_cy = palm_cy + (height * shift_y);
        }
        else
        {
            float dx = (width * shift_x) * std::cos(rotation) -
                       (height * shift_y) * std::sin(rotation);
            float dy = (width * shift_x) * std::sin(rotation) +
                       (height * shift_y) * std::cos(rotation);
            hand_cx = palm_cx + dx;
            hand_cy = palm_cy + dy;
        }

        float long_side = std::max(width, height);
        width = long_side;
        height = long_side;
        float hand_w = width * 2.6f;
        float hand_h = height * 2.6f;

        palm.hand_cx = hand_cx;
        palm.hand_cy = hand_cy;
        palm.hand_w = hand_w;
        palm.hand_h = hand_h;

        float dx = hand_w * 0.5f;
        float dy = hand_h * 0.5f;

        palm.hand_pos[0].x = -dx;
        palm.hand_pos[0].y = -dy;
        palm.hand_pos[1].x = +dx;
        palm.hand_pos[1].y = -dy;
        palm.hand_pos[2].x = +dx;
        palm.hand_pos[2].y = +dy;
        palm.hand_pos[3].x = -dx;
        palm.hand_pos[3].y = +dy;

        for (int i = 0; i < 4; i++)
        {
            rot_vec(palm.hand_pos[i], rotation);
            palm.hand_pos[i].x += hand_cx;
            palm.hand_pos[i].y += hand_cy;
        }
    }

    static void
    pack_palm_result(palm_detection_result_t *palm_result, std::list<palm_t> &palm_list)
    {
        int num_palms = 0;
        palm_result->num = 0;
        for (auto itr = palm_list.begin(); itr != palm_list.end(); itr++)
        {
            palm_t palm = *itr;

            compute_rotation(palm);
            compute_hand_rect(palm);

            memcpy(&palm_result->palms[num_palms], &palm, sizeof(palm));
            num_palms++;
            palm_result->num = num_palms;

            if (num_palms >= MAX_PALM_NUM)
                break;
        }
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

        decode_keypoints(palm_list, score_thresh);

        // // for (int i = 0; i < (int)s_anchors.size(); i++)
        // // {
        // //     printf("[%4d](%f, %f, %f, %f)\n", i,
        // //            s_anchors[i].x_center, s_anchors[i].y_center, s_anchors[i].w, s_anchors[i].h);
        // // }

        // printf("palm::::start \n");
        // std::for_each(
        //     palm_list.cbegin(), palm_list.cend(), [](palm_t x)
        //     { std::cout << x.score << " " << x.hand_cx << " " << x.hand_cy << " " << x.hand_w << " " << x.hand_h << " \n"; });
        // printf("palm::::end \n");

        float iou_thresh = 0.03f;
        std::list<palm_t> palm_nms_list;

        non_max_suppression(palm_list, palm_nms_list, iou_thresh);
        std::for_each(
            palm_nms_list.cbegin(), palm_nms_list.cend(), [](palm_t x)
            { std::cout << x.score << " " << x.rect.topleft.x << " " << x.rect.topleft.y << " " << x.rect.btmright.x << " " << x.rect.btmright.y << " \n"; });

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
