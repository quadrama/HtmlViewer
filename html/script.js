var colors = [ "#EEF", "#FEE", "#EFE" ];
var wordThreshold = 500;

function loadChart(data) {
	$("#tabs ul").append("<li><a href=\"#hc\">Figure Presence Chart</a></li>");
	$("#tabs").append("<div class=\"hc\" id=\"hc\"></div>");
	var segments;
	if ("scs" in data) {
		segments = data["scs"];
	} else /* if ("seg1" in data["segments"]) */{
		segments = data["acts"];
	}
	var pb = segments.map(function(cur, i, _) {
		return {
			from : cur["begin"],
			to : cur["end"],
			color : colors[i % 3],
			label : {
				text : cur["head"],
				rotation : 270,
				align : "center",
				verticalAlign : "bottom",
				y : -30
			}
		}
	});

	$("#hc").highcharts(
					{
						title : null,
						chart : {
							type : 'line',
							zoomType : 'x'
						},
						xAxis : {
							plotBands : pb
						},
						yAxis : {
						// categories: speakers
						},
						plotOptions : {
							series : {
								lineWidth : 1
							// connectNulls: false // by default
							}
						},
						tooltip : {
							crosshairs : true,
							headerFormat : "",
							useHTML : true,
							pointFormat : "<div style=\"width:200px;max-width:300px; white-space:normal\"><span style=\"color:{point.color}\">{series.name}</span>: {point.name}</div>"
						},
						series : data["figures"].sort(function(a,b) {
							return a["NumberOfWords"] - b["NumberOfWords"];
						}).map(function(cur, index, _) {
							var utterances = [];
							if ("utt" in cur) 
								for (var i = 0; i < cur["utt"].length; i++) {
									var uttObj = data["utt"][cur["utt"][i]];
									if (typeof(uttObj) == "undefined")
										continue;
									if ("s" in uttObj)
									for (sp of uttObj["s"]) {
										utterances.push({
											x:sp["begin"],
											y:index*0.01,
											name:sp["txt"]
										});
										utterances.push({
											x:sp["end"],
											y:index*0.01,
											name:sp["txt"]
										});
									}
									utterances.push(null);
								}
							return {
								name:cur["Reference"],
								data:utterances,
								lineWidth:5,
								visible:(cur["NumberOfWords"]>wordThreshold)
							};
						})
					});
}

function loadTable(data) {
	$("#tabs ul")
			.append("<li><a href=\"#speech\">Figure Speech Table</a></li>");
	$("#tabs")
			.append("<div id=\"speech\"><table width=\"100%\"></table></div>");

	$("#speech table").DataTable({
		data: data["figures"].map(function(cur, ind, arr) {
			return [
				cur['Reference'],
				cur['NumberOfWords'],
				cur['NumberOfUtterances'],
				Number(cur['UtteranceLengthArithmeticMean'])
					.toFixed(2) ]
		}),
		columns: [
			{ title : "Figure" }, 
			{ title : "Words" },
			{ title : "Utterances" },
			{ title : "Mean Utt. Length" }
		],
		pageLength:100,
		retrieve: true
	});
}

function loadFieldTable(data) {
	$("#tabs ul").append("<li><a href=\"#fields\">Figures and Semantic Fields</a></li>");
	$("#tabs").append("<div id=\"fields\"><h3>Chart</h3><div class=\"chart hc\"></div><h3>Table</h3><div><table width=\"100%\"></table></div></div>");
	
	
	var tableData = data["figures"].filter(function(cur,_,_) {
		return ("utt" in cur);
	}).map(function(cur, ind, arr) {
		var sum = {};
		var arr = [];
		for (field of Object.keys(data.fields).sort()) {
			sum[field] = 0;
		}
		for (var i = 0; i < cur["utt"].length; i++) {
			var currentUtterance = data["utt"][cur["utt"][i]]
			if ("s" in currentUtterance)
			for (speech of currentUtterance.s) {
				if ("fields" in speech) {
					for (fname of speech["fields"]) {
						sum[fname]++;
					}
				}
			}
		}
		for (field of Object.keys(data.fields).sort()) {
			arr.push((sum[field] / data["fields"][field]["Length"])/cur["NumberOfWords"]);
		}
		return [ cur['Reference'] ].concat(arr);
	});
	var columns = [ {
		title: "Figure"
	} ].concat(Object.keys(data["fields"]).map(function(cur, _, _) {
		return {title:cur,width:"10%"};
	}));
		
		
	var series = data["figures"].filter(function(cur, _, _) {
		return true;
	}).map(function(cur, ind, arr) {
			var sum = {};
			var arr = [];
			for (field of Object.keys(data.fields).sort()) {
				sum[field] = 0;
			}
			if ("utt" in cur) {
				for (var i = 0; i < cur["utt"].length; i++) {
					var currentUtterance = data["utt"][cur["utt"][i]]
					if ("s" in currentUtterance)
					for (speech of currentUtterance.s) {
						if ("fields" in speech) {
							for (fname of speech["fields"]) {
								sum[fname]++;
							}
						}
					}
				}
			}
			for (field of Object.keys(data.fields).sort()) {
				arr.push((sum[field] / data["fields"][field]["Length"])/cur["NumberOfWords"]);
			}
			return {
				name:cur["Reference"],
				data:arr,
				pointPlacement: 'on',
				lineWidth:0.5,
				visible:(cur["NumberOfWords"]>wordThreshold)
			};
		});
	$("#fields .chart").highcharts({
		chart: {
			polar: true,
			type: 'line'
		},
		title: {
			text:null
		},
		pane:{
			size:'90%'
		},
		xAxis:{
			categories: Object.keys(data["fields"]).sort(),
			lineWidth: 0
		},
		yAxis:{
			gridLineInterpolation: 'polygon'
		},
		tooltip: {enabled:false},
		series: series
	});
		
	$("#fields table").DataTable({
		retrieve: true,
		data : tableData,
		columns : columns,
		pageLength:100
	});
	
	$("#tabs #fields").accordion({
		heightStyle: "content"
	});
	
}

function loadNetwork(data) {
	$("#tabs ul").append(
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
		return d.label
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
	$("#title").text(title);
	loadChart(mydata);
	loadTable(mydata);
	if ("network" in mydata)
		loadNetwork(mydata);
	if ("fields" in mydata) {
		loadFieldTable(mydata);
	}
	$("#tabs").tabs();
}

function clean() {
	$("#fields table").DataTable().destroy();
	$("#speech table").DataTable().destroy();
	$("#tabs #fields").accordion("destroy");
	$("#tabs").tabs("destroy");
	$("#tabs").empty();
	$("#tabs").append("<ul></ul>");
}

function init(data) {
	$("#settings").append("<select id=\"docselect\"></select>");
	data = data.sort(function (a,b) {
		return a["meta"]["ReferenceDate"] - b["meta"]["ReferenceDate"];
	});
	for (var i = 0; i < data.length; i++) {
		$("#docselect").append("<option value=\""+i+"\">"+data[i]["meta"]["DisplayId"]+"</option>");
	}
	$("#docselect").change(function(event) {
		clean();
		load();
	});
	load();
}

function dblclick(d) {
	d3.select(this).classed("fixed", d.fixed = false);
}

function dragstart(d) {
	d3.select(this).classed("fixed", d.fixed = true);
}