NODE_BIN ?= $(shell asdf which node || nvm which node || command -v node)
UNAME_S := $(shell uname -s)
JS_FILES := $(shell git ls-files '*.js')

# build the `rb` (render-bootleg) binary
dist/rb: $(JS_FILES) dependencies
	bun build --compile index.js --outfile dist/rb --target=node

.PHONY: dependencies
dependencies:
	npm i

.PHONY: clean
clean:
	rm dist/*
