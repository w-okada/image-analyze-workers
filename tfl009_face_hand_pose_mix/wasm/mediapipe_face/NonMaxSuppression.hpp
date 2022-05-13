#ifndef __MEDIAPIPE_FACE_NON_MAX_SUPPRESSION_HPP__
#define __MEDIAPIPE_FACE_NON_MAX_SUPPRESSION_HPP__

#include <list>
#include "../face.hpp"

int non_max_suppression(std::list<face_t> &face_list, std::list<face_t> &face_sel_list, float iou_thresh, int max_face_num);

#endif // __MEDIAPIPE_FACE_NON_MAX_SUPPRESSION_HPP__