#include <SDL/SDL.h>
#include <cstdio>
#include <emscripten.h>
#include "tensorflow/lite/kernels/register.h"
#include "tensorflow/lite/model.h"
#include <cmath>
#include <chrono>

#define CHECK_TFLITE_ERROR(x)                                    \
    if (!(x))                                                    \
    {                                                            \
        printf("[WASM] Error at %s:%d\n", __FILE__, __LINE__);   \
        return 1;                                                \
    }


namespace{
    const int MAX_WIDTH   = 512;
    const int MAX_HEIGHT  = 512;
    char modelBuffer[1024*1024*256]; 
    
    ///// Buffer for image processing
    unsigned char inputImageBuffer[3 * MAX_WIDTH * MAX_HEIGHT]; 
    // unsigned char resizedImageBuffer[3 * MAX_WIDTH * MAX_HEIGHT]; 
    // unsigned char resultImageBuffer[3 * MAX_WIDTH * MAX_HEIGHT];
    unsigned char outputImageBuffer[3 * MAX_WIDTH * MAX_HEIGHT];  

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

    EMSCRIPTEN_KEEPALIVE
    int exec(int width, int height){
        int tensorBatch = interpreter->input_tensor(0)->dims->data[0];
        int tensorWidth  = interpreter->input_tensor(0)->dims->data[2];
        int tensorHeight = interpreter->input_tensor(0)->dims->data[1];
        int tensorCh = interpreter->input_tensor(0)->dims->data[3];
        printf("[WASM] TensorSize IN:(%d, %d, %d, %d)\n", tensorBatch, tensorWidth, tensorHeight, tensorCh);
        
        int out0 = interpreter->output_tensor(0)->dims->data[0];
        int outTensorWidth  = interpreter->output_tensor(0)->dims->data[2];
        int outTensorHeight = interpreter->output_tensor(0)->dims->data[1];
        int out3  = interpreter->output_tensor(0)->dims->data[3];
        int out4  = interpreter->output_tensor(0)->dims->data[4];
        int out5  = interpreter->output_tensor(0)->dims->data[5];
        int out6  = interpreter->output_tensor(0)->dims->data[6];
        printf("[WASM] TensorSize OUT:(%d, %d, %d, %d, %d, %d, %d)\n",out0, outTensorWidth, outTensorHeight, out3, out4, out5, out6);

        for (auto i : interpreter->outputs()) {
            const TfLiteTensor* tensor = interpreter->tensor(i);
            printf("[wasm]: OUTPUT:%s %zu\n", tensor->name, tensor->bytes);
            printf("[wasm]: OUTPUT:%d, %d, %d, %d, %d, %d\n", tensor->dims->data[0],tensor->dims->data[1],tensor->dims->data[2],tensor->dims->data[3],tensor->dims->data[4],tensor->dims->data[5]);
        }


        // //// Resize
        // cv::Mat inputImage(height, width, CV_8UC3, (unsigned char*)inputImageBuffer);
        // cv::Mat resizedImage(tensorHeight, tensorWidth, CV_8UC3, (unsigned char*)resizedImageBuffer);
        // cv::resize(inputImage, resizedImage, resizedImage.size(), 0, 0, cv::INTER_LINEAR);

        // //// input
        // float *input = interpreter->typed_input_tensor<float>(0);
        // for(int i = 0; i < tensorHeight * tensorWidth; i++){
        //     input[i * 3 + 0] = resizedImageBuffer[i * 3 + 0] / 127.5 - 1;
        //     input[i * 3 + 1] = resizedImageBuffer[i * 3 + 1] / 127.5 - 1;
        //     input[i * 3 + 2] = resizedImageBuffer[i * 3 + 2] / 127.5 - 1;
        // }

        // // infer       
        // CHECK_TFLITE_ERROR(interpreter->Invoke() == kTfLiteOk);

        // // output
        // float *output = interpreter->typed_output_tensor<float>(0);
        // cv::Mat resultImage32FC(tensorHeight, tensorWidth, CV_32FC3, output);
        // cv::Mat resultImage8UC(tensorHeight, tensorWidth, CV_8UC3, resultImageBuffer);
        // cv::Mat resizedResultImage(height, width, CV_8UC3, outputImageBuffer);
        
        // resultImage32FC = resultImage32FC +  cv::Scalar(1, 1, 1);
        // resultImage32FC = resultImage32FC * 127.5;
        // resultImage32FC.convertTo(resultImage8UC, CV_8UC3);
        // cv::resize(resultImage8UC, resizedResultImage, resizedResultImage.size(), 0, 0, cv::INTER_LINEAR);

        return 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int loadModel(int bufferSize){
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] - TFLite Model Loader for white-box-cartoonization     -\n");
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
        CHECK_TFLITE_ERROR(interpreter->AllocateTensors() == kTfLiteOk);

        return 0;
    }
}