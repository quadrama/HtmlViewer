describe("Testing object merge", function() {

  it("edge cases", function() {
		var a = {};
		var b = {};
		merge(b,a);
    expect(b).toEqual({});

		b = undefined;
		merge(b,a);
		expect(b).toEqual(undefined);

		b = {};
		a = undefined;
		merge(b,a);
		expect(b).toEqual({});
  });

	it("various 2nd objects", function() {
		var a = {
			key1: "bla",
			key2: 3
		};
		expect(merge(a, {})).toEqual(a);

		expect(merge(a, {key1: "blubb"})).toEqual({
			key1: "blubb",
			key2: 3
		});

		expect(merge({ key1: "bla", key2: 3 },
			{ key1: { key3: "x" } } )
		).toEqual({ key1: { key3: "x" }, key2: 3 });

		expect(merge({key1: null}, {})).toEqual({key1: null});
	});


});


describe("Testing deepcopy", function() {
	it("edge cases", function() {
		var a, b;
		expect(deepcopy(a)).toEqual(a);

		a = {};
		b = deepcopy(a);
		expect(b).toEqual(a);
		expect(b).not.toBe(a);

		a = [];
		b = deepcopy(a);
		expect(b).toEqual(a);
		expect(b).not.toBe(a);

		a = 1;
		b = deepcopy(a);
		expect(b).toEqual(a);
		expect(b).toBe(a);

		a = { x: {} };
		b = deepcopy(a);
		expect(b).toEqual(a);
		expect(b).not.toBe(a);
		expect(b.x).not.toBe(a.x);

		a = { x: undefined };
		b = deepcopy(a);
		expect(b).toEqual(a);
		expect(b).not.toBe(a);
	});

	it("real cases", function() {
		var a, b;

		a = { a: 1, b: "blubb", c: false, d: [] };
		b = deepcopy(a);
		expect(b).toEqual(a);
		expect(b).not.toBe(a);
		expect(b.d).toEqual(a.d);
		expect(b.d).not.toBe(a.d);

	});
});
