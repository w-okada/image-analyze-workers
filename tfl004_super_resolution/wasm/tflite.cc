#include <SDL/SDL.h>
#include <cstdio>
#include <emscripten.h>
#include "tensorflow/lite/kernels/register.h"
#include "tensorflow/lite/model.h"
#include "opencv2/opencv.hpp"
#include <cmath>
#include <chrono>

#define CHECK_TFLITE_ERROR(x)                                    \
    if (!(x))                                                    \
    {                                                            \
        printf("[WASM] Error at %s:%d %d\n", __FILE__, __LINE__, x);   \
        return 1;                                                \
    }


namespace{
    const int MAX_WIDTH   = 1024 *2;
    const int MAX_HEIGHT  = 1024 *2;
    char modelBuffer[1024*1024*256]; 
    
    ///// Buffer for image processing
    unsigned char inputImageBuffer[4 * MAX_WIDTH * MAX_HEIGHT]; 
    unsigned char outputImageBuffer[4 * MAX_WIDTH * MAX_HEIGHT];  


    const int INTER_NEAREST  = 0;
    const int INTER_LINEAR   = 1;
    const int INTER_AREA     = 2;
    const int INTER_CUBIC    = 3;
    const int INTER_LANCZOS4 = 4;
    const int INTER_ESPCN    = 100;
}

using std::chrono::high_resolution_clock;
std::unique_ptr<tflite::Interpreter> interpreter;

