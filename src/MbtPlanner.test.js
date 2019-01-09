// var jsdom = require("jsdom");
// const { JSDOM } = jsdom;
// const { window } = new JSDOM();
// const { document } = (new JSDOM('')).window;
// global.document = document;
global.$ = global.jQuery = require("jquery");

var Planner = require('./MbtPlanner');

test('creating empty planner: count', () => {
    let p = new Planner.MbtPlanner("abc"); 
    expect(p.Tasks.length).toBe(0);
});

test('creating 1 ano task planner: count task', () => {
    let p = new Planner.MbtPlanner("abc"); 
	p.AppendTasks([{
		Id: 1, Code: "tcode"
	}]);
    expect(p.Tasks.length).toBe(1);
});

test('creating 1 ano task planner: count resource', () => {
    let p = new Planner.MbtPlanner("abc"); 
	p.AppendTasks([{
		Id: 1, Code: "tcode"
	}]);
    expect(p.Resources.length).toBe(1);
});

test('creating 1 ano task planner: resource id is null', () => {
    let p = new Planner.MbtPlanner("abc"); 
	p.AppendTasks([{
		Id: 1, Code: "tcode"
	}]);
    expect(p.Resources[0].Id).toBe(null);
});

test('creating 1 ano task planner: DueDate is EOW', () => {
    let p = new Planner.MbtPlanner("abc");
    p.AppendTasks([{
        Id: 1, Code: "tcode"
    }]);
    expect(p.Tasks[0].DueDate).toBe(p.GetEOW());
});

describe("delta", function() {
    test('creating 1 ano task planner: delta is empty', () => {
		let p = new Planner.MbtPlanner("abc");
		p.AppendTasks([{
			Id: 1, Code: "tcode"
		}]);
		expect(p.GetDeltas().length).toBe(0);
    });	
	test('creating 1 ano task planner - change completion: delta length is 1', () => {
		let p = new Planner.MbtPlanner("abc");
		p.AppendTasks([{
			Id: 1, Code: "tcode"
		}]);
		p.Tasks[0].Completion = 10;
		expect(p.GetDeltas().length).toBe(1);
    });	
	
	test('creating 1 ano task planner - change completion: delta completion is 10', () => {
		let p = new Planner.MbtPlanner("abc");
		p.AppendTasks([{
			Id: 1, Code: "tcode"
		}]);
		p.Tasks[0].Completion = 10;
		let delta = p.GetDeltas()[0];
		expect(delta.CompletionDelta).toBe(10);
    });	
});

describe("exOrder", function () {
    test("default is null", () => {
        let p = new Planner.MbtPlanner("abc");
        p.AppendTasks([{
            Id: 1, Code: "tcode"
        }]);
        expect(p.Tasks[0].ExOrder).toBe(null);
    });
    test("default initiaExOrder is null", () => {
        let p = new Planner.MbtPlanner("abc");
        p.AppendTasks([{
            Id: 1, Code: "tcode"
        }]);
        expect(p.Tasks[0].InitialExOrder).toBe(null);
    });
    test("is loaded", () => {
        let p = new Planner.MbtPlanner("abc");
        p.AppendTasks([{
            Id: 1, Code: "tcode", ExOrder: 1
        }]);
        expect(p.Tasks[0].ExOrder).toBe(1);
    });
    test("default is loaded", () => {
        let p = new Planner.MbtPlanner("abc");
        p.AppendTasks([{
            Id: 1, Code: "tcode", ExOrder: 1
        }]);
        expect(p.Tasks[0].InitialExOrder).toBe(1);
    });
});

describe("load", function () {
    test('default is 0', () => {
        let p = new Planner.MbtPlanner("abc");
        p.AppendTasks([{
            Id: 1, Code: "tcode"
        }]);
        expect(p.Tasks[0].Load).toBe(0);
    });
    test('is loaded', () => {
        let p = new Planner.MbtPlanner("abc");
        p.AppendTasks([{
            Id: 1, Code: "tcode", Load: 1
        }]);
        expect(p.Tasks[0].Load).toBe(1);
    });
});

