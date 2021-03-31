cd ../005_posenet-worker-js; npm run build; cd -;
cp ../005_posenet-worker-js/dist/* node_modules/\@dannadori/posenet-worker-js/dist/; 
cp node_modules/\@dannadori/posenet-worker-js/dist/posenet-worker-worker.js public/;
