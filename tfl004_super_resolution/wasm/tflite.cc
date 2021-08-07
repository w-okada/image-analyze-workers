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
        
        // (1.5) normal interpolatiopn.
        if( interpolationType != INTER_ESPCN){
            // early return when normal interpolation is selected
            int code = getOpenCVInterpolationCode(interpolationType);
            cv::resize(inputImage, outputImage, outputImage.size(), 0, 0, code);
            return 0;
        }

        // (2) Extract Y of YUV
        std::vector<cv::Mat> inputPlanes;
        cv::Mat inputYUV;
        cv::cvtColor(inputImage, inputYUV, cv::COLOR_RGB2YUV);
        cv::split(inputYUV, inputPlanes);

        // (3) input
        float *input = interpreter->typed_input_tensor<float>(0);
        cv::Mat intepreterInputMat(height, width, CV_32FC1, input);
        inputPlanes[0].convertTo(intepreterInputMat, CV_32F, 1.0f / 255.0f);

        // (4) infer       
        CHECK_TFLITE_ERROR(interpreter->Invoke() == kTfLiteOk);

        // (5) output
        float *output = interpreter->typed_output_tensor<float>(0);
        cv::Mat intepreterOutputMat(outHeight, outWidth, CV_32FC1, output);

        // (6) convert output to uint8
        cv::Mat intepreterOutputMatUC8(outHeight, outWidth, CV_8UC1);
        intepreterOutputMat.convertTo(intepreterOutputMatUC8, CV_8U, 255.0f);

        // (7) resize original for output
        cv::Mat resizedInputImageU(outHeight, outWidth, CV_8UC1);
        cv::Mat resizedInputImageV(outHeight, outWidth, CV_8UC1);
        cv::resize(inputPlanes[1], resizedInputImageU, resizedInputImageU.size(), 0, 0, cv::INTER_CUBIC);
        cv::resize(inputPlanes[2], resizedInputImageV, resizedInputImageV.size(), 0, 0, cv::INTER_CUBIC);

        // (8) merge result and input to output
        cv::Mat channels[] = {intepreterOutputMatUC8, resizedInputImageU, resizedInputImageV};
        cv::Mat outputYUV;
        cv::merge(channels, 3, outputYUV);
        cv::cvtColor(outputYUV, outputImage, cv::COLOR_YUV2RGB, 4); // 4 is required!


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
