array=()
array+=("001_bodypix-worker-js")
array+=("002_facemesh-worker-js")
array+=("003_ascii-worker-js")
array+=("004_opencv-worker-js")
array+=("005_posenet-worker-js")
array+=("006_handpose-worker-js")
array+=("007_white-box-cartoonization-worker-js")
array+=("008_bisenetv2-celebamask-worker-js")
array+=("009_u2net-portrait-worker-js")
array+=("010_modnet-worker-js")
array+=("011_googlemeet-segmentation-worker-js")
array+=("012_barcode-scanner-worker-js")
array+=("013_super-resolution-worker-js")

for i in "${array[@]}"
do
    echo "====================  START publishing..." ${i} "  ============================="
    sh publish.sh ${i}
    echo "====================  END publishing..." ${i} "  ============================="
done

