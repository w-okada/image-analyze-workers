#ifndef __MEDIAPIPE_FACE_ANCHOR_HPP__
#define __MEDIAPIPE_FACE_ANCHOR_HPP__

#include <vector>

typedef struct Anchor
{
    float x_center, y_center, w, h;
} Anchor;

typedef struct SsdAnchorsCalculatorOptions
{
    int input_size_width;
    int input_size_height;
    float min_scale;
    float max_scale;
    float anchor_offset_x;
    float anchor_offset_y;

    int num_layers;
    std::vector<int> feature_map_width;
    std::vector<int> feature_map_height;

    std::vector<int> strides;
    std::vector<float> aspect_ratios;
    bool reduce_boxes_in_lowest_layer;
    float interpolated_scale_aspect_ratio;
    bool fixed_anchor_size;

} SsdAnchorsCalculatorOptions;

int face_generate_ssd_anchors(std::vector<Anchor> *anchors, int type);

#endif //__MEDIAPIPE_FACE_ANCHOR_HPP__