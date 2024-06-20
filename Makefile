build_dev:
	$(MAKE) compile_static

	# empty manifest
	cp src/manifest-dev.appcache dist/manifest.appcache
	echo "# Updated $(date +%x_%H:%M:%S:%N)" >> dist/manifest.appcache
	
	# run webpack
	./node_modules/webpack/bin/webpack.js --watch -d

compile_static:
	# clear out existing dist folder
	rm -rf ./dist
	mkdir ./dist

	# compile l10n files
	cp src/l10n/english.ini dist/data.ini
	find src/l10n/*.ini -path src/l10n/english.ini -prune -o -exec echo '' >> dist/data.ini \; -exec cat {} >> dist/data.ini \;
	
	# copy over static assets
	cp -r src/img src/opensource.htm src/help.htm src/privacy.htm dist/
	cp ./node_modules/jakecache/dist/jakecache.js ./node_modules/jakecache/dist/jakecache-sw.js dist/
	mkdir dist/help
	mv dist/help.htm dist/help/index.html	
	mkdir dist/privacy
	mv dist/privacy.htm dist/privacy/index.html

build_prod:
	$(MAKE) compile_static

	# manifest
	cp -r src/manifest.appcache dist/
	echo "# Updated $(date +%x_%H:%M:%S:%N)" >> dist/manifest.appcache
	
	# run webpack
	./node_modules/webpack/bin/webpack.js -p