describe("completion", function () {

    describe("init", () => {
        test("default is 0", () => {
            let p = new Planner.MbtPlanner("abc");
            p.AppendTasks([{
                Id: 1, Code: "tcode"
            }]);
            expect(p.Tasks[0].Completion).toBe(0);
        });
        test("default initial is 0", () => {
            let p = new Planner.MbtPlanner("abc");
            p.AppendTasks([{
                Id: 1, Code: "tcode"
            }]);
            expect(p.Tasks[0].InitialCompletion).toBe(0);
        });
        test("is loaded", () => {
            let p = new Planner.MbtPlanner("abc");
            p.AppendTasks([{
                Id: 1, Code: "tcode", Completion: 10
            }]);
            expect(p.Tasks[0].Completion).toBe(10);
        });
        test("initial is loaded", () => {
            let p = new Planner.MbtPlanner("abc");
            p.AppendTasks([{
                Id: 1, Code: "tcode", Completion: 10
            }]);
            expect(p.Tasks[0].InitialCompletion).toBe(10);
        });
        test("is caped to 100", () => {
            let p = new Planner.MbtPlanner("abc");
            p.AppendTasks([{
                Id: 1, Code: "tcode", Completion: 150
            }]);
            expect(p.Tasks[0].Completion).toBe(100);
        });
    });

    describe("use Resolution is 16", () => {

        let ls = [
            { l: 1.5, c: 33, e: 1 },
            { l: 1.5, c: 10, e: 2 },
            { l: 1.5, c: 50, e: 1 },
            { l: 0.125, c: 0, e: 1 },
            { l: 0.125, c: 33, e: 1 },
            { l: 0.125, c: 50, e: 0 }
        ];
        ls.forEach((o) => {
            test("prod.length for " + o.l.toString() + " " + o.c.toString() + " => " + o.e.toString(), () => {
                let p = new Planner.MbtPlanner("abc");
                p.AppendTasks([{
                    Id: 1,
                    Code: "tcode",
                    Load: o.l,
                    Completion: o.c
                }]);
                p.Plan("forward", "2018-12-31")
                expect(p.Tasks[0].Production.length).toBe(o.e);
            });
        });
    });

});

describe("handling null id", () => {

    var cases = [
        { name: "null", case: { Id: null, Code: "c" } },
        { name: "undefined", case: { Code: "c" } }
    ];

    cases.forEach(function (o) {
        test(o.name + ": not throw", () => {
            expect(function () {
                var p = new Planner.MbtPlanner("abc");
                p.AppendTasks([o.case]);
            }
            ).not.toThrow();
        });

        test(o.name + ": count is 0", () => {
            let p = new Planner.MbtPlanner("abc");
            p.AppendTasks([o.case]);
            expect(p.Tasks.length).toBe(0);
        });
    });
});

describe("handling null task code", () => {

    var cases = [
        { name: "null", case: { Id: 1, Code: null } },
        { name: "undefined", case: { Id: 1 } }
    ];

    cases.forEach(function (o) {
        test(o.name + ": not throw", () => {
            expect(function () {
                var p = new Planner.MbtPlanner("abc");
                p.AppendTasks([o.case]);
            }
            ).not.toThrow();
        });

        test(o.name + ": count is 0", () => {
            let p = new Planner.MbtPlanner("abc");
            p.AppendTasks([o.case]);
            expect(p.Tasks.length).toBe(0);
        });
    });
    
});

