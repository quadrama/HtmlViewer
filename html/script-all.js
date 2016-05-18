function load(target, data, words, figureclass, figurevalue, ftype) {
	var docs = [];
	var sp = [];
	for (var i = 0; i < data.length; i++) {
		//console.log(data.docs[i]);
		try {
			if (data.docs[i]["ftypes"][figureclass][figurevalue].length>0) {
				docs.push(data.docs[i]);
			}
		} catch (err) {}
	}
	docs.sort(function(a,b) {
		return parseInt(a.document.ReferenceDate) - parseInt(b.document.ReferenceDate);
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
							total += cur2["figures"][f]["NumberOfWords"];
							occ += cur2["figures"][f]["freq"][cur]["c"];
						}
						// console.log(cur2.document);
						var yvalue = 0;
						try {
							yvalue = occ / total;
						} catch (err) {
							// console.err;
						} finally {
						};
						var ret = {
							x:parseInt(cur2["meta"]["ReferenceDate"]),
							y:yvalue,
							name:cur2["authors"][0]["Name"] + ": "+cur2["meta"]["documentTitle"]+("transl" in cur2?" (transl.: "+cur2["translators"][0]["Name"]+")":"")
						};
						return yvalue; // ret;
					})
				};
			});
			console.log(series);
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
					return cur["document"]["ReferenceDate"]+" "+cur["author"]["Name"] + ": "+cur["document"]["documentTitle"]+("transl" in cur?" (transl.: "+cur["transl"]["Name"]+")":"");
				})
			}
		}
	);
}

function draw () {
	var words = {};
	var ft = $("#figuretype").val();
	var vt = $("#valuetype").val();
	if ($("#words_entered:checked").length>0) {
		for (w of $("#words").val().split("\n")) {
			words[w] = 1;
		}
	}
	if ($("#words_most_frequent:checked").length>0) {
		for (doc of data["docs"]) {
			if (ft in doc["figures"]) {
				var array = Object.keys(doc["figures"][ft]["wordHash"]);
				array.sort(function(a,b) {
					return doc["figures"][ft]["wordHash"][b][vt] - doc["figures"][ft]["wordHash"][a][vt];
				});
				for (var i = 0; i < 2; i++) {
					words[array[i]] = 1;
				}
			}
		}
	}
	
	load("#content", data, Object.keys(words), ft, vt);
}