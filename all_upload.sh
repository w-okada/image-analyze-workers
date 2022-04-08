array=()
array+=("001demo_bodypix-worker-js-demo")
array+=("002demo_facemesh-worker-js-demo")
array+=("003demo_ascii-worker-js-demo")
array+=("004demo_opencv-worker-js-demo")
array+=("005demo_posenet-worker-js-demo")
array+=("006demo_handpose-worker-js-demo")
array+=("007demo_white-box-cartoonization-worker-js-demo")
array+=("008demo_bisenetv2-celebamask-worker-js-demo")
array+=("009demo_u2net-portrait-worker-js-demo")
array+=("010demo_modnet-worker-js-demo")
array+=("011demo_googlemeet-segmentation-worker-js-demo")
array+=("012demo_barcode-scanner-worker-js-demo")
array+=("013demo_super-resolution-worker-js-demo")


for i in "${array[@]}"
do
    echo "====================  START uploading..." ${i} "  ============================="
    sh upload.sh ${i}
    echo "====================  END uploading..." ${i} "  ============================="
done

