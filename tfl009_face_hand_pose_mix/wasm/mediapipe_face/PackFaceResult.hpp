#ifndef __MEDIAPIPE_FACE_PACK_FACE_RESULT_HPP__
#define __MEDIAPIPE_FACE_PACK_FACE_RESULT_HPP__

#include <list>
#include "../face.hpp"

void pack_face_result(face_detection_result_t *face_result, std::list<face_t> &face_list, int max_face_num);

#endif //__MEDIAPIPE_FACE_PACK_FACE_RESULT_HPP__