function Drama(selector, userSettings) {
	"use strict";
	var defaultSettings = {
		NetworkView: {
			/**
			 * Duration (in milliseconds) of all animations in the network
			 */
			animationDuration: 500,
			idString:"copresence",
			title:"Copresence Network"
		},
		PresenceView: {
			sortKey: "NumberOfWords",
			idString: "presence",
			title: "Figure Presence Chart"
		},
		PresenceView2: {
			sortKey: "NumberOfWords",
			idString: "presence2",
			title: "Figure Presence Chart 2"
		},
		FigureStatisticsView: {
			idString: "figure-statistics",
			title: "Figure Statistics",
			columns: [
				{ title: "Figure", data:"Reference" },
				{ title: "Words", data:"NumberOfWords", type: "numeric" },
				{ title: "Utterances", data:"NumberOfUtterances", type: "numeric" },
				{ title: "Mean Utt. Length", data: "UtteranceLengthArithmeticMean", type: "numeric" },
				{ title: "Std. Dev. Utt. Length", data: "UtteranceLengthStandardDeviation", type: "numeric" }
			 ]
		},
		SemanticFieldsView: {
			boostFactor: 1000,
			normalizationKey: "NumberOfWords",
			idString: "fields",
			title: "Figures and Semantic Fields"
		},
		TextView: {
			idString: "text",
			title: "Text"
		},
		wordThreshold: 1000
	};
	var strongcolors = ["#AAF", "#FAA", "#AFA", "#55F", "#F55", "#5F5" ];
	var darkcolors = ["#000", "#A00", "#0A0", "#00A", "#AA0", "#0AA", "#A0A", "#550", "#055", "#505"];
	var target;
	var data;
	var titleString;
	var views = [];
	var dimensions;
	var settings;
	init();

	var api = {
		title:function() {return titleString;},
		addNetworkView:function () {
			return addView(NetworkView);
		},
		addTextView:function() {
			return addView(TextView);
		},
		addPresenceView:function() {
			return addView(PresenceView);
		},
		addPresenceView2:function() {
			return addView(PresenceView2);
		},
		addFigureStatisticsView:function() {
			return addView(FigureStatisticsView2);
		},
		addSemanticFieldsView:function() {
			return addView(SemanticFieldsView2);
		},
		addAll:function() {
			var r = api.addTextView()
				.addPresenceView()
				.addPresenceView2()
				.addFigureStatisticsView()
				.addSemanticFieldsView()
				.addNetworkView();
			$(selector).tabs({active: 0});
			return r;
		},
		load:load
	};
	return api;

	function loadObject(dataObject) {
		data = dataObject;
		titleString = data.meta.ReferenceDate +
			" " + data.meta.authors[0].Name +
			": " + data.meta.documentTitle +
			("translators" in data.meta ? " (transl.: " + data.meta.translators[0].Name+")" : "");
		for (var view of views) {
			view.clear();
			view.load();
		}
		return api;
	}

	function load(dataOrUrl, callback) {
		if (typeof(dataOrUrl) == "string") {
			$.getJSON(dataOrUrl, function(data) {
				loadObject(data);
				if (callback) callback();
			});
		} else {
			return loadObject(dataOrUrl);
		}
	}

	function init() {
		target = $(selector);
		target.empty();
		target.css("width", "95%");
		target.append("<ul></ul>");
		$(selector).tabs({
			activate:tabschange
		});
		dimensions = {
			w: $(target).innerWidth() - 45, // we have to subtract padding
			h: $(target).innerHeight()
		};
		settings = merge(defaultSettings, userSettings);
		console.log(settings);
	}

	function addTab(o) {
		$(selector).children("ul").append("<li><a href=\"#"+o.idString+"\">"+o.title+"</a></li>");
		var div = $("<div id=\""+o.idString+"\" class=\"view\"></div>");
		div.appendTo($(selector));
		return div;
	}

	function addView(view) {
		views.push(view(target));
		$(selector).tabs("refresh");
		$(selector).tabs({active:views.length-1});
		return api;
	}

	function tabschange(event, ui) {
		var newId = $(ui.newPanel).attr("id");
		for (var view of views) {
			if (view.meta && view.meta().settings.idString === newId && view.update) {
				view.update();
				console.log($(ui.newPanel).innerWidth());
			}
		}

	}

	function TextView(targetJQ) {
		var contentArea = addTab(settings.TextView);
		var tocArea;
		var dpArea;
		var textArea;
		var colorIndex = 0;
		init();

		return {
			load:load,
			clear:clear,
			update:update,
			meta:function() {
				return { settings: settings.TextView };
			}
		};

		function init() {


			// create header structure
			var textHeader = document.createElement("div");
			$(textHeader).append("<a name=\"toc\" />");
			$(textHeader).addClass("toccontainer");
			$(textHeader).append("<p>Table of Contents</p>");
			$(textHeader).append("<ul class=\"toc\"></ul>");
			$(textHeader).append("<p>Dramatis Personae</p>");
			$(textHeader).append("<ul class=\"dramatispersonae\"></ul>");

			tocArea = $(textHeader).children("ul.toc");
			dpArea = $(textHeader).children("ul.dramatispersonae");
			$("#text").append(textHeader);


			textArea = $(document.createElement("div"));
			textArea.appendTo("#text");
			$(".toccontainer").accordion({
				header:"p",
				heightStyle:"content",
				collapsible:true,
				active:false
			});

		}

		function clear() {
			tocArea.empty();
			dpArea.empty();
			textArea.empty();
		}

		function load() {
			var figure;

			// add figures to header
			for (var fIndex = 0; fIndex < data.figures.length; fIndex++) {
				figure = data.figures[fIndex];
				var figureLi = document.createElement("li");
				$(figureLi).addClass("f"+fIndex);
				$(figureLi).append("<input type=\"checkbox\" value=\"f"+fIndex+"\"/>");
				$(figureLi).append(figure.Reference);
				$("ul.dramatispersonae").append(figureLi);
			}

			// make figure entries interactive
			$("ul.dramatispersonae input[type='checkbox']").change(function(event) {
				var val = $(event.target).val();
				if ($(event.target).is(":checked"))
					$("."+val).css("background-color",strongcolors[(colorIndex++)%strongcolors.length]);
				else
					$("."+val).css("background-color","");
			});

			// add segmentation to header and text into the pane
			var actIndex = 1;
			var segment = document.createElement("div");
			for (var act of data.acts.sort(sortAnnotations)) {
				segment = document.createElement("div");
				var anchor = "act"+actIndex;
				var actToc = document.createElement("ul");
				if ("head" in act) {
					$("ul.toc").append("<li><a href=\"#"+anchor+"\">"+act.head+"</a></li>");
					$(segment).append("<div class=\"actheading\"><a name=\""+anchor+"\">"+act.head+"</a> (<a href=\"#toc\">top</a>)</div>");
				} else {
					$("ul.toc").append("<li><a href=\"#"+anchor+"\">"+actIndex+". Act</a></li>");
					$(segment).append("<div class=\"actheading\"><a name=\""+anchor+"\">"+(actIndex)+". Act</a> (<a href=\"#toc\">top</a>)</div>");
				}

				var sceneIndex = 1;
				var scenes = data.scs.filter(containedIn(act)).sort(sortAnnotations);
				for (var scene of scenes) {
					var sceneElement = document.createElement("div");
					anchor = "act"+actIndex+"_scene"+sceneIndex;
					if ("head" in scene) {
						$(actToc).append("<li><a href=\"#"+anchor+"\">"+scene.head+"</a></li>");
						$(sceneElement).append("<div class=\"sceneheading\"><a name=\""+anchor+"\">"+scene.head+"</a> (<a href=\"#toc\">top</a>)</div>");
						sceneIndex++;
					} else {
						$(actToc).append("<li><a href=\"#"+anchor+"\">"+sceneIndex+". Scene</a></li>");
						$(sceneElement).append("<div class=\"sceneheading\"><a name=\""+anchor+"\">"+(sceneIndex++)+". Scene</a> (<a href=\"#toc\">top</a>)</div>");
					}
					for (var u of data.utt.filter(containedIn(scene))) {
						figure = data.figures[u.f];
						var utteranceElement = document.createElement("div");
						$(utteranceElement).addClass("utterance");
						$(utteranceElement).attr("data-begin", u.begin);
						$(utteranceElement).attr("data-end", u.end);
						$(utteranceElement).append("<div class=\"speaker f"+u.f+"\">"+figure.Reference+"</div>");
						if ("s" in u)
						for (var s of u.s) {
							$(utteranceElement).append("<div class=\"speech\">"+s.txt+"</div>");
						}
						$(sceneElement).append(utteranceElement);
					}
					$(segment).append(sceneElement);
					$("#text ul.toc").append(actToc);
				}
				textArea.append(segment);
				actIndex++;
			}
		}

		function update() {}
	}

	function PresenceView(targetJQ) {
		var contentArea = addTab(settings.PresenceView);
		var pbColors = ["#FFF", "#DDF"];
		var chart;

		var api = {
			clear:clear,
			load:load,
			update:update,
			meta:function() {
				return {settings: settings.PresenceView};
			}
		};

		return api;

		function clear() {
			contentArea.empty();
			return api;
		}
		function update() {
			if (chart) chart.reflow();
		}

		function load() {
			// create plot bands
			var segments;
			if ("scs" in data) {
				segments = data.scs;
			} else /* if ("seg1" in data["segments"]) */{
			segments = data.acts;
			}
			var end = 0;
			var pb = segments.sort(sortAnnotations).map(function(cur, i) {
				if (parseInt(cur.end) > end) end = parseInt(cur.end);
				return {
					from : parseInt(cur.begin),
					to : parseInt(cur.end),
					color : pbColors[i % pbColors.length],
					label : {
						text : cur.head,
						rotation : 270,
						align : "center",
						verticalAlign : "bottom",
						y : 30
					}
				};
			});

			// create an array of the figure index numbers (index in the original array)
			var figures = data.figures.map(function(cur,ind) {return ind;});

			// create an array for the figure names (which will be categories later
			// along the y axis)
			var figureNames = [];

			// create the series array
			var series = figures.filter(basicFigureFilter(data)).sort(function(a,b) {
				return data.figures[a][settings.PresenceView.sortKey] - data.figures[b][settings.PresenceView.sortKey];
			}).map(function(currentFigureIndex, index, arr) {
				var currentFigure = data.figures[currentFigureIndex];
				figureNames.push(currentFigure.Reference);
				var utterances = [];
				if ("utt" in currentFigure)
					for (var i = 0; i < currentFigure.utt.length; i++) {
						var uttObj = data.utt[currentFigure.utt[i]];
						if (typeof(uttObj) == "undefined")
							continue;
						if ("s" in uttObj)
							for (var sp of uttObj.s) {
								utterances.push({
									x:sp.begin,
									y:index,
									name:sp.txt
								});
								utterances.push({
									x:sp.end,
									y:index,
									name:sp.txt
								});
							}
							utterances.push(null);
					}
				var r = {
					name:currentFigure.Reference,
					data:utterances,
					lineWidth:3,
					visible:(currentFigure.NumberOfWords>settings.wordThreshold),
					turboThreshold:0
				};
				return r;
			});
			// initiate highcharts vis
			chart = contentArea.highcharts({
				legend: { y:130 },
				title: null,
				chart: {
					type: 'line',
					zoomType: 'xy',
					spacingBottom: 160
				},
				xAxis: {
					plotBands: pb,
					min: 0, max: end+1,
					labels: { enabled: false }
				},
				yAxis: {
					labels: { enabled:true },
					title:null,
					categories:figureNames
				},
				colors: darkcolors,
				plotOptions: { series: { lineWidth : 1 } },
				tooltip: {
					crosshairs : true,
					headerFormat : "",
					useHTML : true,
					pointFormat : "<div style=\"width:200px;max-width:300px; white-space:normal\"><span style=\"color:{point.color};font-weight:bold;\">{series.name}</span>: {point.name}</div>"
				},
				series: series
			}).highcharts();
		}
		return api;
	}

	function PresenceView2(targetJQ) {
		var contentArea;
		var chartArea;
		var chart;

		var api = {
			clear:clear,
			load:load,
			update:update,
			meta:function() {
				return {settings: settings.PresenceView2};
			}
		};

		init();

		return api;
		function update() {
			if (chart) chart.reflow();
		}

		function clear() {
			chartArea.empty();
			return api;
		}

		function init() {
			contentArea = addTab(settings.PresenceView2);

			// toolbar
			var toolbar = $(document.createElement("div"));
			toolbar.addClass("toolbar");
			$(contentArea).append(toolbar);
			toolbar.append("<div><input type=\"radio\" value=\"scene\" name=\"by\" id=\"button_presence2_by_scene\" /><label for=\"button_presence2_by_scene\">By scene</label><input type=\"radio\" value=\"act\" name=\"by\"  id=\"button_presence2_by_act\" checked=\"checked\" /><label for=\"button_presence2_by_act\">By act</label></div>");
			toolbar.children("div").buttonset();
			toolbar.find("input[value='scene']").button({
				label: "By scene"
			}).click(function (e) {
				clear();
				load();
			});
			toolbar.find("input[value='act']").button({
				label: "By act"
			}).click(function (e) {
				clear();
				load();
			});


			// chart
			chartArea = $(document.createElement("div"));
			$(contentArea).append(chartArea);
		}

		function load() {
			var segments;
			var byval = $(contentArea).find(".toolbar input[name='by']:checked").val();
			if ("scs" in data && byval == "scene") {
				segments = data.scs;
			} else /* if ("seg1" in data["segments"]) */{
				segments = data.acts;
			}

			// create an array of the figure index numbers (index in the original array)
			var figures = data.figures.map(function(cur,ind) {return ind;}).sort(function (a,b) {
				return data.figures[b].NumberOfWords - data.figures[a].NumberOfWords;
			});

			// create an array for the figure names (which will be categories later
			// along the y axis)
			var figureNames = [];

			var seriesMap = {};
			var simpleSeriesMap = {};
			for (var fIndex of figures) {
				seriesMap[fIndex.toString()] = [];
				simpleSeriesMap[fIndex.toString()] = [];
			}
			for (var segment of segments) {
				var total = segment.end - segment.begin;
				var segmentUtterances = {};
				var utterances = data.utt.filter(containedIn(segment));
				for (var utterance of utterances) {
					if (!segmentUtterances.hasOwnProperty(utterance.f.toString()))
						segmentUtterances[utterance.f.toString()] = 0;
					segmentUtterances[utterance.f.toString()] += (utterance.end - utterance.begin);
				}
				var start = 0;
				for (var figIndex of figures) {
					if (segmentUtterances.hasOwnProperty(figIndex.toString())) {
						simpleSeriesMap[figIndex.toString()].push(segmentUtterances[figIndex.toString()]);
						seriesMap[figIndex.toString()].push({
							low: start,
							high: ( segmentUtterances[figIndex.toString()] / total )+ start
						});
						start += ( segmentUtterances[figIndex.toString()] / total );
					} else {
						simpleSeriesMap[figIndex.toString()].push(0);
						seriesMap[figIndex.toString()].push({low:start, high:start});
					}
				}
			}
			// console.log(simpleSeriesMap);


			// create the series array
			var series = figures.map(function(figure) {
				return {
					pointPlacement: "on",
					name: data.figures[figure].Reference,
					data: simpleSeriesMap[figure.toString()],
					visible: figureFilter({NumberOfWords: 1000, NumberOfUtterances: 10}, data)(figure)
				};
			});
			// initiate highcharts vis
			chart = chartArea.highcharts({
				title: null,
				chart: {
					type: 'area',
				},
				xAxis: {
					labels: {
						enabled: true,
					},
					categories: segments.map(function (cur) {
						return cur.head;
					})
				},
				yAxis: {
					min: 0, max:100,
					labels: { enabled:true },
					title:null
				},
				colors: darkcolors,
				plotOptions: { area: { stacking: "percent", marker: { enabled: false }, lineWidth:0 } },
				tooltip: {
					shared: true,
					crosshairs : true,
					headerFormat : "",
					useHTML : true,
					pointFormat : "<div style=\"width:200px;max-width:300px; white-space:normal\"><span style=\"color:{point.color};font-weight:bold;\">{series.name}</span>: {point.y}</div>"
				},
				series: series
			}).highcharts();
			return api;
		}
	}

	function SemanticFieldsView2() {
		var contentArea = addTab(settings.SemanticFieldsView);
		var ctable;
		init();

		var api = {
			load:load,
			clear:clear,
			update:update,
			meta:function() {
				return {settings: settings.SemanticFieldsView};
			}
		};
		return api;

		function update() {
			ctable.update();
		}

		function init() {
			ctable = ChartTableView(contentArea, {
				columns: [ {
					title: "Figure", data: "Reference"
				} ].concat(Object.keys(data.fields).sort().map(function(cur) {
					return { title:cur, width:"10%", data:cur, type:"numeric" };
				})),
				chart: {
					chart: {
						width: contentArea.innerWidth(),
						polar: true,
						type: 'line'
					},
					colors: darkcolors,
					yAxis: { gridLineInterpolation: 'polygon' },
					xAxis: { lineWidth: 0 },
					config: {
						hide: function(d) { return d.NumberOfWords < 1000; },
						type: "rowwise",
						pointPlacement: "on"
					}
				}
			});
		}

		function load() {
			var mydata = data.figures.filter(function(f) {
				return f.NumberOfWords > 0;
			}).map(function(cur) {
				var ret = Object.create(cur);
				var sum = {};
				for (var field of Object.keys(data.fields).sort()) {
					sum[field] = 0;
				}
				if ("utt" in cur) {
					for (var i = 0; i < cur.utt.length; i++) {
						var currentUtterance = data.utt[cur.utt[i]];
						if ("s" in currentUtterance) {
							for (var speech of currentUtterance.s) {
								if ("fields" in speech) {
									for (var fname of speech.fields) {
										sum[fname]++;
									}
								}
							}
						}
					}
				}
				for (field of Object.keys(data.fields).sort()) {
					ret[field] = settings.SemanticFieldsView.boostFactor *
						(sum[field] / data.fields[field].Length) /
						cur[settings.SemanticFieldsView.normalizationKey];
				}
				return ret;
			});
			ctable.load(mydata);
		}

		function clear() { ctable.clear(); }
	}

	function FigureStatisticsView2() {
		var contentArea = addTab(settings.FigureStatisticsView);
		var ctable;
		init();

		var api = {
			load:load,
			clear:clear,
			update:update,
			meta:function() {
				return {settings: settings.FigureStatisticsView};
			}
		};
		return api;

		function update() {
			ctable.update();
		}

		function init() {
			contentArea.css("width", "90%");
			ctable = ChartTableView(contentArea, {
				columns: settings.FigureStatisticsView.columns,
				chart: {
					chart: {
						width: contentArea.innerWidth(),
					},
					config: {
						hide: function(d) {
							return d.NumberOfWords < 1000;
						},
						type: "rowwise"
					}
				}
			});
		}

		function load() { ctable.load(data.figures); }
		function clear() { ctable.clear(); }
	}

	function NetworkView(targetJQ) {
		var contentArea = addTab(settings.NetworkView);
		var baseGraph = {};
		var currentGraph = {};
		var svg;
		var force;
		var width, height;
		var selectedColor = "#DD5";
		init();

		return {
			d3: {
				force: force,
				svg: svg
			},
			graph: {
				current: currentGraph,
				base: baseGraph
			},
			redraw:draw,
			load:load,
			clear:clear,
			meta:function() {
				return {settings: settings.NetworkView};
			}
		};

		function init() {
			var targetDiv = contentArea;


			// toolbar
			var settingsPane = document.createElement("div");
			$(settingsPane).addClass("toolbar");

			var limit = $(document.createElement("fieldset"));
			limit.append("<input type=\"checkbox\" class=\"limit-enable\" checked=\"checked\" id=\"limit-enable\">");
			limit.append("Show figures with at least<br/>");
			limit.append("<input type=\"number\" class=\"limit-words\" value=\"1000\">");
			limit.append("words and ");
			limit.append("<input type=\"number\" class=\"limit-utterances\" value=\"10\">");
			limit.append("utterances.");

			var fieldSet = $(document.createElement("fieldset"));
			fieldSet.addClass("typecolor");
			fieldSet.append("Node coloring");

			var typeCategories = $(document.createElement("div"));
			var i = 0;
			for (var ftype in data.ftypes) {
				if (ftype != "All") {
					typeCategories.append("<input type=\"checkbox\" name=\"figureColor\" value=\""+ftype+"\" id=\"color-by-"+ftype+"\">");
					typeCategories.append("<label for=\"color-by-"+ftype+"\">"+ftype+"</label>");
				}
			}
			typeCategories.children("input:checkbox").button({}).click(function() {
				console.log(typeCategories.children("input:checkbox").not(this));
				typeCategories.children("input:checkbox").not(this).prop("checked", false);
				typeCategories.children("input:checkbox").button("refresh");
				updateSettings();
			});
			typeCategories.buttonset();
			typeCategories.appendTo(fieldSet);

			$(settingsPane).append(limit);
			$(settingsPane).append(fieldSet);



			contentArea.append(settingsPane);

			var legendDiv = $(document.createElement("div"));
				legendDiv.addClass("legend");
				legendDiv.append("<h1>Legend</h1>");
				legendDiv.append("<p>Two figures are connected, if they are present on stage within a scene.");
				legendDiv.append("<p><strong>Node size</strong>: #words (overall)</p>");
				legendDiv.append("<p><strong>Line width</strong>: #scenes in which the fig. are co-present</p>");
				legendDiv.append("<p>Figures are closer together if they are co-present in more scenes.</p>");
				legendDiv.draggable();
				legendDiv.css("position", "absolute");
				contentArea.append(legendDiv);
				svg = d3.select("div#"+settings.NetworkView.idString).append("svg");


			width = contentArea.innerWidth();
			height = contentArea.innerHeight();
			$(settingsPane).children("fieldset:first").children("input").change(updateSettings);
		}

		function load() {
			clear();
			baseGraph = getGraphData();
			force = initForce([width, height], baseGraph);
			updateSettings();
		}

		function updateSettings() {
			var cssId = "#"+settings.NetworkView.idString;
			force.stop();

			var figureFilterFunction;
			if ($(cssId+" .limit-enable:checked()").length === 0)
				figureFilterFunction = function(a) { return true; };
			else {
				var limitWords = parseInt($(cssId + " .limit-words").val());
				var limitUtterances = parseInt($(cssId+" .limit-utterances").val());

				figureFilterFunction = figureFilter({
					"NumberOfUtterances":limitUtterances,
					"NumberOfWords":limitWords
				}, data);
			}
			var selectedType = "x";
			var typeValues = [""];
			selectedType = $(cssId+" input[name='figureColor']:checked").val();
			if (typeof data.ftypes[selectedType] != "undefined")
				typeValues = typeValues.concat(Object.keys(data.ftypes[selectedType]));

			var nodes = baseGraph.nodes.filter(figureFilterFunction);
			var links = baseGraph.edges.filter(function (a) { return figureFilterFunction(a.source) && figureFilterFunction(a.target); });
			for (var node of nodes) {
				node.type = getFigureTypeValue(data, node.figureIndex, selectedType);
			}
			currentGraph = {
				nodes:nodes,
				edges:links,
				categories:typeValues
			};
			draw();

			force.nodes(currentGraph.nodes).links(currentGraph.edges)
				.start();
		}

		function clear() {
			svg.selectAll(".link").remove();
			svg.selectAll(".node").remove();
		}

		function dblclick(d) {
			d3.select(d).classed("fixed", true);
			force.stop();
		}

		function selectNode(d) {
			var thisNode = d3.select(d);
			var thisFigure = thisNode.datum();
			var otherNodes = svg.selectAll("g.node")
				.filter(function (d) {
					return true;
			});
			var relatedLinks = svg.selectAll(".link")
				.filter(function (d) {
					if (typeof(d) == "undefined")
						return false;
					return d.source === thisFigure ||
						d.target === thisFigure;
			});
			if (thisNode.classed("selected")) {
				thisNode.transition()
					.duration(settings.NetworkView.animationDuration)
					.style({"stroke-width":"0px"});
				relatedLinks.transition()
					.duration(settings.NetworkView.animationDuration)
					.style("stroke", "#AAA");
				thisNode.classed("selected", false);
				relatedLinks.classed("selected", false);
			} else {
				var selectedNodes = d3.select("g.node.selected");
				var selectedLinks = d3.selectAll(".link.selected");

				// remove old style
				selectedLinks.transition()
					.duration(settings.NetworkView.animationDuration)
					.style("stroke", "#AAA");
				selectedNodes.transition()
					.duration(settings.NetworkView.animationDuration)
					.style({"stroke-width":"0px"});
				selectedLinks.classed("selected", false);
				selectedNodes.classed("selected", false);

				// add new style
				relatedLinks.transition()
					.duration(settings.NetworkView.animationDuration)
					.style("stroke", selectedColor);
				thisNode.transition()
					.duration(settings.NetworkView.animationDuration)
					.style({"stroke": selectedColor, "stroke-width": "5px"});
				thisNode.classed("selected", true);
				relatedLinks.classed("selected", true);
			}
		}

		function dragstart(d) {
			d3.select(d).classed("fixed", true);
		}

		function draw() {
			var graph = currentGraph;

			var key = function (d) {
				return d.figureIndex;
			};

			var rscale = d3.scale.linear()
				.domain([0, d3.max(graph.nodes,
					function (d) {
						return d.figureWeight;
					}
				)
			]).range([3,10]);

			var wscale = d3.scale.linear()
				.domain([0,d3.max(graph.edges, function (d) {return d.value;})])
				.range([1,8]);

			// remove old links
			svg.selectAll(".link").data(graph.edges, key)
				.exit()
				.transition().duration(settings.NetworkView.animationDuration)
				.style('opacity', 0)
				.remove();

			// data join
		  var linkD = svg.selectAll(".link")
		    .data(graph.edges, key);

			// add lines to the svg
			var link = linkD.enter()
				.insert("line", ".node")
				.attr("class", "link")
				.style("opacity", 0)
				.style("stroke-width", function (d) {
					return wscale(d.value);
				});
			link.append("title").text(function(d){
				return d.scenes;
			});

			// animate into opacity
			linkD.transition().duration(settings.NetworkView.animationDuration)
				.style("opacity", 1);

			var nodeD = svg.selectAll(".node")
				.data(graph.nodes, key);

			// remove old nodes
			nodeD.exit()
				.transition().duration(settings.NetworkView.animationDuration)
				.style('opacity', 0)
				.remove();

			var node = nodeD.enter()
				.append("g");

			node.attr("class", "node")
				.style("opacity", 0)
				.call(force.drag)
				.on("click", function() { selectNode(this); });
			node.append("circle")
				.attr("r", function (d) {
					return rscale(d.figureWeight);
				})
				.on("dblclick", function() { dblclick(this); });

			node.append("title").text(function(d) {
					return d.txt;
				});
			node.append("text")
				.attr("dx", 12)
				.attr("dy", ".35em")
				.attr("class", "figureLabel")
				.attr("stroke", "none")
				.text(function(d) {
					return d.Reference;
				});

			// recolor the nodes
			nodeD
				.transition().duration(settings.NetworkView.animationDuration)
				.style("fill", function (d) {
					return darkcolors[graph.categories.indexOf(d.type) % darkcolors.length];
				})
				.style("opacity", 1);
		}

		function getGraphData() {

		  // data collection
		  var edgeObject = {};
		  for (var i = 0;i < data.scs.length; i++) {
		    var scene = data.scs[i];
		    var utterances = data.utt.filter(containedIn(scene));
		    var figuresInScene = [];
		    for (var u = 0; u < utterances.length; u++) {
		      figuresInScene.push(utterances[u].f);
		    }
		    figuresInScene = figuresInScene.unique().sort();

		    for (var f1i = 0; f1i < figuresInScene.length; f1i++) {
		      var f1 = figuresInScene[f1i];

		      if (! edgeObject.hasOwnProperty(f1.toString()))
		        edgeObject[f1.toString()] = {};
		      for (var f2i = f1i+1; f2i < figuresInScene.length; f2i++) {
		        var f2 = figuresInScene[f2i];
		        if (! edgeObject[f1.toString()].hasOwnProperty(f2.toString()))
		          edgeObject[f1.toString()][f2.toString()] = [];
		        edgeObject[f1.toString()][f2.toString()].push(i);
		      }
		    }
		  }
		  var edges = [];
		  var nodes = data.figures
		  	.map(function (f,i) {
					var o = Object.create(f);
					o.figureWeight = f.NumberOfWords;
					o.figureIndex = i;
					return o;
		  	});

			function findForFigureIndex(searchFor) {
				return function(f) {
					return f.figureIndex == searchFor;
				};
			}
		  for (var k in edgeObject) {
		    for (var j in edgeObject[k]) {
		        edges.push({
		          source: nodes.find(findForFigureIndex(k)),
		          target: nodes.find(findForFigureIndex(j)),
		          value: edgeObject[k][j].length,
		          scenes: edgeObject[k][j],
		          figureIndex: k.toString()+"_"+j.toString()
		        });
		    }
		  }
		  // console.log(edges);
		  return {
		    nodes:nodes,
		    edges:edges
		  };
		}

		function initForce(dimensions, graph) {
			var maxLinkValue = d3.max(graph.edges, function(d) {return d.value;});
			var distanceScale = d3.scale.linear()
				.domain([1,maxLinkValue])
				.range([1,10]);

			var force = d3.layout.force().size(dimensions)
				.charge(-100)
				.linkDistance(function (link) {
					return 300 / distanceScale(link.value);
				})
				.linkStrength(0.5)
				.friction(0.2);
				force.drag().on("dragstart", dragstart);

		  force.on("tick", function() {
		    svg.selectAll(".link").attr("x1", function(d) {
		      return d.source.x;
		    }).attr("y1", function(d) {
		      return d.source.y;
		    }).attr("x2", function(d) {
		      return d.target.x;
		    }).attr("y2", function(d) {
		      return d.target.y;
		    });
		    svg.selectAll(".node").attr("transform", function(d) {
		      return "translate(" + d.x + "," + d.y + ")";
		    });
		  });
			return force;
		}
	}
}
