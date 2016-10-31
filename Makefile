build:
	
	# clear out existing dist folder
	rm -rf ./dist
	mkdir ./dist

	# compile l10n files
	paste -sd'\n' src/l10n/*.ini > dist/data.ini
	
	# copy over static assets
	cp -r src/img src/manifest.appcache src/opensource.htm src/help.htm dist/
	mkdir dist/help
	mv dist/help.htm dist/help/index.html
	
	# timestamp manifest
	echo "# Updated $(shell date +%x_%H:%M:%S:%N)" >> dist/manifest.appcache
	
	# run webpack
	./node_modules/webpack/bin/webpack.js --watch -p