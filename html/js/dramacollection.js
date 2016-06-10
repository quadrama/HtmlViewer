function DramaCollection(selector, userSettings) {
	"use strict";
	var defaultSettings = {
	};
	var extractors = [
		// meta data
		{ title: "Id", fun: function(d) { return d.meta.documentId; }, data: "id" },
		{ title: "DisplayId", fun: function(d) { return d.meta.DisplayId; }, data: "DisplayId" },
		{ title: "Title", fun: function(d) { return d.meta.documentTitle; }, data: "title" },
		{ title: "Author", fun: function(d) { return d.meta.authors[0].Name; }, data: "authorname" },
		// { title: "AuthorPnd", fun: function(d) { return d.meta.authors[0].Pnd; }, data: "authorpnd" },
		{ title: "Reference Year", fun: function(d) { return d.meta.ReferenceDate; }, data: "ReferenceYear" },
		// simple lengths
		{ title: "# Figures", fun: function(d) { return d.figures.length; }, data: "NumberOfFigures", type: "numeric" },
		{ title: "# Utterances", fun: function(d) { return d.utt.length; }, data: "NumberOfUtterances", type: "numeric" },
		{ title: "# Scenes", fun: function(d) { return d.scs.length; }, data: "NumberOfScenes", type: "numeric" },
		{ title: "# Acts", fun: function(d) { return d.acts.length; }, data: "NumberOfActs", type: "numeric" },
		// calculations
		{ title: "Avg. Utterance Length", fun:extractAverageUtteranceLength, data: "AverageUtteranceLength", type: "numeric" }
	];
	var ctable;
	var target;
	var data = [];
	var settings;

	init();
	var api = {
		add:addDrama,
		refresh:refresh,
		n:function() { return data.length; }
	};
	return api;

	function init() {
		target = $(selector);
		target.empty();

		settings = merge(defaultSettings, userSettings);
		console.log(settings);

		ctable = ChartTableView(selector, {
			columns: extractors,
			active:1,
			chart: {
				chart: {
					type: "line",
					xAxis: {
						type: "category"
					}
				},
				config: {
					categoryKey: "DisplayId",
					sortKey: "ReferenceYear"
				}
			}
		});
		// ctable.load([]);

	}

	function addDrama(dramaObject) {
		var row = {};
		for (var i = 0; i < extractors.length; i++) {
			var ex = extractors[i];
			row[ex.data] = ex.fun(dramaObject);
		}
		data.push(row);
		return api;
	}

	function refresh() {
		ctable.clear();
		data = data.sort(function (a,b) {
			return a.ReferenceYear - b.ReferenceYear;
		});
		ctable.load(data);
	}

	function extractAverageUtteranceLength(d) {
		return 0;
	}


}