auto start_time = high_resolution_clock::now();
auto count = 0;

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    char *getModelBufferMemoryOffset(){
        return modelBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    unsigned char *getInputImageBufferOffset(){
        return inputImageBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    unsigned char *getOutputImageBufferOffset(){
        return outputImageBuffer;
    }



    int getOpenCVInterpolationCode(int mode){
        int interpolation = cv::INTER_LINEAR;
        switch(mode){
            case INTER_NEAREST:
                interpolation = cv::INTER_NEAREST;
                break;
            case INTER_LINEAR:
                interpolation = cv::INTER_LINEAR;
                break;
            case INTER_AREA:
                interpolation = cv::INTER_AREA;
                break;
            case INTER_CUBIC:
                interpolation = cv::INTER_CUBIC;
                break;
            case INTER_LANCZOS4:
                interpolation = cv::INTER_LANCZOS4;
                break;
            default:
                interpolation = cv::INTER_LINEAR;
        }
        return interpolation;
    }

    EMSCRIPTEN_KEEPALIVE
    void showExceptionMsg(intptr_t ptr) {
        std::cout << ptr << std::endl;
        auto e = reinterpret_cast<std::exception*>(ptr);
        std::cout << e->what() << std::endl;
    }


    EMSCRIPTEN_KEEPALIVE
    int exec(int width, int height, int interpolationType){
        //interpolationType => 0: espcn, 1:cubic

        // (0) setup interpretter
        std::vector<int> sizes = {1, height, width, 1};
        CHECK_TFLITE_ERROR(interpreter->ResizeInputTensor(0, sizes) == kTfLiteOk);
        CHECK_TFLITE_ERROR(interpreter->AllocateTensors() == kTfLiteOk);

        int outHeight = interpreter->output_tensor(0)->dims->data[1];
        int outWidth  = interpreter->output_tensor(0)->dims->data[2];



        // (1) Generate InputImage and OutputImage Mat
        cv::Mat inputImage(height, width, CV_8UC4, inputImageBuffer);
        cv::Mat outputImage(outHeight, outWidth, CV_8UC4, outputImageBuffer);
        cv::Mat inputImageCrCb(height, width, CV_8UC2);
        float *input = interpreter->typed_input_tensor<float>(0);
        float *output = interpreter->typed_output_tensor<float>(0);
        
        // (1.5) normal interpolatiopn.
        if( interpolationType != INTER_ESPCN){
            // early return when normal interpolation is selected
            int code = getOpenCVInterpolationCode(interpolationType);
            cv::resize(inputImage, outputImage, outputImage.size(), 0, 0, code);
            return 0;
        }

        // (2) Convert RGBA2YCrCb, Extract Y of YCrCb
        unsigned char *inputImageCrCbBuffer = inputImageCrCb.data;
        for (int i = 0; i < width * height; ++i) {
            int r = inputImageBuffer[i * 4 + 0];
            int g = inputImageBuffer[i * 4 + 1];
            int b = inputImageBuffer[i * 4 + 2];
            float y = 0.299f * r + 0.587f * g + 0.114f * b;
            float cr = (r - y) * 0.713f + 128.0f;
            float cb = (b - y) * 0.564f + 128.0f;
            inputImageCrCbBuffer[i * 2 + 0] = cv::saturate_cast<unsigned char>(cr);
            inputImageCrCbBuffer[i * 2 + 1] = cv::saturate_cast<unsigned char>(cb);
            input[i] = y / 255.0f; 
        }
        // (3) infer       
        CHECK_TFLITE_ERROR(interpreter->Invoke() == kTfLiteOk);

        // (4) resize original for output
        cv::Mat resizedInputImage(outHeight, outWidth, CV_8UC2);
        cv::resize(inputImageCrCb, resizedInputImage, resizedInputImage.size(), 0, 0, cv::INTER_CUBIC);

        // (5) merge result and input to output
        unsigned char *resizedInputImageBuffer = resizedInputImage.data;
        for (int i = 0; i < outWidth * outHeight; ++i) {
            float y = output[i] * 255.0f;
            float cr = resizedInputImageBuffer[i * 2 + 0];
            float cb = resizedInputImageBuffer[i * 2 + 1];
            unsigned int r = cv::saturate_cast<unsigned char>(y + 1.403f * (cr - 128));
            unsigned int g = cv::saturate_cast<unsigned char>(y - 0.714f * (cr - 128) - 0.344f * (cb - 128));
            unsigned int b = cv::saturate_cast<unsigned char>(y + 1.773 * (cb - 128));
            outputImageBuffer[i * 4 + 0] = r;
            outputImageBuffer[i * 4 + 1] = g;
            outputImageBuffer[i * 4 + 2] = b;
            outputImageBuffer[i * 4 + 3] = 255;
        }

        return 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int loadModel(int bufferSize){
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] - TFLite Model Loader for espcn                        -\n");
        printf("[WASM] - Bug report:                                          -\n");
        printf("[WASM] -   https://github.com/w-okada/image-analyze-workers   -\n");
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] \n");
        printf("[WASM] Loading model of size: %d\n", bufferSize);

        // Load model
        std::unique_ptr<tflite::FlatBufferModel> model = tflite::FlatBufferModel::BuildFromBuffer(modelBuffer, bufferSize);
        CHECK_TFLITE_ERROR(model != nullptr);

        tflite::ops::builtin::BuiltinOpResolver resolver;
        tflite::InterpreterBuilder builder(*model, resolver);
        builder(&interpreter);
        CHECK_TFLITE_ERROR(interpreter != nullptr);
        // CHECK_TFLITE_ERROR(interpreter->AllocateTensors() == kTfLiteOk);



        // int s1 = interpreter->tensors_size();
        // int s2 = interpreter->nodes_size();
        // int s3 = interpreter->inputs().size();
        // const char * s4 = interpreter->GetInputName(0);
        // printf(">>>>>>>>>>> %d, %d, %d, %s\n", s1, s2, s3, s4);
        // for (int indxInput=0; indxInput < interpreter->inputs().size(); ++indxInput){
        //     for (int indxDim=0; indxDim < interpreter->input_tensor(indxInput)->dims->size; ++indxDim){
        //         printf(">>  %d, %d, %d\n", indxInput, indxDim, interpreter->tensor(indxInput)->dims->data[indxDim]);
        //     }
        // }

        // int s5 = interpreter->outputs().size();
        // const char * s6 = interpreter->GetOutputName(0);
        // printf(">>>>>>>>>>> %d, %s\n", s5, s6);
        // for (int indxOutput=0; indxOutput < interpreter->outputs().size(); ++indxOutput){
        //     for (int indxDim=0; indxDim < interpreter->output_tensor(indxOutput)->dims->size; ++indxDim){
        //         printf(">>  %d, %d, %d\n", indxOutput, indxDim, interpreter->output_tensor(indxOutput)->dims->data[indxDim]);
        //     }
        // }

        return 0;
    }
}
