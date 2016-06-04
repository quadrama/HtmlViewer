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
		FigureStatisticsView: {
			idString: "figure-statistics",
			title: "Figure Statistics",
			keys: ["Reference", "NumberOfWords", "NumberOfUtterances", "UtteranceLengthArithmeticMean"]
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
		}
	};
	var strongcolors = ["#AAF", "#FAA", "#AFA", "#55F", "#F55", "#5F5" ];
	var darkcolors = ["#000", "#A00", "#0A0", "#00A", "#AA0", "#0AA", "#A0A"];
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
		addFigureStatisticsView:function() {
			return addView(FigureStatisticsView);
		},
		addSemanticFieldsView:function() {
			return addView(SemanticFieldsView);
		},
		addAll:function() {
			return api.addTextView()
				.addPresenceView()
				.addFigureStatisticsView()
				.addSemanticFieldsView()
				.addNetworkView();
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

	function load(dataOrUrl) {
		if (typeof(dataOrUrl) == "string") {
			$.getJSON(dataOrUrl, function(data) {
				loadObject(data);
			});
		} else {
			return loadObject(dataOrUrl);
		}
	}

	function init() {
		target = $(selector);
		target.css("height", "90vh");
		target.css("width", "90vw");
		target.empty();
		target.append("<ul></ul>");
		$(selector).tabs();
		dimensions = {
			w: $(target).innerWidth(),
			h: $(target).innerHeight()
		};
		settings = Object.create(defaultSettings);
		merge(settings, userSettings);
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

	function sortAnnotations(a,b) {
		return parseInt(a.begin) - parseInt(b.begin);
	}

	function containedIn(b) {
		return function(a) {
			return parseInt(a.begin) >= parseInt(b.begin) && parseInt(a.end) <= parseInt(b.end);
		};
	}

	function figureFilter(o) {
		return function(f) {
			var figure = f;
			if (typeof(f) == "number") {
				figure = data.figures[f];
			} else if (f.hasOwnProperty("figureIndex")) {
				figure = data.figures[f.figureIndex];
			}
			for (var p in o) {
				if (figure[p] < o[p])
					return false;
			}
			return true;
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

	function TextView(targetJQ) {
		var contentArea = addTab(settings.TextView);
		var tocArea;
		var dpArea;
		var textArea;
		init();
		load();

		return {
			load:load,
			clear:clear
		};

		function init() {


			// create header structure
			var textHeader = document.createElement("div");
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
					$(segment).append("<div class=\"actheading\"><a name=\"#"+anchor+"\">"+act.head+"</a></div>");
					actIndex++;
				} else {
					$("ul.toc").append("<li><a href=\"#"+anchor+"\">"+actIndex+". Act</a></li>");
					$(segment).append("<div class=\"actheading\"><a name=\"#"+anchor+"\">"+(actIndex++)+". Act</a></div>");
				}

				var sceneIndex = 1;
				var scenes = data.scs.filter(containedIn(act)).sort(sortAnnotations);
				for (var scene of scenes) {
					var sceneElement = document.createElement("div");
					anchor = "act"+actIndex+"_scene"+sceneIndex;
					if ("head" in scene) {
						$(actToc).append("<li><a href=\"#"+anchor+"\">"+scene.head+"</a></li>");
						$(sceneElement).append("<div class=\"sceneheading\"><a name=\""+anchor+"\">"+scene.head+"</a></div>");
						sceneIndex++;
					} else {
						$(actToc).append("<li><a href=\"#"+anchor+"\">"+sceneIndex+". Scene</a></li>");
						$(sceneElement).append("<div class=\"sceneheading\"><a name=\""+anchor+"\">"+(sceneIndex++)+". Scene</a></div>");
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
			}
		}
	}

	function PresenceView(targetJQ) {
		var contentArea = addTab(settings.PresenceView);

		load();

		var api = {
			clear:clear,
			load:load
		};

		return api;


		function clear() {
			contentArea.empty();
			return api;
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
					color : colors[i % 3],
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
			var series = figures.sort(function(a,b) {
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
					visible:(currentFigure.NumberOfWords>wordThreshold),
					turboThreshold:0
				};
				return r;
			});
			// initiate highcharts vis
			contentArea.highcharts({
				legend: { y:200 },
				title: null,
				chart: {
					type: 'line',
					zoomType: 'xy',
					spacingBottom: 230,
					height: dimensions.h-20,
					width: contentArea.innerWidth()-50
				},
				xAxis: {
					plotBands: pb,
					min: 0, max: end+1,
					labels: { enabled: false }
				},
				yAxis: {
					max: figures.length-1,
					labels: { enabled:true },
					title:null,
					categories:figureNames
				},
				plotOptions: { series: { lineWidth : 1 } },
				tooltip: {
					crosshairs : true,
					headerFormat : "",
					useHTML : true,
					pointFormat : "<div style=\"width:200px;max-width:300px; white-space:normal\"><span style=\"color:{point.color};font-weight:bold;\">{series.name}</span>: {point.name}</div>"
				},
				series: series
			});
		}
	}

	function FigureStatisticsView(targetJQ) {
		var contentArea = addTab(settings.FigureStatisticsView);
		var chart;
		var dTable;
		var allColumns = [
			{ title: "Figure", data:"Reference" },
			{ title: "Words", data:"NumberOfWords" },
			{ title: "Utterances", data:"NumberOfUtterances" },
			{ title: "Mean Utt. Length", data:"UtteranceLengthArithmeticMean" },
			{ title: "Min Utt. Length", data:"UtteranceLengthMin"},
			{ title: "Max Utt. Length", data:"UtteranceLengthMax"},
			{ title: "Std Dev. Utt. Length", data: "UtteranceLengthStandardDeviation"},
			{ title: "Type Token Ratio", data:"TypeTokenRatio100" }
		];

		var wsize = 1000;

		var api = {
			load:load,
			clear:clear
		};
		init();
		load();

		return api;

		function init() {
		// create accordion
			contentArea.append("<h3>Chart</h3>");
			chart = $(document.createElement("div"));
			chart.appendTo(contentArea);
			contentArea.append("<h3>Table</h3>");
			contentArea.append("<div><table></table></div>");
			dTable = contentArea.find("table").DataTable({
				columns: allColumns.filter(function (a) {
					return settings.FigureStatisticsView.keys.includes(a.data);
				}),
				pageLength: 100
			});
		}

		function clear() {
			chart.empty();
			dTable.clear();
		}

		function load() {
			// for normalizing in the chart
			// (otherwise, it gets unreadable)
			var maxValues = {
				NumberOfWords:0,
				NumberOfUtterances:0,
				UtteranceLengthArithmeticMean:0,
				TypeTokenRatio100:0,
			};

			// find out the maximal value for each category
			var mydata = data.figures.map(function(cur) {
				for (var si in maxValues) {
					var v = cur[si];
					if (cur.NumberOfWords > wsize && v > maxValues[si])
						maxValues[si] = v;
					}
			});


			// create the chart
			chart.highcharts({
				title: null,
				chart: { type: "column" },
				xAxis: { categories: Object.keys(maxValues) },
				yAxis:{ min:0, max:1 },
				series: data.figures.map(function (cur, ind, arr) {
					return {
						name: cur.Reference,
						data: [
							cur.NumberOfWords/maxValues.NumberOfWords,
							cur.NumberOfUtterances/maxValues.NumberOfUtterances,
							cur.UtteranceLengthArithmeticMean/maxValues.UtteranceLengthArithmeticMean,
							(cur.NumberOfWords>wsize?cur.TypeTokenRatio100/maxValues.TypeTokenRatio100:0)
						]
					};
				})
			});

			dTable.rows.add(data.figures).draw();
			contentArea.accordion({
				heightStyle: "content"
			});
		}
	}

	function SemanticFieldsView(targetJQ) {
		var contentArea = addTab(settings.SemanticFieldsView);
		var chart;
		var dTable;

		init();
		load();
		var api = {
			load:load,
			clear:clear
		};
		return api;

		function init() {
			// create accordion
			contentArea.append("<h3>Chart</h3>");
			chart = $(document.createElement("div"));
			chart.appendTo(contentArea);
			contentArea.append("<h3>Table</h3>");
			contentArea.append("<div><table></table></div>");
			dTable = contentArea.find("table").DataTable({
				data: [],
				columns: [ {
					title: "Figure"
				} ].concat(Object.keys(data.fields).sort().map(function(cur) {
					return {title:cur,width:"10%"};
				})),
				pageLength: 100
			});
			contentArea.accordion({
				heightStyle: "content"
			});

		}

		function clear() {
			chart.empty();
			dTable.clear();
		}

		function load() {
			// collect data
			var series = data.figures.filter(function(cur) {
				return true;
			}).map(function(cur) {
				var arr = [];
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
					arr.push(settings.SemanticFieldsView.boostFactor *
						(sum[field] / data.fields[field].Length) /
						cur[settings.SemanticFieldsView.normalizationKey]
					);
				}
				return {
					name:cur.Reference,
					data:arr,
					pointPlacement: 'on',
					lineWidth:2,
					visible:(cur.NumberOfWords > wordThreshold)
				};
			});
			// create chart
			chart.highcharts({
				chart: {
					polar: true,
					type: 'line'
				},
				colors: darkcolors,
				title: { text:null },
				pane:{ size:'90%' },
				xAxis:{
					categories: Object.keys(data.fields).sort(),
					lineWidth: 0
				},
				yAxis:{ gridLineInterpolation: 'polygon' },
				tooltip: { enabled:false },
				series: series
			});

			// create table
			var tableData = series.map(function(current) {
				return [current.name].concat(current.data);
			});
			dTable.rows.add(tableData).draw();
		}
	}

	function NetworkView(targetJQ) {
		var contentArea = addTab(settings.NetworkView);
		var baseGraph = {};
		var currentGraph = {};
		var svg;
		var force;
		var width, height;
		init();
		load();

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
			clear:clear
		};

		function init() {
			var targetDiv = contentArea;
			width = $(contentArea).innerWidth();
			height = $(contentArea).innerHeight(); //window.innerHeight-200;

			// toolbar
			var settingsPane = document.createElement("div");
			$(settingsPane).addClass("toolbar");

			var limit = $(document.createElement("fieldset"));
			limit.append("<input type=\"checkbox\" class=\"limit-enable\" checked=\"checked\">");
			limit.append("Show figures with at least <br/>");
			limit.append("<input type=\"number\" class=\"limit-words\" value=\"1000\">");
			limit.append("words and ");
			limit.append("<input type=\"number\" class=\"limit-utterances\" value=\"10\">");
			limit.append("utterances.");

			var fieldSet = $(document.createElement("fieldset"));
			fieldSet.addClass("typecolor");
			fieldSet.append("<input type=\"checkbox\" class=\"color-enable\">");
			fieldSet.append("Color nodes by ");
			fieldSet.append("<br/>");

			var i = 0;
			for (var ftype in data.ftypes) {
				if (ftype != "All") {
					fieldSet.append("<input type=\"radio\" name=\"figureColor\" value=\""+ftype+"\"> " + ftype);
				}
			}
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
				contentArea.append(legendDiv);

			svg = d3.select("div#"+settings.NetworkView.idString).append("svg")
				.attr("height", height)
				.attr("width", width);
			$(settingsPane).find("input").change(updateSettings);
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
				});
			}
			var selectedType = "x";
			var typeValues = [""];
			if ($(cssId+" fieldset.typecolor input.color-enable:checked").length > 0) {
				selectedType = $(cssId+" input[name='figureColor']:checked").val();
				if (typeof data.ftypes[selectedType] != "undefined")
					typeValues = typeValues.concat(Object.keys(data.ftypes[selectedType]));

			}

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
			d3.layout.force().stop();
		}

		function selectNode() {
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
		 					.style("stroke", "#A00");
						thisNode.transition()
							.duration(settings.NetworkView.animationDuration)
										.style({"stroke": "#A00", "stroke-width": "5px"});
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
				.on("click", selectNode);

			node.append("circle")
				.attr("r", function (d) {
					return rscale(d.figureWeight);
				})
				.on("dblclick", dblclick);
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
		  		return {
		  			Reference:f.Reference,
		  			txt:f.txt,
		  			figureWeight:f.NumberOfWords,
		  			figureIndex:i
		  		};
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
