build:
	coffee -c ./*/*.coffee

test:
	nodeunit ./test/*.js

.PHONY: test