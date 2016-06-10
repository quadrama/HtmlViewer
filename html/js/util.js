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
