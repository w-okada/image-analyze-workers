
cd ../019_mediapipe-mix2-worker-js && npm run build && cd - 
rm -rf node_modules/@dannadori/mediapipe-mix2-worker-js/dist/*
cp -r ../019_mediapipe-mix2-worker-js/dist/* node_modules/@dannadori/mediapipe-mix2-worker-js/dist/
