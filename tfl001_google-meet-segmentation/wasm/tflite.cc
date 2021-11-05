#include <SDL/SDL.h>
#include <cstdio>
#include <emscripten.h>
#include "tensorflow/lite/kernels/register.h"
#include "tensorflow/lite/model.h"
#include "mediapipe/util/tflite/operations/transpose_conv_bias.h"

#include <cmath>
#include "opencv2/opencv.hpp"
#include <chrono>

#include "opencv2/ximgproc.hpp"

#define CHECK_TFLITE_ERROR(x)                                    \
    if (!(x))                                                    \
    {                                                            \
        printf("[WASM] Error at %s:%d\n", __FILE__, __LINE__);   \
        return 1;                                                \
    }


namespace{
    ///// Constants
    const int MAX_WIDTH   = 512;
    const int MAX_HEIGHT  = 512;

    ///// Buffer for model
    char modelBuffer[1024 * 1024 * 1];

    ///// Buffer for image processing
    unsigned char inputImageBuffer[4 * MAX_WIDTH * MAX_HEIGHT];                                       // Input image Buffer
    float         inputImageBuffer32F[3 * MAX_WIDTH * MAX_HEIGHT]; 
    unsigned char grayedInputImageBuffer[1 * MAX_WIDTH * MAX_HEIGHT];                                 // Grayscaled Image Buffer

    unsigned char outputSegBuffer[1 * MAX_WIDTH * MAX_HEIGHT];                                        // softmaxed output from model
    unsigned char outputImageBuffer[4 * MAX_WIDTH * MAX_HEIGHT];                                      // final output buffer

    float jbfGuideImageBuffer[1 * MAX_WIDTH * MAX_HEIGHT];                                    // for JBF
    float jbfInputImageBuffer[1 * MAX_WIDTH * MAX_HEIGHT];                                    // for JBF


    const int INTER_NEAREST = 0;
    const int INTER_LINEAR = 1;
    const int INTER_AREA = 2;
    const int INTER_CUBIC  = 3;
    const int INTER_LANCZOS4 = 4;

    [[maybe_unused]] const int POST_NONE = 0;
    [[maybe_unused]] const int POST_SOFTMAX = 1;
    [[maybe_unused]] const int POST_JBF = 2;
    [[maybe_unused]] const int POST_SFOTMAX_JBF = 3;

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

    // Input Image for exec
    EMSCRIPTEN_KEEPALIVE
    unsigned char *getInputImageBufferOffset(){
        return inputImageBuffer;
    }

    // Input Image for jbf
    EMSCRIPTEN_KEEPALIVE
    float *getJbfGuideImageBufferOffset(){
        return jbfGuideImageBuffer;
    }
    EMSCRIPTEN_KEEPALIVE
    float *getJbfInputImageBufferOffset(){
        return jbfInputImageBuffer;
    }

