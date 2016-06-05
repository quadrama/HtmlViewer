function ChartTableView(target, userSettings) {
	var contentArea = $(target);
	var defaultSettings = {
		columns: [],
		chart: {
			title: null,
			chart: {
				polar: false,
				type: "column",
				width: contentArea.innerWidth()-100
			},
			colors: ["#000", "#A00", "#0A0", "#00A", "#AA0", "#0AA", "#A0A"],
			pane: { size: "90%" },
			config: {
				normalize: true,
				hide: function(d) { return false; }
			},
			yAxis: {},
			xAxis: { lineWidth:1 },
		}
	};
	var keys = [];
	var settings = {};
	var wsize = 1000;
	var currentData;
	init();

	var api = {
		clear:clear,
		load:load
	};

	return api;

	function init() {

		settings = Object.create(defaultSettings);
		merge(settings, userSettings);


		contentArea.append("<h3>Chart</h3>");
		chart = $(document.createElement("div"));
		chart.appendTo(contentArea);
		contentArea.append("<h3>Table</h3>");
		contentArea.append("<div><table></table></div>");

		keys = settings.columns.map(function(cur) {return cur.data;});

		dTable = contentArea.find("table").DataTable({
			columns: settings.columns,
			pageLength: 100
		});
	}

	function load(data) {
		console.log(data);
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


		// create the chart
		var ch = {
			title: settings.chart.title,
			pane: settings.chart.pane,
			colors: settings.chart.colors,
			chart: settings.chart.chart,
			xAxis: {
				categories: settings.columns.slice(1).map(function (k) {
					return k.title;
				}),
				lineWidth: settings.chart.xAxis.lineWidth
			},
			yAxis: settings.chart.yAxis,
			series: data.map(function (cur, ind, arr) {
				return {
					name: cur[keys[0]],
					pointPlacement: 'on',
					lineWidth: 2,
					visible: !settings.chart.config.hide(cur),
					data: keys.slice(1).map(function (k) {
						return (settings.chart.config.normalize ?
							cur[k] / maxValues[k] :
							cur[k]);
					})
				};
			})
		};
		console.log(ch);
		chart.highcharts(ch);

		dTable.rows.add(data).draw();
		contentArea.accordion({
			heightStyle: "content"
		});
	}

	function clear() {
		chart.empty();
		dTable.clear();
	}
}
