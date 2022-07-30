
cd ../019_mediapipe-mix-worker-js-no-bundle-worker && npm run build && cd - 
rm -rf node_modules/@dannadori/mediapipe-mix-worker-js-no-bundle-worker/dist/*
cp -r ../019_mediapipe-mix-worker-js-no-bundle-worker/dist/* node_modules/@dannadori/mediapipe-mix-worker-js-no-bundle-worker/dist/
