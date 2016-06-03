/*jshint -W069 */
/*jshint -W117 */

"use strict";

var colors = [ "#EEF", "#FEE", "#EFE"];
var strongcolors = ["#AAF", "#FAA", "#AFA", "#55F", "#F55", "#5F5" ];
var darkcolors = ["#000", "#A00", "#0A0", "#00A", "#AA0", "#0AA", "#A0A"];
var wordThreshold = 500;
var ftypes = ["Polarity", "RJType", "Gender"];
var colorIndex = 0;
var animLength = 500;

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

function initFromJson(url) {
	$.getJSON(url, function(data) {
		Drama("#drama").load(data).addAll();
	});
}

function loadPresenceChart(targetJQ, data) {
	targetJQ.children("ul").append("<li><a href=\"#presence\">Figure Presence Chart</a></li>");
	targetJQ.append("<div id=\"presence\"></div>");

	var figureSortKey = "NumberOfWords";

	// create plot bands
	var segments;
	if ("scs" in data) {
		segments = data["scs"];
	} else /* if ("seg1" in data["segments"]) */{
		segments = data["acts"];
	}
	var end = 0;
	var pb = segments.filter(function(_){return true;}).sort(function(a,b) {
		return a["begin"]-b["begin"];
	}).map(function(cur, i, arr) {
		if (parseInt(cur["end"]) > end) end = parseInt(cur["end"]);
		return {
			from : parseInt(cur["begin"]),
			to : parseInt(cur["end"]),
			color : colors[i % 3],
			label : {
				text : cur["head"],
				rotation : 270,
				align : "center",
				verticalAlign : "bottom",
				y : 30
			}
		};
	});

	// create an array of the figure index numbers (index in the original array)
	var figures = data["figures"].map(function(cur,ind,arr) {return ind;});

	// create an array for the figure names (which will be categories later
	// along the y axis)
	var figureNames = [];

	// create the series array
	var series = figures.sort(function(a,b) {
		return data["figures"][a][figureSortKey] - data["figures"][b][figureSortKey];
	}).map(function(currentFigureIndex, index, arr) {
		var currentFigure = data["figures"][currentFigureIndex];
		figureNames.push(currentFigure["Reference"]);
		var utterances = [];
		if ("utt" in currentFigure)
			for (var i = 0; i < currentFigure["utt"].length; i++) {
				var uttObj = data["utt"][currentFigure["utt"][i]];
				if (typeof(uttObj) == "undefined")
					continue;
				if ("s" in uttObj)
					for (var sp of uttObj["s"]) {
						utterances.push({
							x:sp["begin"],
							y:index,
							name:sp["txt"]
						});
						utterances.push({
							x:sp["end"],
							y:index,
							name:sp["txt"]
						});
					}
				utterances.push(null);
			}
		var r = {
			name:currentFigure["Reference"],
			data:utterances,
			lineWidth:3,
			visible:(currentFigure["NumberOfWords"]>wordThreshold),
			turboThreshold:0
		};
		return r;
	});

	// initiate highcharts vis
	$("#presence").highcharts({
		legend: { y:200 },
		title: null,
		chart: {
			type : 'line',
			zoomType : 'xy',
			spacingBottom:230,
			height:window.innerHeight-210
		},
		xAxis: {
			plotBands: pb,
			min: 0,
			max: end+1,
			labels: { enabled: false }
		},
		yAxis: {
			//min: 0,
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

function loadFigureStatistics(targetJQ, data) {
	var wsize = 1000;

	targetJQ.children("ul").append("<li><a href=\"#figure-statistics\">Figure Statistics</a></li>");
	targetJQ.append("<div id=\"figure-statistics\"></div>");

	// create accordion
	targetJQ.children("#figure-statistics").append("<h3>Chart</h3>");
	targetJQ.children("#figure-statistics").append("<div class=\"chart\">Chart</div>");
	targetJQ.children("#figure-statistics").append("<h3>Table</h3>");
	targetJQ.children("#figure-statistics").append("<div><table width=\"100%\"></table></div>");


	// for normalizing in the chart
	// (otherwise, it gets unreadable)
	var maxValues = {
		NumberOfWords:0,
		NumberOfUtterances:0,
		UtteranceLengthArithmeticMean:0,
		TypeTokenRatio100:0,
	};

	// find out the maximal value for each category
	var mydata = data["figures"].map(function(cur, ind, arr) {
		for (var si in maxValues) {
			var v = cur[si];
			if (cur["NumberOfWords"]>wsize && v > maxValues[si])
				maxValues[si] = v;
		}
	});

	// create the chart
	$("#figure-statistics .chart").highcharts({
		title: null,
		chart: { type: "column" },
		xAxis: { categories: Object.keys(maxValues) },
		yAxis:{ min:0, max:1 },
		series: data["figures"].map(function (cur, ind, arr) {
			return {
				name: cur["Reference"],
				data: [
					cur["NumberOfWords"]/maxValues["NumberOfWords"],
					cur["NumberOfUtterances"]/maxValues["NumberOfUtterances"],
					cur["UtteranceLengthArithmeticMean"]/maxValues["UtteranceLengthArithmeticMean"],
					(cur["NumberOfWords"]>wsize?cur["TypeTokenRatio100"]/maxValues["TypeTokenRatio100"]:0)
				]
			};
		})
	});

	$("#figure-statistics table").DataTable({
		data: data["figures"],
		columns: [
			{ title: "Figure", data:"Reference" },
			{ title: "Words", data:"NumberOfWords" },
			{ title: "Utterances", data:"NumberOfUtterances" },
			{ title: "Mean Utt. Length", data:"UtteranceLengthArithmeticMean" },
			{ title: "Type Token Ratio", data:"TypeTokenRatio100" }
		],
		pageLength: 100,
		retrieve: true
	});

	$("#figure-statistics").accordion({
		heightStyle: "content"
	});
}

function loadSemanticFields(targetJQ, data) {
	var boostFactor = 1000;
	var normalizationFactor = "NumberOfWords";

	targetJQ.children("ul").append("<li><a href=\"#fields\">Figures and Semantic Fields</a></li>");
	targetJQ.append("<div id=\"fields\"></div>");

	// create accordion
	targetJQ.children("#fields").append("<h3>Chart</h3>");
	targetJQ.children("#fields").append("<div class=\"chart\">Chart</div>");
	targetJQ.children("#fields").append("<h3>Table</h3>");
	targetJQ.children("#fields").append("<div><table width=\"100%\"></table></div>");

	// columns for table
	var columns = [ {
		title: "Figure"
	} ].concat(Object.keys(data["fields"]).sort().map(function(cur, ind, arr) {
		return {title:cur,width:"10%"};
	}));


	// collect data
	var series = data["figures"].filter(function(cur) {
		return true;
	}).map(function(cur, ind, arr) {
		var sum = {};
		for (var field of Object.keys(data.fields).sort()) {
			sum[field] = 0;
		}
		if ("utt" in cur) {
			for (var i = 0; i < cur["utt"].length; i++) {
				var currentUtterance = data["utt"][cur["utt"][i]];
				if ("s" in currentUtterance) {
					for (var speech of currentUtterance.s) {
						if ("fields" in speech) {
							for (var fname of speech["fields"]) {
								sum[fname]++;
							}
						}
					}
				}
			}
		}
		for (var field of Object.keys(data.fields).sort()) {
			arr.push(boostFactor*(sum[field] / data["fields"][field]["Length"])/cur[normalizationFactor]);
		}
		return {
			name:cur["Reference"],
			data:arr,
			pointPlacement: 'on',
			lineWidth:2,
			visible:(cur["NumberOfWords"]>wordThreshold)
		};
	});

	// create chart
	$("#fields .chart").highcharts({
		chart: {
			polar: true,
			type: 'line'
		},
		colors: darkcolors,
		title: { text:null },
		pane:{ size:'90%' },
		xAxis:{
			categories: columns.map(function(cur) {
				return cur["title"];
			}),
			lineWidth: 0
		},
		yAxis:{ gridLineInterpolation: 'polygon' },
		tooltip: { enabled:false },
		series: series
	});

	// create table
	var tableData = series.map(function(current) {
		return [current["name"]].concat(current["data"]);
	});
	$("#fields table").DataTable({
		retrieve: true,
		data: tableData,
		columns: columns,
		pageLength: 100
	});

	$("#fields").accordion({
		heightStyle: "content"
	});

}

function loadText(targetJQ, data) {
	targetJQ.children("ul").append("<li><a href=\"#text\">Text</a></li>");
	targetJQ.append("<div id=\"text\"></div>");

	// create header structure
	var textHeader = document.createElement("div");
	$(textHeader).addClass("toccontainer");
	$(textHeader).append("<p>Table of Contents</p>");
	$(textHeader).append("<ul class=\"toc\"></ul>");
	$(textHeader).append("<p>Dramatis Personae</p>");
	$(textHeader).append("<ul class=\"dramatispersonae\"></ul>");

	$("#text").append(textHeader);

	// add figures to header
	for (var fIndex = 0; fIndex < data["figures"].length; fIndex++) {
		var figure = data["figures"][fIndex];
		var figureLi = document.createElement("li");
		$(figureLi).addClass("f"+fIndex);
		$(figureLi).append("<input type=\"checkbox\" value=\"f"+fIndex+"\"/>");
		$(figureLi).append(figure["Reference"]);
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
	for (var act of data["acts"].sort(function(a,b) {return parseInt(a["begin"])-parseInt(b["begin"]);})) {
		segment = document.createElement("div");
		var anchor = "act"+actIndex;
		var actToc = document.createElement("ul");
		if ("head" in act) {
			$("ul.toc").append("<li><a href=\"#"+anchor+"\">"+act["head"]+"</a></li>");
			$(segment).append("<div class=\"actheading\"><a name=\"#"+anchor+"\">"+act["head"]+"</a></div>");
			actIndex++;
		} else {
			$("ul.toc").append("<li><a href=\"#"+anchor+"\">"+actIndex+". Act</a></li>");
			$(segment).append("<div class=\"actheading\"><a name=\"#"+anchor+"\">"+(actIndex++)+". Act</a></div>");
		}

		var sceneIndex = 1;
		var scenes = data["scs"].filter(function(a) {
			return parseInt(a["begin"]) >= parseInt(act["begin"]) && parseInt(a["end"]) <= parseInt(act["end"]);
		}).sort(function (a,b) {return parseInt(a["begin"])-parseInt(b["begin"]);});
		for (var scene of scenes) {
			var sceneElement = document.createElement("div");
			anchor = "act"+actIndex+"_scene"+sceneIndex;
			if ("head" in scene) {
				$(actToc).append("<li><a href=\"#"+anchor+"\">"+scene["head"]+"</a></li>");
				$(sceneElement).append("<div class=\"sceneheading\"><a name=\""+anchor+"\">"+scene["head"]+"</a></div>");
				sceneIndex++;
			} else {
				$(actToc).append("<li><a href=\"#"+anchor+"\">"+sceneIndex+". Scene</a></li>");
				$(sceneElement).append("<div class=\"sceneheading\"><a name=\""+anchor+"\">"+(sceneIndex++)+". Scene</a></div>");
			}
			for (var u of data["utt"].filter(function (a) {
				return a["begin"] >= scene["begin"] && a["end"] <= scene["end"];
			})) {
				var figure = data["figures"][u["f"]];
				var utteranceElement = document.createElement("div");
				$(utteranceElement).addClass("utterance");
				$(utteranceElement).attr("data-begin", u["begin"]);
				$(utteranceElement).attr("data-end", u["end"]);
				$(utteranceElement).append("<div class=\"speaker f"+u["f"]+"\">"+figure["Reference"]+"</div>");
				if ("s" in u)
				for (var s of u["s"]) {
					$(utteranceElement).append("<div class=\"speech\">"+s["txt"]+"</div>");
				}
				$(sceneElement).append(utteranceElement);
			}
			$(segment).append(sceneElement);
			$("#text ul.toc").append(actToc);
		}
		$("#text").append(segment);
	}
	$(".toccontainer").accordion({header:"p",heightStyle:"content",collapsible:true});

}

function getFigureTypes(data, figure) {
	var types = [];
	var figureIndex = data["figures"].indexOf(figure);
	for (var ftype in data["ftypes"]) {
		for (var fvalue in data["ftypes"][ftype]) {
			if (data["ftypes"][ftype][fvalue].includes(figureIndex)) {
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
	for (var fvalue in data["ftypes"][ftype]) {
		if (data["ftypes"][ftype][fvalue].includes(figureIndex))
			return fvalue;
	}
	return "";
}

function getGraphData(data, figureFilterFunction, ftype) {
	var typeValues = [""];
	if (typeof data["ftypes"][ftype] != "undefined")
		typeValues = typeValues.concat(Object.keys(data["ftypes"][ftype]));

  // data collection
  var edgeObject = {};
  for (var i = 0;i < data["scs"].length; i++) {
    var scene = data["scs"][i];
    var utterances = data["utt"].filter(function (a) {
      return a["begin"] >= scene["begin"] && a["end"] <= scene["end"];
    });
    var figuresInScene = [];
    for (var u = 0; u < utterances.length; u++) {
      figuresInScene.push(utterances[u]["f"]);
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
  var nodes = data["figures"]
  	.map(function (f,i,_) {
  		return {
  			Reference:f["Reference"],
  			txt:f["txt"],
  			figureWeight:f["NumberOfWords"],
  			figureIndex:i,
  			type:getFigureTypeValue(data, i, ftype)
  		};
  	});

  for (var k in edgeObject) {
    for (var j in edgeObject[k]) {
        edges.push({
          source: nodes.find(function (f) {
          	return f["figureIndex"] == k;
          }),
          target: nodes.find(function (f) {
          	return f["figureIndex"] == j;
          }),
          value: edgeObject[k][j].length,
          scenes: edgeObject[k][j],
          figureIndex: k.toString()+"_"+j.toString()
        });
    }
  }
  // console.log(edges);
  return {
    nodes:nodes,
    edges:edges,
    categories:typeValues
  };
}

function initForce(containerSelector, dimensions, graph) {
	var maxLinkValue = d3.max(graph["edges"], function(d) {return d.value;});
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
    d3.select(containerSelector).select("svg").selectAll(".link").attr("x1", function(d) {
      return d.source.x;
    }).attr("y1", function(d) {
      return d.source.y;
    }).attr("x2", function(d) {
      return d.target.x;
    }).attr("y2", function(d) {
      return d.target.y;
    });
    d3.select(containerSelector).select("svg").selectAll(".node").attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
    });
  });
	return force;
}

function drawGraph(target, graph, force, dimensions) {
	var width = dimensions[0];
	var height = dimensions[1];
	var svg = d3.select(target).select("svg");

	var key = function (d) {
		return d.figureIndex;
	};

	var rscale = d3.scale.linear()
		.domain([0, d3.max(graph["nodes"],
			function (d) {
				return d["figureWeight"];
			}
		)
	]).range([3,10]);

	var wscale = d3.scale.linear()
		.domain([0,d3.max(graph["edges"], function (d) {return d.value;})])
		.range([1,8]);

	// remove old links
	svg.selectAll(".link").data(graph["edges"], key)
		.exit()
		.transition().duration(animLength)
		.style('opacity', 0)
		.remove();

	// data join
  var linkD = svg.selectAll(".link")
    .data(graph["edges"], key);

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
	linkD.transition().duration(animLength)
		.style("opacity", 1);



	var nodeD = svg.selectAll(".node")
		.data(graph["nodes"], key);

	// remove old nodes
	nodeD.exit()
		.transition().duration(animLength)
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
			return rscale(d["figureWeight"]);
		})
		.on("dblclick", dblclick);
	node.append("title").text(function(d) {
			return d["txt"];
		});
	node.append("text")
		.attr("dx", 12)
		.attr("dy", ".35em")
		.attr("class", "figureLabel")
		.attr("stroke", "none")
		.text(function(d) {
			return d["Reference"];
		});

	// recolor the nodes
	nodeD
		.transition().duration(animLength)
		.style("fill", function (d) {
			return darkcolors[graph.categories.indexOf(d["type"]) % darkcolors.length];
		})
		.style("opacity", 1);
}

function loadCopresenceNetwork(targetJQ, data) {

  // add tab
  targetJQ.children("ul").append("<li><a href=\"#copresence\">Copresence Network</a></li>");
	targetJQ.append("<div id=\"copresence\" class=\"view\"></div>");
  var targetDiv = targetJQ.children("div#copresence");
	var width = $(targetDiv).innerWidth();
	var height = $(targetDiv).innerHeight(); //window.innerHeight-200;

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
  for (var ftype in data["ftypes"]) {
    if (ftype != "All") {
      fieldSet.append("<input type=\"radio\" name=\"figureColor\" value=\""+ftype+"\"> " + ftype);
    }
  }
  $(settingsPane).append(limit);
  $(settingsPane).append(fieldSet);


	targetDiv.append(settingsPane);
	targetDiv.append("<svg></svg>");
	targetDiv.children("svg").attr("height", height);
	targetDiv.children("svg").attr("width", width);
	var baseGraph = getGraphData(data, null, null);
	var force = initForce("div#copresence", [width, height], baseGraph);

  $(settingsPane).find("input").change(function() {
		force.stop();
    var figureFilterFunction;
    if ($("#copresence .limit-enable:checked()").length === 0)
      figureFilterFunction = function(a) { return true; };
    else {
      var limitWords = parseInt($("#copresence .limit-words").val());
      var limitUtterances = parseInt($("#copresence .limit-utterances").val());

      figureFilterFunction = function(figure) {
        return data["figures"][figure["figureIndex"]]["NumberOfUtterances"] > limitUtterances && data["figures"][figure["figureIndex"]]["NumberOfWords"] > limitWords;
      };
    }
    var selectedType = "x";
		var typeValues = [""];
    if ($("#copresence fieldset.typecolor input.color-enable:checked").length > 0) {
    	selectedType = $("#copresence input[name='figureColor']:checked").val();
			if (typeof data["ftypes"][selectedType] != "undefined")
				typeValues = typeValues.concat(Object.keys(data["ftypes"][selectedType]));

		}

		var nodes = baseGraph["nodes"].filter(figureFilterFunction);
		var links = baseGraph["edges"].filter(function (a) { return figureFilterFunction(a.source) && figureFilterFunction(a.target); });
		for (var node of nodes) {
			node["type"] = getFigureTypeValue(data, node["figureIndex"], selectedType);
		}
		var graph = {
			nodes:nodes,
			edges:links,
			categories:typeValues
		};
    drawGraph("#copresence", graph, force, [width, height]);

		force.nodes(graph["nodes"]).links(graph["edges"])
	    .start();
  });
  $(settingsPane).find("input").eq(0).change();


}

function loadNetwork(data) {
	$("#tabs > ul").append(
			"<li><a href=\"#mentionnetwork\">Mention Network</a></li>");

	$("#tabs").append(
			"<div id=\"mentionnetwork\" style=\"height:400px;\"></div>");

	var width = 960, height = 500;
	var svg = d3.select("#mentionnetwork").append("svg").attr("width", width)
			.attr("height", height);
	svg.append("defs").selectAll("marker").data(
			[ "suit", "licensing", "resolved" ]).enter().append("marker").attr(
			"id", function(d) {
				return d;
			}).attr("viewBox", "0 -5 10 10").attr("refX", 25).attr("refY", 0)
			.attr("markerWidth", 6).attr("markerHeight", 6).attr("orient",
					"auto").append("path").attr("d",
					"M0,-5L10,0L0,5 L10,0 L0, -5").style("stroke", "#000")
			.style("opacity", "1");
	var force = d3.layout.force().size([ width, height ]).charge(-400)
			.linkDistance(40);

	force.drag().on("dragstart", dragstart);

	force.nodes(data["network"]["nodes"]).links(data["network"]["links"])
			.start();

	var link = svg.selectAll(".link").data(data["network"]["links"]).enter()
			.append("line").attr("class", "link").attr("marker-end",
					"url(#suit)");

	var node = svg.selectAll(".node").data(data["network"]["nodes"]).enter()
			.append("g").attr("class", "node").call(force.drag);

	node.append("circle").attr("r", 12).on("dblclick", dblclick);

	node.append("text").attr("dx", 12).attr("dy", ".35em").style("font-weight",
			"normal").text(function(d) {
		return d.label;
	});

	force.on("tick", function() {
		link.attr("x1", function(d) {
			return d.source.x;
		}).attr("y1", function(d) {
			return d.source.y;
		}).attr("x2", function(d) {
			return d.target.x;
		}).attr("y2", function(d) {
			return d.target.y;
		});

		node.attr("transform", function(d) {
			return "translate(" + d.x + "," + d.y + ")";
		});
	});
}

function load() {
	var mydata = data[parseInt($("#docselect").val())];

	var title = mydata["meta"]["ReferenceDate"]+": "+mydata["meta"]["authors"][0]["Name"]+ " - " + mydata["meta"]["documentTitle"] + ("translators" in mydata["meta"]?" (trsl. "+mydata["meta"]["translators"][0]["Name"]+")":"");
	document.title = title;
	$("#title").text("Drama View");
	$("#title").after("<h2>"+title+"</h2>");

	dramaViewer("#tabs", mydata);
}

function clean() {
	try {
		$("#fields table").DataTable().destroy();
		$("#speech table").DataTable().destroy();
		$("#tabs #fields").accordion("destroy");
		$("#tabs").tabs("destroy");
	} catch (err) {

	}
	$("#content h2").remove();
	$("#tabs").empty();
	$("#tabs").append("<ul></ul>");
}



function init(data) {
	data = data.sort(function (a,b) {
		return a["meta"]["ReferenceDate"] - b["meta"]["ReferenceDate"];
	});
	var ftypes = {};
	var wordfields = {};
	for (var i = 0; i < data.length; i++) {
		$("#docselect").append("<option value=\""+i+"\">"+data[i]["meta"]["DisplayId"]+"</option>");
		for (var ftype in data[i]["ftypes"]) {
			if (!ftypes.hasOwnProperty(ftype))
				ftypes[ftype] = {};
			for (var fvalue in data[i]["ftypes"][ftype]) {
				ftypes[ftype][fvalue] = 1;
			}
		}
		for (var wf in data[i]["fields"]){
			wordfields[wf] = 1;
		}
	}
	// console.log(ftypes);
	$("#docselect").change(function(event) {
		clean();
		load();
	});
	for (var ftype in ftypes) {
		var og = document.createElement("optgroup");
		$(og).attr("label", ftype);
		for (var fvalue in ftypes[ftype])
			$(og).append("<option value=\""+ftype+"."+fvalue+"\">"+fvalue+"</option>");
		$("#figuretype").append(og);
	}
	for (var wf in wordfields) {
		$("#wordfield").append("<input type=\"checkbox\" name=\"field\" value=\""+wf+"\" />"+wf+"<br/>");
	}

	load();
}

function filterFigures(figure) {
	if ($("#limit:checked").length == 1)
		return figure["NumberOfUtterances"] > 20 && figure["NumberOfWords"];
	else
		return true;
}

function initAll(docs) {
	$("#limit").change(function() {
		refreshView(docs);
	});
	$("#texts").change(function() {
		refreshView(docs);
	});

	for (var i = 0; i < docs.length; i++) {
		var cur = docs[i];
		// console.log(cur);
		$("#texts").append("<option selected=\"selected\" value=\""+docs[i]["meta"]["DisplayId"]+"\">"+docs[i]["meta"]["DisplayId"]+"</option>");
	}
}

function refreshView(docs) {

	// sort the documents by year
	docs.sort(function(a,b) {
		return a.meta.ReferenceDate - b.meta.ReferenceDate;
	});



	// filtering of figures
	var figureFilterFunction = function(a) {return true;};
	var figureFilterName = "all";
	if ($("#limit:checked").length == 1) {
		var limitWords = parseInt($("#limit-words").val());
		var limitUtterances = parseInt($("#limit-utterances").val());
		figureFilterFunction = function(a) {
			return a["NumberOfUtterances"] > limitUtterances && a["NumberOfWords"] > limitWords;
		};
		figureFilterName = "#utt > "+limitUtterances+" & #words > "+limitWords;
	}

	var docFilterFunction = function(a) {
		// console.log($("#texts").val());
		return $("#texts").val().includes(a["meta"]["DisplayId"]);
	};

	// assembly of series
	var series = [];
	series.push({
		data:docs.filter(docFilterFunction).map(function(cur, index) {
			return cur["figures"].filter(figureFilterFunction).length;
		}),
		name:"Number of Figures"
	});
	series.push({
		data:docs.filter(docFilterFunction).map(function(cur) {
			var n = 0;
			cur["figures"].filter(figureFilterFunction).forEach(function(current) {
				n += current["NumberOfWords"];
			});
			return n;
		}),
		name:"Total word length"
	});
	series.push({
		data:docs.filter(docFilterFunction).map(function(cur) {
			var n = 0.0;
			var s = 0.0;
			cur["figures"].filter(figureFilterFunction).forEach(function(current) {
				n += current["UtteranceLengthArithmeticMean"];
				s += 1.0;
			});
			return n/s;
		}),
		name:"Avg. utterance length"
	});
	series.push({
		data:docs.filter(docFilterFunction).map(function(cur) {
			var n = 0.0;
			var s = 0.0;
			cur["figures"].filter(figureFilterFunction).forEach(function(current) {
				n += current["NumberOfWords"];
				s += 1.0;
			});
			return n/s;
		}),
		name:"Avg. number of words"
	});
	series.push({
		data:docs.filter(docFilterFunction).map(function(cur) {
			var n = 0.0;
			var s = 0.0;
			cur["figures"].filter(figureFilterFunction).forEach(function(current) {
				n += current["NumberOfUtterances"];
				s += 1.0;
			});
			return n/s;
		}),
		name:"Avg. number of utterances"
	});


	// console.log(series);
	$("#hc").highcharts({
		chart: {
			type: 'line'
		},
		title: {
			text: "Figures with " + figureFilterName
		},
		series:series,
		xAxis: {
			categories: docs.filter(docFilterFunction).map(function(cur) {
				return cur["meta"]["ReferenceDate"]+" "+cur["meta"]["authors"][0]["Name"] + ": "+cur["meta"]["documentTitle"]+("transl" in cur["meta"]?" (transl.: "+cur["meta"]["translators"][0]["Name"]+")":"");
			})
		}
	});
}



function load_aggregated_view(target, data, words, figureclass, figurevalue, ftype, fields) {
	$("#title").text("Corpus Overview");
	var docs = [];
	var sp = [];
	for (var i = 0; i < data.length; i++) {
		try {
			if (data[i]["ftypes"][figureclass][figurevalue].length>0) {
				docs.push(data[i]);
			}
		} catch (err) {
			// console.error(err);
		}
	}
	docs = docs.sort(function(a,b) {
		return parseInt(a.meta.ReferenceDate) - parseInt(b.meta.ReferenceDate);
	});
	// console.log(docs);
	var series = words.map(function(cur, index) {
		var d = docs.map(function(cur2) {
			var figureIndices = cur2["ftypes"][figureclass][figurevalue];
			var occ = 0;
			var total = 0;
			for (var f of figureIndices) {
				total += parseInt(cur2["figures"][f]["NumberOfWords"]);
				try {
					occ += parseInt(cur2["figures"][f]["freq"][cur]["c"]);
				} catch (err) {
					// console.error(err);
				}
			}
			//console.log(total);
			var yvalue = 0;
			try {
				if (total > 0)
					yvalue = occ / total;
				else yvalue = 0;
			} catch (err) {
				// console.err;
			} finally {
			}
			// var ret = parseInt(cur2["meta"]["ReferenceDate"]);
			return yvalue; // ret;
		});
		// console.log(d);
		return {
			lineWidth:1,
			marker:{radius:4},
			name : cur,
			data : d,
			visible: ($("#everythingHidden:checked").length === 0)
		};
	}).concat(
		fields.map(function(cur) {
			var d = docs.map(function(cur2) {
				var figureIndices = cur2["ftypes"][figureclass][figurevalue];
				var occ = 0;
				var total = 0;
				for (var f of figureIndices) {
					total += parseInt(cur2["figures"][f]["NumberOfWords"]);
					if ("utt" in cur2["figures"][f])
					for (var u of cur2["figures"][f]["utt"]) {
						if (u in cur2["utt"] && "s" in cur2["utt"][u])
						for (var s of cur2["utt"][u]["s"]) {
							if ("fields" in s)
							occ += s["fields"].filter(function(a) {
								return a === cur;
							}).length;
						}
					}
				}
				if (total == 0)
					return 0;
				return 93*(occ / total) / cur2["fields"][cur]["Length"];
			});
			return {
				lineWidth:1,
				marker:{radius:4},
				name : cur,
				data : d,
				visible: ($("#everythingHidden:checked").length == 0)
			};
		}));
	// console.log(series);
	$(target).highcharts(
		{
			chart: {
				height:"600",
				type: "line"
			},
			title : {
				text: figureclass+": "+figurevalue
			},
			series: series,
			plotOptions: {
				line: {
					marker: {
						enabled: true
					}
				}
			},
			tooltip:{
				headerFormat:"<small>{point.key}</small><br/>"
			},
			xAxis: {
				categories: docs.map(function(cur) {
					return cur["meta"]["ReferenceDate"]+" "+cur["meta"]["authors"][0]["Name"] + ": "+cur["meta"]["documentTitle"]+("transl" in cur["meta"]?" (transl.: "+cur["meta"]["translators"][0]["Name"]+")":"");
				})
			}
		}
	);
}

function draw () {
	clean();
	var numWords = $("input#maxlemma").val();
	var words = {};
	var fields = {};
	$("input[name='field']:checked").each(function(index, element) {
		fields[$(element).val()] = 1;
	});


	var ft = $("#figuretype").val().split(".");
	var vt = $("#valuetype").val();
	if ($("#words_entered:checked").length>0) {
		for (var w of $("#words").val().split("\n")) {
			words[w] = 1;
		}
	}
	var posTags = [];
	var useEveryPosTag = $("#words_mf_everything:checked").length>0;
	if ($("#words_mf_nouns:checked").length>0) {
		posTags.push("NN");
	}
	if ($("#words_mf_verbs:checked").length>0) {
		posTags.push("VV");
	}
	if ($("#words_mf_adjectives:checked").length>0) {
		posTags.push("ADJ");
	}
	if ($("#words_most_frequent:checked").length>0) {
		for (var doc of data) {
			var array = {};
			try {
				// console.log(ft);
				for (var figIndex of doc["ftypes"][ft[0]][ft[1]]) {
					var figure = doc["figures"][figIndex];
					for (var word in figure["freq"]) {
						var p = figure["freq"][word]["pos"];
						if (useEveryPosTag || posTags.includes(p))
							array[word] = figure["freq"][word]["c"];
					}
				}
				var mfl = Object.keys(array).sort(function (a,b) {
					return array[b] - array[a];
				});
				for (var i = 0; i < numWords; i++) {
					words[mfl[i]] = 1;
				}
				// console.log(mfl);
			} catch (err) {
				// console.error(err);
			}
		}
	}
	// console.log(words);
	load_aggregated_view("#tabs", data, Object.keys(words), ft[0], ft[1], vt, Object.keys(fields));
}
