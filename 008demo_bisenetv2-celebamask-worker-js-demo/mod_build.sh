cd ../008_bisenetv2-celebamask-worker-js; npm run build; cd -;
cp ../008_bisenetv2-celebamask-worker-js/dist/* node_modules/\@dannadori/bisenetv2-celebamask-worker-js/dist/;
cp node_modules/\@dannadori/bisenetv2-celebamask-worker-js/dist/bisenetv2-celebamask-worker-worker.js public/;
