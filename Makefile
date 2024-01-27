NODE_BIN ?= $(shell command -v node)
UNAME_S := $(shell uname -s)
JS_FILES := $(shell git ls-files '*.js')

# build the `rb` (render-bootleg) binary
#
# This seems to fail right now with an error about importing modules?
#
# https://nodejs.org/api/single-executable-applications.html
dist/rb: $(JS_FILES)
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

.PHONY: clean
clean:
	rm dist/*
