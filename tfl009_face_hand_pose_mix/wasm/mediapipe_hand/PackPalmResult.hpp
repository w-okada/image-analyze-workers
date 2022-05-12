#ifndef __MEDIAPIPE_HAND_PACK_PALM_RESULT_HPP__
#define __MEDIAPIPE_HAND_PACK_PALM_RESULT_HPP__

#include <list>
#include "../hand.hpp"

void pack_palm_result(palm_detection_result_t *palm_result, std::list<palm_t> &palm_list, int max_palm_num);

#endif //__MEDIAPIPE_HAND_PACK_PALM_RESULT_HPP__