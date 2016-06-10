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
		merge(a, {});
		expect(a).toEqual({
			key1: "bla",
			key2: 3
		});

	});


});
