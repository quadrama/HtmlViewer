MINIFIER=minify
TARGET=js/index.js

%.min.js: %.js
	$(MINIFIER) $<

$(TARGET): js/util.js js/script.js js/drama.js
	cat $^ > $(TARGET)
