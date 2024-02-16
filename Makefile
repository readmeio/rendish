JS_FILES := $(shell git ls-files '*.js')

# build the rendish binary
dist/rb: $(JS_FILES) dependencies
	# currently doesn't work for login due to https://github.com/oven-sh/bun/issues/6832
	bun build --compile src/index.js --outfile dist/rendish --target=node

.PHONY: dependencies
dependencies:
	npm i

.PHONY: clean
clean:
	rm dist/*

.PHONY: publish
publish:
	npm publish .
