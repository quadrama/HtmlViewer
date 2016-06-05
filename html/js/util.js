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
function merge(o1, o2) {
	for (var k in o2) {
		if (typeof(o2[k]) == "object" && ! Array.isArray(o2[k])) {
			merge(o1[k], o2[k]);
		} else {
			if (typeof (o1) == "undefined")
				o1 = o2;
			else
				o1[k] = o2[k];
		}
	}
}
