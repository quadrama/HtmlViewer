function ChartTableView(target, userSettings) {
	var contentArea = $(target);
	var defaultSettings = {
		columns: [],
		chart: {
			title: {text: null},
			chart: {
				polar: false,
				type: "column",
			},
			colors: ["#000", "#A00", "#0A0", "#00A", "#AA0", "#0AA", "#A0A"],
			//pane: { size: "90%" },
			config: {
				normalize: true,
				hide: function(d) { return false; },
				type: "columnwise",
				pointPlacement: null
			},
			yAxis: {},
			xAxis: { lineWidth:1 },
		},
		active:0
	};
	var keys = [];
	var settings = {};
	var wsize = 1000;
	var currentData;
	var dTable;
	var chartElement;
	var chart;
	var chartXCategories = [];
	init();

	var api = {
		clear:clear,
		load:load,
		refresh:refresh,
		update:update,
		set:set
	};

	return api;

	function set(o) {
		settings = merge(defaultSettings, userSettings);
	}

	function init() {

		settings = merge(defaultSettings, userSettings);

		keys = settings.columns.map(function(cur) {return cur.data;});

		dTable = contentArea.find("table");
		chartElement = contentArea.find(".chart");
		// create header row
		var row = document.createElement("tr");
		settings.columns.forEach(function (col, index2, array2) {
			$(row).append("<th>"+col.title+"</th>");

		});
		dTable.children("thead").append(row);

		// create the chart
		var chartSeries = settings.columns.filter(function (d) { return d.type === "numeric"; });
		var ch = {
			title: settings.chart.title,
			pane: settings.chart.pane,
			colors: settings.chart.colors,
			chart: settings.chart.chart,
			xAxis: settings.chart.xAxis,
			yAxis: settings.chart.yAxis,
			series: chartSeries.map(function (k) {
				return {
					id: k.data,
					name: k.title,
					data: []
				};
			})
		};
		console.log(ch);
		chart = chartElement.highcharts(ch).highcharts();

		contentArea.enhanceWithin();
	}

	function load(data) {
	 	// console.log(data);
		currentData = data;

		// for normalizing in the chart
		// (otherwise, it gets unreadable)
		var maxValues = {};
		for (var key of keys) {
			maxValues[key] = 0;
		}

		// find out the maximal value for each category
		if (settings.chart.config.normalize)
			var mydata = data.map(function(cur) {
				for (var si in maxValues) {
					var v = cur[si];
					if (cur.NumberOfWords > wsize && v > maxValues[si])
						maxValues[si] = v;
					}
			});

		// fill table
		data.forEach(function (current, index, array) {
			var row = document.createElement("tr");
			settings.columns.forEach(function (col, index2, array2) {
				var cell = document.createElement("td");
				$(cell).text(current[col.data]);
				$(row).append(cell);
			});
			dTable.children("tbody").append(row);
		});
		dTable.table( "rebuild" );

		// create the chart
		var series;
		var categories;

		if (settings.chart.config.type === "rowwise") {
			// rows become series
			series = data.map(function (cur, ind, arr) {
				return {
					name: cur[keys[0]],
					pointPlacement: settings.chart.config.pointPlacement,
					lineWidth: 2,
					visible: !settings.chart.config.hide(cur),
					data: keys.slice(1).map(function (k) {
						return (settings.chart.config.normalize ?
							cur[k] / maxValues[k] :
							cur[k]);
					})
				};
			});
			categories = settings.columns.slice(1).map(function (k) {
				return k.title;
			});
		} else {
			// columns become series
			series = settings.columns
				.filter(function (d) { return d.type === "numeric"; })
				.map(function(current) {
					var d = [];
					for (var row of data) {
						d.push({
							category: row.id,
							y: row[current.data]
						});
					}
					return {
						name:current.title,
						data:d
					};
				});
			categories = data.map(function (row) {
				return row[settings.chart.config.categoryKey];
			});
		}


		var ch = {
			title: settings.chart.title,
			pane: settings.chart.pane,
			colors: settings.chart.colors,
			chart: settings.chart.chart,
			xAxis: {
				categories: categories,
				lineWidth: settings.chart.xAxis.lineWidth
			},
			yAxis: settings.chart.yAxis,
			series: series
		};
		// console.log(ch);
		chart = chartElement.highcharts(ch).highcharts();
	}

	function clear() {
		chartElement.empty();
		// dTable.clear();
	}

	function refresh() {
		clear();
		load(currentData);
	}

	function update() {
		//chart.setSize(chartElement.innerWidth(), chartElement.innerHeight());
		 chart.reflow();
	}
}
