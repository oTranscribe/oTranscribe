build_dev:
	$(MAKE) compile_static
	npx webpack-dev-server --mode development --static dist/

compile_static:
	# clear out existing dist folder
	rm -rf ./dist
	mkdir ./dist

	# compile l10n files
	for f in src/l10n/*.ini; do (cat "$${f}"; echo) >> dist/data.ini; done
	
	# copy over static assets
	cp -r src/img src/opensource.htm src/help.htm src/privacy.htm dist/
	mkdir dist/help
	mv dist/help.htm dist/help/index.html	
	mkdir dist/privacy
	mv dist/privacy.htm dist/privacy/index.html

build_prod:
	$(MAKE) compile_static
	# run webpack
	npx webpack --mode production
