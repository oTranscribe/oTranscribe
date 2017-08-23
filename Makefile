build_dev:
	$(MAKE) compile_static

	# empty manifest
	cp src/manifest-dev.appcache dist/manifest.appcache
	echo "# Updated $(shell date +%x_%H:%M:%S:%N)" >> dist/manifest.appcache

	# run webpack
	./node_modules/webpack/bin/webpack.js --watch -d

compile_static:
	# clear out existing dist folder
	rm -rf ./dist
	mkdir ./dist

	# compile l10n files
	for f in src/l10n/*.ini; do (cat "$${f}"; echo) >> dist/data.ini; done

	# copy over static assets
	cp -r src/img src/opensource.htm src/help.htm dist/
	cp ./node_modules/jakecache/dist/jakecache.js ./node_modules/jakecache/dist/jakecache-sw.js dist/
	mkdir dist/help
	mv dist/help.htm dist/help/index.html

build_prod:
	$(MAKE) compile_static

	# manifest
	cp -r src/manifest.appcache dist/
	echo "# Updated $(shell date +%x_%H:%M:%S:%N)" >> dist/manifest.appcache
	# server
	echo "$$(npm bin)/http-server" > dist/start_server.sh
	chmod u+x dist/start_server.sh

	# run webpack
	./node_modules/webpack/bin/webpack.js -p
