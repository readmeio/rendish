NODE_BIN ?= $(shell asdf which node || nvm which node || command -v node)
UNAME_S := $(shell uname -s)
JS_FILES := $(shell git ls-files '*.js')

# build the `rb` (render-bootleg) binary
#
# This seems to fail right now with an error about importing modules?
#
# https://nodejs.org/api/single-executable-applications.html
dist/rb: dist/rb.js
	node --experimental-sea-config sea-config.json
	cp $(NODE_BIN) dist/rb
ifeq ($(UNAME_S),Darwin)
	codesign --remove-signature dist/rb
	npx postject dist/rb NODE_SEA_BLOB dist/sea-prep.blob \
		--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
		--macho-segment-name NODE_SEA 
	codesign --sign - dist/rb
else
	npx postject dist/rb NODE_SEA_BLOB dist/sea-prep.blob \
		--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
endif

# Create a bundled version of the app, so that we can build an executable out
# of it. If you don't, node fails on trying to run an import; which is also
# what happens if you bundle it as esm instead of cjs
dist/rb.js: $(JS_FILES)
	npx esbuild \
		--format=cjs \
		--target=node20 \
		--platform=node \
		--bundle \
		--outfile=dist/rb.js \
		index.js

.PHONY: clean
clean:
	rm dist/*
