#include <vector>
#include <cmath>
#include "Anchor.hpp"
#include "../const.hpp"

float HandCalculateScale(float min_scale, float max_scale, int stride_index, int num_strides)
{
    return min_scale + (max_scale - min_scale) * 1.0 * stride_index / (num_strides - 1.0f);
}

int HandGenerateAnchors(std::vector<Anchor> *anchors, const SsdAnchorsCalculatorOptions &options)
{
    int layer_id = 0;
    while (layer_id < (int)options.strides.size())
    {
        std::vector<float> anchor_height;
        std::vector<float> anchor_width;
        std::vector<float> aspect_ratios;
        std::vector<float> scales;

        // For same strides, we merge the anchors in the same order.
        int last_same_stride_layer = layer_id;
        while (last_same_stride_layer < (int)options.strides.size() &&
               options.strides[last_same_stride_layer] == options.strides[layer_id])
        {
            const float scale =
                HandCalculateScale(options.min_scale, options.max_scale,
                               last_same_stride_layer, options.strides.size());
            if (last_same_stride_layer == 0 && options.reduce_boxes_in_lowest_layer)
            {
                // For first layer, it can be specified to use predefined anchors.
                aspect_ratios.push_back(1.0);
                aspect_ratios.push_back(2.0);
                aspect_ratios.push_back(0.5);
                scales.push_back(0.1);
                scales.push_back(scale);
                scales.push_back(scale);
            }
            else
            {
                for (int aspect_ratio_id = 0;
                     aspect_ratio_id < (int)options.aspect_ratios.size();
                     ++aspect_ratio_id)
                {
                    aspect_ratios.push_back(options.aspect_ratios[aspect_ratio_id]);
                    scales.push_back(scale);
                }
                if (options.interpolated_scale_aspect_ratio > 0.0)
                {
                    const float scale_next =
                        last_same_stride_layer == (int)options.strides.size() - 1
                            ? 1.0f
                            : HandCalculateScale(options.min_scale, options.max_scale,
                                             last_same_stride_layer + 1,
                                             options.strides.size());
                    scales.push_back(std::sqrt(scale * scale_next));
                    aspect_ratios.push_back(options.interpolated_scale_aspect_ratio);
                }
            }
            last_same_stride_layer++;
        }

        for (int i = 0; i < (int)aspect_ratios.size(); ++i)
        {
            const float ratio_sqrts = std::sqrt(aspect_ratios[i]);
            anchor_height.push_back(scales[i] / ratio_sqrts);
            anchor_width.push_back(scales[i] * ratio_sqrts);
        }

        int feature_map_height = 0;
        int feature_map_width = 0;
        if (options.feature_map_height.size())
        {
            feature_map_height = options.feature_map_height[layer_id];
            feature_map_width = options.feature_map_width[layer_id];
        }
        else
        {
            const int stride = options.strides[layer_id];
            feature_map_height = std::ceil(1.0f * options.input_size_height / stride);
            feature_map_width = std::ceil(1.0f * options.input_size_width / stride);
        }

        for (int y = 0; y < feature_map_height; ++y)
        {
            for (int x = 0; x < feature_map_width; ++x)
            {
                for (int anchor_id = 0; anchor_id < (int)anchor_height.size(); ++anchor_id)
                {
                    // TODO: Support specifying anchor_offset_x, anchor_offset_y.
                    const float x_center = (x + options.anchor_offset_x) * 1.0f / feature_map_width;
                    const float y_center = (y + options.anchor_offset_y) * 1.0f / feature_map_height;

                    Anchor new_anchor;
                    new_anchor.x_center = x_center;
                    new_anchor.y_center = y_center;

                    if (options.fixed_anchor_size)
                    {
                        new_anchor.w = 1.0f;
                        new_anchor.h = 1.0f;
                    }
                    else
                    {
                        new_anchor.w = anchor_width[anchor_id];
                        new_anchor.h = anchor_height[anchor_id];
                    }
                    anchors->push_back(new_anchor);
                }
            }
        }
        layer_id = last_same_stride_layer;
    }
    return 0;
}

int generate_ssd_anchors(std::vector<Anchor> *anchors, int type)
{
    SsdAnchorsCalculatorOptions anchor_options;
    if (type == PALM_DETECTOR_192)
    {

        anchor_options.num_layers = 4;
        anchor_options.min_scale = 0.1484375;
        anchor_options.max_scale = 0.75;
        anchor_options.input_size_height = 192;
        anchor_options.input_size_width = 192;
        anchor_options.anchor_offset_x = 0.5f;
        anchor_options.anchor_offset_y = 0.5f;
        anchor_options.strides.push_back(8);
        anchor_options.strides.push_back(16);
        anchor_options.strides.push_back(16);
        anchor_options.strides.push_back(16);
        anchor_options.aspect_ratios.push_back(1.0);
        anchor_options.fixed_anchor_size = true;

        anchor_options.reduce_boxes_in_lowest_layer = false;
        anchor_options.interpolated_scale_aspect_ratio = 1.0;
    }
    else
    {
        anchor_options.num_layers = 5;
        anchor_options.min_scale = 0.1171875;
        anchor_options.max_scale = 0.75;
        anchor_options.input_size_height = 256;
        anchor_options.input_size_width = 256;
        anchor_options.anchor_offset_x = 0.5f;
        anchor_options.anchor_offset_y = 0.5f;
        //  anchor_options.feature_map_width .push_back(0);
        //  anchor_options.feature_map_height.push_back(0);
        anchor_options.strides.push_back(8);
        anchor_options.strides.push_back(16);
        anchor_options.strides.push_back(32);
        anchor_options.strides.push_back(32);
        anchor_options.strides.push_back(32);
        anchor_options.aspect_ratios.push_back(1.0);
        anchor_options.reduce_boxes_in_lowest_layer = false;
        anchor_options.interpolated_scale_aspect_ratio = 1.0;
        anchor_options.fixed_anchor_size = true;
    }

    HandGenerateAnchors(anchors, anchor_options);
    return 0;
}
