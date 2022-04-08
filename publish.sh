cd $1
ncu -u
npm install
npm version patch
npm run build
npm publish
cd -
