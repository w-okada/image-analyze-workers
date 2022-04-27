#ifndef __TFLITE_FACEMESH_H__
#define __TFLITE_FACEMESH_H__

#ifdef __cplusplus
extern "C"
{
#endif

#define SYSTEM_MAX_FACE_NUM 20

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

#ifdef __cplusplus
}
#endif

#endif /* __TFLITE_FACEMESH_H__ */