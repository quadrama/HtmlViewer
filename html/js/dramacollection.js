function DramaCollection(selector, userSettings) {
	"use strict";
	var defaultSettings = {
	};
	var extractors = [
		// meta data
		{ title: "Id", fun: function(d) { return d.meta.documentId; }, data: "id" },
		{ title: "Title", fun: function(d) { return d.meta.documentTitle; }, data: "title" },
		{ title: "Author", fun: function(d) { return d.meta.authors[0].Name; }, data: "authorname" },
		{ title: "AuthorPnd", fun: function(d) { return d.meta.authors[0].Pnd; }, data: "authorpnd" },
		{ title: "Reference Year", fun: function(d) { return d.meta.ReferenceDate; }, data: "ReferenceYear"},
		// simple lengths
		{ title: "# Figures", fun: function(d) { return d.figures.length; }, data: "NumberOfFigures" },
		{ title: "# Utterances", fun: function(d) { return d.utt.length; }, data: "NumberOfUtterances" },
		{ title: "# Scenes", fun: function(d) { return d.scs.length; }, data: "NumberOfScenes" },
		{ title: "# Acts", fun: function(d) { return d.acts.length; }, data: "NumberOfActs" },
		// calculations
		{ title: "Avg. Utterance Length", fun:extractAverageUtteranceLength, data: "AverageUtteranceLength" }
	];
	var ctable;
	var target;

	init();
	var api = {
		add:addDrama
	};
	return api;

	function init() {
		target = $(selector);
		target.empty();

		settings = Object.create(defaultSettings);
		merge(settings, userSettings);
		console.log(settings);

		ctable = ChartTableView(selector, {
			columns: extractors,
			active:1
		});
		ctable.load([]);

	}

	function load(ListOfDramas) {

	}

	function addDrama(dramaObject) {
		var row = {};
		for (var i = 0; i < extractors.length; i++) {
			var ex = extractors[i];
			row[ex.data] = ex.fun(dramaObject);


		}
		ctable.add(row);
		return api;
	}

	function extractAverageUtteranceLength(d) {
		return "n/a";
	}


}
