#ifndef __MEDIAPIPE_PACK_PALM_RESULT_HPP__
#define __MEDIAPIPE_PACK_PALM_RESULT_HPP__

#include <list>
#include "../handpose.hpp"

void pack_palm_result(palm_detection_result_t *palm_result, std::list<palm_t> &palm_list);

#endif //__MEDIAPIPE_PACK_PALM_RESULT_HPP__