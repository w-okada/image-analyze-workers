#ifndef __MEDIAPIPE_PACK_PALM_RESULT_HPP__
#define __MEDIAPIPE_PACK_PALM_RESULT_HPP__

#include <list>
#include "../facemesh.hpp"

void pack_face_result(face_detection_result_t *face_result, std::list<face_t> &face_list, int max_face_num);

#endif //__MEDIAPIPE_PACK_PALM_RESULT_HPP__