Array.prototype.unique = function() {
	var tmp = {}, out = [];
	for(var i = 0, n = this.length; i < n; ++i) {
		if(!tmp[this[i]]) { tmp[this[i]] = true; out.push(this[i]); }
	}
	return out;
};

function getQueryParams(qs) {
	qs = qs.split('+').join(' ');
	var params = {},
		tokens,
		re = /[?&]?([^=]+)=([^&]*)/g;
	while (tokens = re.exec(qs)) {
		params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
	}
	return params;
}