    // Output
    EMSCRIPTEN_KEEPALIVE
    unsigned char *getOutputImageBufferOffset(){
        return outputImageBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    unsigned char *getGrayedImageBufferOffset(){
        return grayedInputImageBuffer;
    }


    EMSCRIPTEN_KEEPALIVE
    int jbf(int inputWidth, int inputHeight, int outputWidth, int outputHeight, int d, double sigmaColor, double sigmaSpace, int postProcessType, int interpolation, float threshold){
        int cv_interpolation = cv::INTER_NEAREST;
        switch(interpolation){
            case INTER_NEAREST:
                cv_interpolation = cv::INTER_NEAREST;
                break;
            case INTER_LINEAR:
                cv_interpolation = cv::INTER_LINEAR;
                break;
            case INTER_AREA:
                cv_interpolation = cv::INTER_AREA;
                break;
            case INTER_CUBIC:
                cv_interpolation = cv::INTER_CUBIC;
                break;
            case INTER_LANCZOS4:
                cv_interpolation = cv::INTER_LANCZOS4;
                break;
            default:
                cv_interpolation = cv::INTER_LINEAR;;
        }


        cv::Mat inputImage(inputHeight, inputWidth, CV_32FC1, jbfInputImageBuffer); 
        cv::Mat guideImage(inputHeight, inputWidth, CV_32FC1, jbfGuideImageBuffer); 
        unsigned char *segBuffer = &outputSegBuffer[0];

        if(postProcessType == 0){ // none(treshold)
            cv::Mat segBufferForThreshMat(inputHeight, inputWidth, CV_8UC1);
            inputImage.convertTo(segBufferForThreshMat, CV_8U, 255, 0);
            cv::Mat segBufferMat(inputHeight, inputWidth, CV_8UC1, segBuffer);
            unsigned char thresholdValue = static_cast<unsigned char>(255 * threshold);
            cv::threshold(segBufferForThreshMat, segBufferMat, thresholdValue, 255, cv::THRESH_BINARY);
        // }else if(postProcessType == 1){ // softmax
        //     cv::Mat shiftMat, personShift, backgroundShift, expPersonShift, expBackgroundShift, sumMat, softmaxMatPerson;
        //     cv::Mat segBufferMat(inputHeight, inputWidth, CV_8UC1, segBuffer);   // segBufferMat is mapped to outputSegBuffer
        //     cv::max(guideImage, inputImage, shiftMat);
        //     cv::subtract(guideImage, shiftMat, backgroundShift);
        //     cv::subtract(inputImage, shiftMat, personShift);
        //     cv::exp(backgroundShift, expBackgroundShift);
        //     cv::exp(personShift, expPersonShift);
        //     cv::add(expBackgroundShift, expPersonShift, sumMat);
        //     cv::divide(expPersonShift, sumMat, softmaxMatPerson);
            
        //     softmaxMatPerson.convertTo(segBufferMat, CV_8U, 255, 0);
        }else if(postProcessType == 1 || postProcessType == 2 || postProcessType == 3){ // joint bilateral filter
            cv::Mat jbfMat;
            cv::Mat segBufferMat(inputHeight, inputWidth, CV_8UC1, segBuffer);   // segBufferMat is mapped to outputSegBuffer
            cv::ximgproc::jointBilateralFilter(guideImage, inputImage, jbfMat, d, sigmaColor, sigmaSpace);
            jbfMat.convertTo(segBufferMat, CV_8U, 255, 0);

        // }else if(postProcessType == 3){ // softmax + joint bilateral filter
        //     cv::Mat shiftMat, personShift, backgroundShift, expPersonShift, expBackgroundShift, sumMat, softmaxMatPerson, softmaxMatBackground, jbfMat;
        //     cv::max(inputImage, guideImage, shiftMat);
        //     cv::subtract(guideImage, shiftMat, backgroundShift);
        //     cv::subtract(inputImage, shiftMat, personShift);
        //     cv::exp(backgroundShift, expBackgroundShift);
        //     cv::exp(personShift, expPersonShift);
        //     cv::add(expBackgroundShift, expPersonShift, sumMat);
        //     cv::divide(expPersonShift, sumMat, softmaxMatPerson);
        //     cv::divide(expBackgroundShift, sumMat, softmaxMatBackground);
            
        //     cv::ximgproc::jointBilateralFilter(softmaxMatBackground, softmaxMatPerson, jbfMat, d, sigmaColor, sigmaSpace);
        //     cv::Mat segBufferMat(inputHeight, inputWidth, CV_8UC1, segBuffer);   // segBufferMat is mapped to outputSegBuffer
        //     jbfMat.convertTo(segBufferMat, CV_8U, 255, 0);
        }else{
        }

        // (4) Resize segmantation 
        unsigned char *outputImageBuf = &outputImageBuffer[0];
        cv::Mat grayMat(inputHeight, inputWidth, CV_8UC1, outputSegBuffer);
        cv::Mat resizedGrayMat(outputHeight, outputWidth, CV_8UC1);
        cv::resize(grayMat, resizedGrayMat, resizedGrayMat.size(), 0, 0, cv_interpolation);
        cv::Mat mat255(outputHeight, outputWidth, CV_8UC1, 255);
        cv::Mat channels[] = {mat255, mat255, mat255, resizedGrayMat};
        cv::Mat outMat(outputHeight, outputWidth, CV_8UC4, outputImageBuf);
        cv::merge(channels, 4, outMat);
        return 0;

    }

    EMSCRIPTEN_KEEPALIVE
    int exec_with_jbf(int width, int height, int d, double sigmaColor, double sigmaSpace, int postProcessType, int interpolation, float threshold){
        // [postProcessType] !!! *1 selfie model ignore this parameter. fallback to softmax
        // 0: none (threshold)
        // 1: softmax
        // 2: joint bilateral filter  (*1)
        // 3: softmax + joint bilateral filter (*1)

        int tensorWidth  = interpreter->input_tensor(0)->dims->data[2];
        int tensorHeight = interpreter->input_tensor(0)->dims->data[1];
        int output_ch     = interpreter->output_tensor(0)->dims->data[3];
        // printf("[WASM] TensorSize (%d, %d, %d)\n", tensorWidth, tensorHeight, output_ch);

        int cv_interpolation = cv::INTER_NEAREST;
        switch(interpolation){
            case INTER_NEAREST:
                cv_interpolation = cv::INTER_NEAREST;
                break;
            case INTER_LINEAR:
                cv_interpolation = cv::INTER_LINEAR;
                break;
            case INTER_AREA:
                cv_interpolation = cv::INTER_AREA;
                break;
            case INTER_CUBIC:
                cv_interpolation = cv::INTER_CUBIC;
                break;
            case INTER_LANCZOS4:
                cv_interpolation = cv::INTER_LANCZOS4;
                break;
            default:
                cv_interpolation = cv::INTER_LINEAR;;
        }

        // printf("interpolation::::: %d\n", cv_interpolation);


        // (1) Resize
        float *input = interpreter->typed_input_tensor<float>(0);
        cv::Mat inputImage(height, width, CV_8UC4, inputImageBuffer);           // map input to matrix
        cv::Mat inputImageRGB(height, width, CV_8UC3);                          // split alpha channel
        int fromTo[] = {0,0, 1,1, 2,2};
        cv::mixChannels(&inputImage, 1, &inputImageRGB, 1, fromTo, 3);
        cv::Mat inputImage32F(height, width, CV_32FC3, inputImageBuffer32F);    // convert to float
        cv::Mat resizedInput(tensorHeight, tensorWidth, CV_32FC3, input);       // resize to the size of tflite model
        inputImageRGB.convertTo(inputImage32F, CV_32FC3);
        inputImage32F = inputImage32F / 255.0;
        cv::resize(inputImage32F, resizedInput, resizedInput.size(), 0, 0, cv_interpolation);

        // (2) Infer
        CHECK_TFLITE_ERROR(interpreter->Invoke() == kTfLiteOk);

        // (3) Generate segmentation
        float *output = interpreter->typed_output_tensor<float>(0);
        unsigned char *segBuffer = &outputSegBuffer[0];
        if(output_ch ==2) {                                                    // not selfie model 
            cv::Mat outputMat(tensorHeight, tensorWidth, CV_32FC2, output);
            cv::Mat channels[2]; // 0:background, 1:person 
            cv::split(outputMat, channels);
            if(postProcessType == 0){ // none(treshold)
                cv::Mat segBufferForThreshMat(tensorHeight, tensorWidth, CV_8UC1);
                channels[1].convertTo(segBufferForThreshMat, CV_8U, 255, 0);
                cv::Mat segBufferMat(tensorHeight, tensorWidth, CV_8UC1, segBuffer);
                unsigned char thresholdValue = static_cast<unsigned char>(255 * threshold);
                cv::threshold(segBufferForThreshMat, segBufferMat, thresholdValue, 255, cv::THRESH_BINARY);
            }else if(postProcessType == 1){ // softmax
                cv::Mat shiftMat, personShift, backgroundShift, expPersonShift, expBackgroundShift, sumMat, softmaxMatPerson;
                cv::Mat segBufferMat(tensorHeight, tensorWidth, CV_8UC1, segBuffer);   // segBufferMat is mapped to outputSegBuffer
                cv::max(channels[0], channels[1], shiftMat);
                cv::subtract(channels[0], shiftMat, backgroundShift);
                cv::subtract(channels[1], shiftMat, personShift);
                cv::exp(backgroundShift, expBackgroundShift);
                cv::exp(personShift, expPersonShift);
                cv::add(expBackgroundShift, expPersonShift, sumMat);
                cv::divide(expPersonShift, sumMat, softmaxMatPerson);
                
                softmaxMatPerson.convertTo(segBufferMat, CV_8U, 255, 0);
            }else if(postProcessType == 2){ // joint bilateral filter
                cv::Mat jbfMat;
                cv::Mat segBufferMat(tensorHeight, tensorWidth, CV_8UC1, segBuffer);   // segBufferMat is mapped to outputSegBuffer
                cv::ximgproc::jointBilateralFilter(channels[0], channels[1], jbfMat, d, sigmaColor, sigmaSpace);
                jbfMat.convertTo(segBufferMat, CV_8U, 255, 0);

            }else if(postProcessType == 3){ // softmax + joint bilateral filter
                cv::Mat shiftMat, personShift, backgroundShift, expPersonShift, expBackgroundShift, sumMat, softmaxMatPerson, softmaxMatBackground, jbfMat;
                cv::Mat segBufferMat(tensorHeight, tensorWidth, CV_8UC1, segBuffer);   // segBufferMat is mapped to outputSegBuffer
                cv::max(channels[0], channels[1], shiftMat);
                cv::subtract(channels[0], shiftMat, backgroundShift);
                cv::subtract(channels[1], shiftMat, personShift);
                cv::exp(backgroundShift, expBackgroundShift);
                cv::exp(personShift, expPersonShift);
                cv::add(expBackgroundShift, expPersonShift, sumMat);
                cv::divide(expPersonShift, sumMat, softmaxMatPerson);
                cv::divide(expBackgroundShift, sumMat, softmaxMatBackground);
                
                cv::ximgproc::jointBilateralFilter(softmaxMatBackground, softmaxMatPerson, jbfMat, d, sigmaColor, sigmaSpace);
                jbfMat.convertTo(segBufferMat, CV_8U, 255, 0);
            }else{
            }
        }else{                                                               // selfie model
            cv::Mat outputMat(tensorHeight, tensorWidth, CV_32FC1, output);
            if(postProcessType == 0) {
                cv::Mat segBufferForThreshMat(tensorHeight, tensorWidth, CV_8UC1);
                outputMat.convertTo(segBufferForThreshMat, CV_8U, 255, 0);
                cv::Mat segBufferMat(tensorHeight, tensorWidth, CV_8UC1, segBuffer);
                unsigned char thresholdValue = static_cast<unsigned char>(255 * threshold);
                cv::threshold(segBufferForThreshMat, segBufferMat, thresholdValue, 255, cv::THRESH_BINARY);
            }else{
                cv::Mat segBufferMat(tensorHeight, tensorWidth, CV_8UC1, segBuffer);
                outputMat.convertTo(segBufferMat, CV_8U, 255, 0);
            }
        }

        // (4) Resize segmantation 
        unsigned char *outputImageBuf = &outputImageBuffer[0];
        cv::Mat grayMat(tensorHeight, tensorWidth, CV_8UC1, outputSegBuffer);
        cv::Mat resizedGrayMat(height, width, CV_8UC1);
        cv::resize(grayMat, resizedGrayMat, resizedGrayMat.size(), 0, 0, cv_interpolation);
        cv::Mat mat255(height, width, CV_8UC1, 255);
        cv::Mat channels[] = {mat255, mat255, mat255, resizedGrayMat};
        cv::Mat outMat(height, width, CV_8UC4, outputImageBuf);
        cv::merge(channels, 4, outMat);
        return 0;

    }

    
    EMSCRIPTEN_KEEPALIVE
    int loadModel(int bufferSize)
    {
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] - TFLite Model Loader for meet segmentation            -\n");
        printf("[WASM] - Bug report:                                          -\n");
        printf("[WASM] -   https://github.com/w-okada/image-analyze-workers   -\n");
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] \n");
        printf("[WASM] Loading model of size: %d\n", bufferSize);

        // Load model
        std::unique_ptr<tflite::FlatBufferModel> model = tflite::FlatBufferModel::BuildFromBuffer(modelBuffer, bufferSize);
        CHECK_TFLITE_ERROR(model != nullptr);

        tflite::ops::builtin::BuiltinOpResolver resolver;
        resolver.AddCustom("Convolution2DTransposeBias", mediapipe::tflite_operations::RegisterConvolution2DTransposeBias());
        tflite::InterpreterBuilder builder(*model, resolver);
        builder(&interpreter);
        CHECK_TFLITE_ERROR(interpreter != nullptr);

        // Allocate tensor buffers.
        CHECK_TFLITE_ERROR(interpreter->AllocateTensors() == kTfLiteOk);
        return 0;
    }
}