describe("planning", () => {
    function sprod(prods) {
        let sum = 0;
        prods.forEach((o) => {
            sum += o.Production.length;
        });
        return sum;
    };

    test("reducer 1", () => {
        var l = [{ Production: [1] }];
        expect(sprod(l)).toBe(1);
    });

    test("reducer 2", () => {
        var l = [{ Production: [1] }, { Production: [1] }];
        expect(sprod(l)).toBe(2);
    });

    test("reducer 3", () => {
        var l = [{ Production: [1, 2] }, { Production: [1] }];
        expect(sprod(l)).toBe(3);
    });

    var loads = [
        {
            name: "1 task of 1 day",
            tasks: [{
                Id: 0,
                Code: "tcode",
                Load : 1
            }],
            expProdCount : 1,
			expDuration: 1
        },{
            name: "1 task of 0.5 day",
            tasks: [{
                Id: 0,
                Code: "tcode",
                Load: 0.5
            }],
            expProdCount: 1,
			expDuration: 0
        },{
            name: "1 task of 1.5 day",
            tasks: [{
                Id: 0,
                Code: "tcode",
                Load: 1.5
            }],
            expProdCount: 2,
			expDuration: 1
        },{
            name: "2 tasks of 1 day",
            tasks: [{
                Id: 0,
                Code: "tcode",
                Load: 1
                }, {
                    Id: 0,
                    Code: "tcode",
                    Load: 1
                }],
            expProdCount: 2,
			expDuration: 2
        }, {
            name: "2 tasks of 1.5 day",
            tasks: [{
                Id: 0,
                Code: "tcode",
                Load: 1.5
            }, {
                Id: 1,
                Code: "tcode",
                Load: 1.5
            }],
            expProdCount: 4,
			expDuration: 3
        }, {
            name: "3 tasks of 0.3 0.4 0.8 day",
            tasks: [{
                Id: 0,
                Code: "tcode",
                Load: 0.3
            }, {
                Id: 1,
                Code: "tcode",
                Load: 0.4
            }, {
                Id: 1,
                Code: "tcode",
                Load: 0.8
            }],
            expProdCount: 4,
			expDuration: 1
        }, {
            name: "5 tasks of 0.3 0.4 0.8 1.5 3.3 day (2 closed day)",
            tasks: [{
                Id: 0,
                Code: "tcode",
                Load: 0.3
            }, {
                Id: 1,
                Code: "tcode",
                Load: 0.4
            }, {
                Id: 2,
                Code: "tcode",
                Load: 0.8
            }, {
                Id: 3,
                Code: "tcode",
                Load: 1.5
            }, {
                Id: 4,
                Code: "tcode",
                Load: 3.3
            }],
            expProdCount: 10,
			expDuration: 8
        }
    ];    

    loads.forEach((o) => {
        test("prod count for " + o.name, () => {
            let p = new Planner.MbtPlanner("abc");
            p.AppendTasks(o.tasks);
            p.Plan("forward", "2018-12-31");            
            expect(sprod(p.Tasks)).toBe(o.expProdCount);
        })
    });
	
	loads.forEach((o) => {
        test("period for " + o.name, () => {			
            let p = new Planner.MbtPlanner("abc");
            p.AppendTasks(o.tasks);
            p.Plan("forward", "2018-12-31");            
            expect((p.MaxDate.valueOf() - p.MinDate.valueOf()) / 864E5).toBe(o.expDuration);
        })
    });

    loads.forEach((o) => {
        test("1_OOWD prod count for " + o.name, () => {
            let p = new Planner.MbtPlanner("abc");
            p.AppendTasks(o.tasks);
            p.AppendOutOfWorkDay(null, "2019-01-01");
            p.Plan("forward", "2018-12-31");
            expect(sprod(p.Tasks)).toBe(o.expProdCount);
        })
    });

    loads.forEach((o) => {        
        test("1_OOWD period for " + o.name, () => {
            let p = new Planner.MbtPlanner("abc");
            p.AppendTasks(o.tasks);
            p.AppendOutOfWorkDay(null, "2019-01-01");
            p.Plan("forward", "2018-12-31");
            expect((p.MaxDate.valueOf() - p.MinDate.valueOf()) / 864E5).
                toBe(o.expDuration >= 1 ? o.expDuration + 1 : o.expDuration);
        })
    });    
});


