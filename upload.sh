cd $1
ncu -u
npm install
npm update
npm run build
sh sync.sh
cd -
