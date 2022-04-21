#ifndef __TFLITE_HAND_POSE_H__
#define __TFLITE_HAND_POSE_H__

#ifdef __cplusplus
extern "C"
{
#endif

#define SYSTEM_MAX_FACE_NUM 20
#define HAND_JOINT_NUM 21

    typedef struct fvec2
    {
        float x, y;
    } fvec2;

    typedef struct fvec3
    {
        float x, y, z;
    } fvec3;

    typedef struct rect_t
    {
        fvec2 topleft;
        fvec2 btmright;
    } rect_t;

    typedef struct _face_t
    {
        float score;
        rect_t rect;
        fvec2 keys[6];
        float rotation;

        float face_cx;
        float face_cy;
        float face_w;
        float face_h;
        fvec2 face_pos[4];

        fvec3 landmark_keys[468];
        fvec2 landmark_lips[80];
        fvec2 landmark_left_eye[71];
        fvec2 landmark_right_eye[71];
        fvec2 landmark_left_iris[5];
        fvec2 landmark_right_iris[5];
        float landmark_score;
    } face_t;

    typedef struct _face_detection_result_t
    {
        int num;
        face_t faces[SYSTEM_MAX_FACE_NUM];
    } face_detection_result_t;

    // typedef struct _hand_landmark_result_t
    // {
    //     float score;
    //     fvec3 joint[HAND_JOINT_NUM];
    // } hand_landmark_result_t;

    // typedef struct _pose3d_config_t
    // {
    //     float score_thresh;
    //     float iou_thresh;
    // } pose3d_config_t;

    // int init_tflite_hand_landmark(int use_quantized_tflite);

    // void *get_palm_detection_input_buf(int *w, int *h);
    // int invoke_palm_detection(palm_detection_result_t *palm_result, int flag);

    // void *get_hand_landmark_input_buf(int *w, int *h);
    // int invoke_hand_landmark(hand_landmark_result_t *hand_landmark_result);

#ifdef __cplusplus
}
#endif

#endif /* __TFLITE_HAND_POSE_H__ */