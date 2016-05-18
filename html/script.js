var colors = [ "#EEF", "#FEE", "#EFE" ];
var wordThreshold = 500;
var ftypes = ["Polarity", "RJType", "Gender"];

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
	var figures = data["figures"];

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
							max:figures.length
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
						series : figures.sort(function(a,b) {
							return a["NumberOfWords"] - b["NumberOfWords"];
						}).map(function(cur, index, _) {
							// console.log(cur);
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
								name:cur["Reference"],
								data:utterances,
								lineWidth:3,
								visible:(cur["NumberOfWords"]>wordThreshold),
								turboThreshold:0
							};
							// console.log(r);
							return r;
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
	$("#title").text("Drama View");
	$("#title").after("<h2>"+title+"</h2>");
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
	for (var i = 0; i < data.length; i++) {
		$("#docselect").append("<option value=\""+i+"\">"+data[i]["meta"]["DisplayId"]+"</option>");
		for (var ftype in data[i]["ftypes"]) {
			if (!ftypes.hasOwnProperty(ftype))
				ftypes[ftype] = new Object();
			for (var fvalue in data[i]["ftypes"][ftype]) {
				ftypes[ftype][fvalue] = 1;
			}
		}
	}
	// console.log(ftypes);
	$("#docselect").change(function(event) {
		clean();
		load();
	});
	for (ftype in ftypes) {
		var og = document.createElement("optgroup");
		$(og).attr("label", ftype);
		for (fvalue in ftypes[ftype])
			$(og).append("<option value=\""+ftype+"."+fvalue+"\">"+fvalue+"</option>");
		$("#figuretype").append(og);
	}
	
	load();
}

function dblclick(d) {
	d3.select(this).classed("fixed", d.fixed = false);
}

function dragstart(d) {
	d3.select(this).classed("fixed", d.fixed = true);
}


function load_aggregated_view(target, data, words, figureclass, figurevalue, ftype) {
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
	var series = words.map(function(cur, index, _) {
				return {
					lineWidth:1,
					marker:{radius:4},
					name : cur,
					data : docs.map(function(cur2, _, _) {
						var figureIndices = cur2["ftypes"][figureclass][figurevalue];
						var occ = 0;
						var total = 0;
						for (f of figureIndices) {
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
							yvalue = occ / total;
						} catch (err) {
							// console.err;
						} finally {
						};
						// var ret = parseInt(cur2["meta"]["ReferenceDate"]);
						return yvalue; // ret;
					})
				};
			});
			// console.log(series);
	$(target).highcharts(
		{
			chart: {
				type: "line"
			},
			title : null,
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
				categories: docs.map(function(cur, _, _) {
					return cur["meta"]["ReferenceDate"]+" "+cur["meta"]["authors"][0]["Name"] + ": "+cur["meta"]["documentTitle"]+("transl" in cur["meta"]?" (transl.: "+cur["meta"]["translators"][0]["Name"]+")":"");
				})
			}
		}
	);
}

function draw () {
	clean();
	var numWords = 2;
	var words = {};
	var ft = $("#figuretype").val().split(".");
	var vt = $("#valuetype").val();
	if ($("#words_entered:checked").length>0) {
		for (w of $("#words").val().split("\n")) {
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
		for (doc of data) {
			var array = new Object();
			try {
				// console.log(ft);
				for (figIndex of doc["ftypes"][ft[0]][ft[1]]) {
					var figure = doc["figures"][figIndex];
					for (word in figure["freq"]) {
						var p = figure["freq"][word]["pos"]
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
	load_aggregated_view("#tabs", data, Object.keys(words), ft[0], ft[1], vt);
}