describe("IsOutOfWorkDay", () => {
    test("true from specific OOW", () => {
        let p = new Planner.MbtPlanner("abc");        
        expect(p.IsOutOfWorkDay(
            Planner.mbtpGetDate("2019-01-01"),
            { OutOfWorkDays: [Planner.mbtpGetDate("2019-01-01")] })).toBe(true);
    });
    test("true from general OOW", () => {
        let p = new Planner.MbtPlanner("abc");
        p.AppendOutOfWorkDay("*", "2019-01-01");
        expect(p.IsOutOfWorkDay(
            Planner.mbtpGetDate("2019-01-01"),
            { OutOfWorkDays: [] })
        ).toBe(true);
    });
});

describe("AddToWorkableDay", () => {
    test("0 from mardi", () => {
        let p = new Planner.MbtPlanner("abc");
        var r = p.GetResource(1);
        var d = p.AddToWorkableDay("2019-01-01", 0, r);
        expect(d.valueOf()).toBe(Planner.mbtpGetDate("2019-01-01").valueOf());
    });
    test("1 from mardi", () => {
        let p = new Planner.MbtPlanner("abc");
        var r = p.GetResource(1);
        var d = p.AddToWorkableDay("2019-01-01", 1, r);
        expect(d.valueOf()).toBe(Planner.mbtpGetDate("2019-01-02").valueOf());
    });
    test("1 from vendredi (5) isoClosed(6,7)", () => {
        let p = new Planner.MbtPlanner("abc");
        var r = p.GetResource(1);
        var d = p.AddToWorkableDay("2019-01-04", 1, r);
        expect(d.valueOf()).toBe(Planner.mbtpGetDate("2019-01-07").valueOf());
    });
    test("0 from specific OOW", () => {
        let p = new Planner.MbtPlanner("abc");
        var r = p.GetResource(1);
        p.AppendOutOfWorkDay(1, "2019-01-01");
        var d = p.AddToWorkableDay("2019-01-01", 0, r);
        expect(d.valueOf()).toBe(Planner.mbtpGetDate("2019-01-02").valueOf());
    });
    test("0 from general OOW", () => {
        let p = new Planner.MbtPlanner("abc");
        p.AppendOutOfWorkDay("*", "2019-01-01");
        var r = p.GetResource(1);
        var d = p.AddToWorkableDay("2019-01-01", 0, r);
        expect(d.valueOf()).toBe(Planner.mbtpGetDate("2019-01-02").valueOf());
    });
    test("1 from specific OOW", () => {
        let p = new Planner.MbtPlanner("abc");
        var r = p.GetResource(1);
        p.AppendOutOfWorkDay(1, "2019-01-01");
        var d = p.AddToWorkableDay("2019-01-01", 1, r);
        expect(d.valueOf()).toBe(Planner.mbtpGetDate("2019-01-03").valueOf());
    });
    test("1 from general OOW", () => {
        let p = new Planner.MbtPlanner("abc");
        p.AppendOutOfWorkDay("*", "2019-01-01");
        var r = p.GetResource(1);
        var d = p.AddToWorkableDay("2019-01-01", 1, r);
        expect(d.valueOf()).toBe(Planner.mbtpGetDate("2019-01-03").valueOf());
    });
    test("1 with specific OOW", () => {
        let p = new Planner.MbtPlanner("abc");
        var r = p.GetResource(1);
        p.AppendOutOfWorkDay(1, "2019-01-01");
        var d = p.AddToWorkableDay("2018-12-31", 1, r);
        expect(d.valueOf()).toBe(Planner.mbtpGetDate("2019-01-02").valueOf());
    });
    test("1 with general OOW", () => {
        let p = new Planner.MbtPlanner("abc");
        var r = p.GetResource(1);
        p.AppendOutOfWorkDay("*", "2019-01-01");
        var d = p.AddToWorkableDay("2018-12-31", 1, r);
        expect(d.valueOf()).toBe(Planner.mbtpGetDate("2019-01-02").valueOf());
    });
});
