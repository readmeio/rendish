JS_FILES := $(shell git ls-files '*.js')

# build the rendish binary
dist/rb: $(JS_FILES) dependencies
	bun build --compile src/index.js --outfile dist/rendish --target=node

.PHONY: dependencies
dependencies:
	npm i

.PHONY: clean
clean:
	rm dist/*
