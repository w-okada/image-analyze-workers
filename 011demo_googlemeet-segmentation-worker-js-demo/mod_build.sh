cd ../011_googlemeet-segmentation-worker-js; npm run build; cd -;\
 cp ../011_googlemeet-segmentation-worker-js/dist/* node_modules/\@dannadori/googlemeet-segmentation-worker-js/dist/; \
 cp node_modules/\@dannadori/googlemeet-segmentation-worker-js/dist/googlemeet-segmentation-worker-worker.js public/;


cp node_modules/\@dannadori/googlemeet-segmentation-worker-js/dist/googlemeet-segmentation-jbf.wasm public/;
cp node_modules/\@dannadori/googlemeet-segmentation-worker-js/dist/googlemeet-segmentation-jbf.wasm public/static/js/;