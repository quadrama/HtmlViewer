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

function deepcopy(o) {
	var r;
	if (Array.isArray(o)) {
		r = [];
		for (var i = 0; i < o.length; i++) {
			r[i] = deepcopy(o[i]);
		}
	} else if (o === null) {
		r = null;
	} else if (typeof(o) === "object") {
		r = {};
		for (var k in o) {
			r[k] = deepcopy(o[k]);
		}
	} else {
		return o;
	}
	return r;
}

function merge(o1, o2) {
	if (typeof(o2) === "undefined")
		return deepcopy(o1);
	else if (Array.isArray(o2)) {
		return deepcopy(o2);
	} else if (typeof(o2) === "object") {
		var r;
		if (typeof(o1) !== "object") {
			r = {};
		} else {
			r = deepcopy(o1);
		}
		for (var k in o2) {
			r[k] = merge(r[k], o2[k]);
		}
		return r;
	} else {
		return o2;
	}
}

function basicFigureFilter(data) {
	return function(f) {
		var figure = f;
		if (typeof(f) == "number") {
			figure = data.figures[f];
		} else if (f.hasOwnProperty("figureIndex")) {
			figure = data.figures[f.figureIndex];
			// console.log(figure);
		}
		return figure.NumberOfWords > 0;
	};
}

function figureFilter(o, data) {
	return function(f) {
		var figure = f;
		if (typeof(f) == "number") {
			figure = data.figures[f];
		} else if (f.hasOwnProperty("figureIndex")) {
			figure = data.figures[f.figureIndex];
			// console.log(figure);
		}
		for (var p in o) {
			if (figure[p] < o[p])
				return false;
		}
		return true;
	};
}

function sortAnnotations(a,b) {
	return parseInt(a.begin) - parseInt(b.begin);
}

function containedIn(b) {
	return function(a) {
		return parseInt(a.begin) >= parseInt(b.begin) && parseInt(a.end) <= parseInt(b.end);
	};
}

function getFigureTypes(data, figure) {
	var types = [];
	var figureIndex = data.figures.indexOf(figure);
	for (var ftype in data.ftypes) {
		for (var fvalue in data.ftypes[ftype]) {
			if (data.ftypes[ftype][fvalue].includes(figureIndex)) {
				types.push({
					ftype: ftype,
					fvalue: fvalue
				});
			}
		}
	}

	return types;
}

function getFigureTypeValue(data, figureIndex, ftype) {
	for (var fvalue in data.ftypes[ftype]) {
		if (data.ftypes[ftype][fvalue].includes(figureIndex))
			return fvalue;
	}
	return "";
}
