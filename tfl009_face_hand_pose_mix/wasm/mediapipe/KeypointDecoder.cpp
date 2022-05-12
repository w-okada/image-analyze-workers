
#include <cmath>
#include <string.h>
#include <stdio.h>

#include "KeypointDecoder.hpp"
#include "Anchor.hpp"
#include "../const.hpp"

int decode_keypoints(std::list<pose_t> &pose_list, float score_thresh, float *points_ptr, float *scores_ptr, std::vector<Anchor> *anchors)
{
    int img_w = 224;
    int img_h = 224;

    pose_t pose_item;

    int i = 0;
    for (auto itr = anchors->begin(); itr != anchors->end(); i++, itr++)
    {
        Anchor anchor = *itr;
        float score0 = *(scores_ptr + i);
        float score = 1.0f / (1.0f + exp(-score0));
        // printf("score %f ,  %f \n", score, score0);

        if (score > score_thresh)
        {
            float *p = points_ptr + (i * 12);

            /* boundary box */
            float sx = p[0];
            float sy = p[1];
            float w = p[2];
            float h = p[3];
            // printf("pos!!!!! %f %f %f %f, %d, %d\n", sx, sy, w, h, img_w, img_h);

            float cx = sx + anchor.x_center * img_w;
            float cy = sy + anchor.y_center * img_h;

            cx /= (float)img_w;
            cy /= (float)img_h;
            w /= (float)img_w;
            h /= (float)img_h;

            fvec2 topleft, btmright;
            topleft.x = cx - w * 0.5f;
            topleft.y = cy - h * 0.5f;
            btmright.x = cx + w * 0.5f;
            btmright.y = cy + h * 0.5f;

            pose_item.score = score;
            pose_item.rect.topleft = topleft;
            pose_item.rect.btmright = btmright;

            /* landmark positions (7 keys) */
            for (int j = 0; j < 4; j++)
            {
                float lx = p[4 + (2 * j) + 0];
                float ly = p[4 + (2 * j) + 1];
                lx += anchor.x_center * img_w;
                ly += anchor.y_center * img_h;
                lx /= (float)img_w;
                ly /= (float)img_h;

                pose_item.keys[j].x = lx;
                pose_item.keys[j].y = ly;
            }

            pose_list.push_back(pose_item);
        }
    }
    return 0;
}