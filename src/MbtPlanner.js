
/**
 * @module MbtPlanner
 * @author thierry.schmit@gmail.com
 * @copyright Cabinet Camus Lebkiri (2019)
 * @license MIT
 * 
 * @overview dependencies:
 *    - required
 *        - jquery
 *    - optional
 *        - moment https://github.com/moment/moment/ 
 *        
 *  [samples](http://planner.madbuildertools.com/)
 */

(function (exports) {
    "use strict";

    var _endOfTheWorld = new Date("2500-01-01");

    /**
     * @constructor
     * @param {any} id Unique identifier of a DOM element that will be used as placeholder for the planner
     */
    var MbtPlanner = function (id) {
        if (window.jQuery === undefined) {
            throw "jQuery required for MbtPlanner";
        }

        if (!id.startsWith("#"))
            id = "#" + id;
        this.Id = id;
        this.ResetPlanner();
        this.ClosedIsoDays = [6, 7];
        this.OutOfWorkDays = [];
        this.ProgressStep = 25;
        this.DefaultLoads = [];
        this.FirstIsoDayOfWeek = 1;  
        this.TodayChar = "+";
        /**
         * @property {function} CustomFormatter function that returns a string from a Task object. Default:
         * 
         *     (task) => task.IRef + ": " + task.Code
         * */
        this.CustomFormatter = null;
        /**
         * @property {function} CustomResourceFooter function that returns a string from a Resource object, and load aggregated value. Default:
         * 
         *     (r, load) => r.Id.toString() + ": " + load.toFixed(2)
         * */
        this.CustomResourceFooter = null;
        //gestion d'erreur d'arrondie, on ne planifie pas cette fraction de jour:
        this.Resolution = 16;

        this.fontSize = 12;
        this.dayWidth = 15; 
        //css inline line-height for the component
        this.dayHeight = 15;

        //for the svg experimental version
        this.dayWGutter = 2;
        this.dayHGutter = 2;
    };

    MbtPlanner.prototype.GetEOW = () => _endOfTheWorld;

    /**
     * Reset the planner, that is set Tasks and Resources to empty arrays.*/
    MbtPlanner.prototype.ResetPlanner = function () {
        $(this.Id).html("");
        this.Tasks = [];
        this.Resources = [];
        this.MinDueDate = _endOfTheWorld;
        this.MaxDueDate = null;
        this.MaxDate = null;
        this.MinDate = null;
    };  

    /**
     * @returns {array} Only altered tasks are returned. If the array is empty, then no task was altered.
     * 
     *     {
     *       Id:                 identifier of the task
     *       InitialCompletion:  float, the initial value of the completion
     *       CompltetionDelta:   float, the variation of the completion
     *       InitialExOrder:     int, the initial value of the rank of the task.
     *       ExOrderDelta:       int, the variation of the rank.
     *     }
     * 
     */
    MbtPlanner.prototype.GetDeltas = function () {
        var deltas = [];
        this.Tasks.forEach(function (o) {
            if (o.InitialExOrder - o.ExOrder !== 0 || o.InitialCompletion !== o.Completion) {
                deltas.push({
                    Id: o.Id,
                    InitialCompletion: o.InitialCompletion,
                    CompletionDelta: o.Completion - o.InitialCompletion,
                    InitialExOrder: o.InitialExOrder,
                    ExOrderDelta: o.ExOrder - o.InitialExOrder
                });
            }
        });

        return deltas;
    };  

    MbtPlanner.prototype.FormatTaskHeader = function (task) {
        try {
            if (this.CustomFormatter !== null) {
                return this.CustomFormatter(task);
            }
            return task.IRef + ": " + task.Code
        } catch (err) {
            return "formatting error";
        }
    };

    MbtPlanner.prototype.FormatResourceFooter = function (r, load) {
        try {
            if (this.CustomResourceFooter !== null) {
                return this.CustomResourceFooter(r);
            }
            return r.Id.toString() + ": " + load.toFixed(2);
        } catch (err) {
            return "formatting error";
        }
    };

    MbtPlanner.prototype.LastIsoDayOfWeek = function () {
        return (this.FirstIsoDayOfWeek - 1) || 7;
    };    

    MbtPlanner.prototype.GetIsoWeekForWeekStartingAt = function (jsDate) {
        if (this.FirstIsoDayOfWeek !== 1)
            jsDate = new Date(jsDate.valueOf() + (8 - this.FirstIsoDayOfWeek) * 864E5);
        if (window.moment !== undefined) {
            var m = moment(dateToString(jsDate));
            return m.isoWeek();
        }

        var d = new Date(Date.UTC(jsDate.getFullYear(), jsDate.getMonth(), jsDate.getDate()));
        var dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 864E5) + 1) / 7)
    };

    /**
     * @async
     * @see {@link ResetPlanner}
     */
    MbtPlanner.prototype.ResetPlannerAsync = function () {
        return new Promise(function (resolve, reject) {
            this.ResetPlanner();
            resolve(true);
        }.bind(this));
    };   

    /**
     * Short for aysnc load task, then plan, then draw
     * 
     *     await r.QueryPlanAndDrawAsync(
     *       {
     *         url: "/DeadLine/ForPlanner/",
     *         data: {
     *           id: $("#@plannedUserId").val().toString(),
     *           period: $("#@plannedPeriodId").val().toString()
     *         }
     *       },
     *       function (r) { return r.ExitCode !== undefined },
     *       function (r) { return r.ExitCode === 0; },
     *       function (r) { appendMessage("res", "Something is wrong: " + r.ExitCode.toString(), "warning"); },
     *       function () { appendMessage("res", "Something is wrong, but I don't know what!", "danger"); },
     *       function (p) {
     *         p.AppendOutOfWorkDay(51, "2019-01-02");
     *       }
     *     );
     * 
     * A json return **comprising a `Data` member** as an array of [appendable tasks](#AppendTasks) is expected.
     * 
     * @async
     * @param {function} queryObject a jquery object for an ajax request. Param is the return of the ajax call.
     * @param {function} successEval a function to evaluate if the ajax call was successfull. Param is the return of the ajax call.
     * @param {function} businessSuccessEval a function to evaluate if the call was successfull from the server point of view. Param is the return of the ajax call.
     * @param {function} businessError a function to handle the business error. Param is the return of the ajax call.
     * @param {function} error a function to handle the not recoverble errors. No Param.
     * @param {function} beforePlan. A function to setup the planner before the call to Plan, but after the call to AppendTasks. Param: the planner.
     */
    MbtPlanner.prototype.QueryPlanAndDrawAsync = function (
        queryObject, successEval, businessSuccessEval,
        businessError, error, beforePlan
    ) {
        return Promise.all([
            this.ResetPlannerAsync(),
            $.ajax(queryObject)
        ]).then(function (values) {
            var dl = values[1];
            if (successEval(dl)) {
                if (businessSuccessEval(dl)) {
                    this.AppendTasks(dl.Data, this.DefaultLoads);
                    if (beforePlan !== undefined) {
                        beforePlan(this);
                    }
                    this.Plan("forward");
                    this.Draw(Date.now());
                } else {
                    businessError(dl);
                }
            } else {
                error();
            }
        }.bind(this));
    };

    /**
     * Draw the planner in the DOM. 
     * @param {(date|string)} drawMinDate the almost first date displayed. The first date displayed is always the first day of a week.
     * @param {string} mode "html" or "html". Default: "html".
     */
    MbtPlanner.prototype.Draw = function (drawMinDate, mode) {
        var perf_startDrawing = Date.now();
        if (this.MaxDate === null) {
            $(this.Id + " .Planning").html("<p>Nothing to display</p>");
            return;
        }

        if (mode === undefined || mode === null) {
            mode = "html;"
        }

        if (!$(this.Id).hasClass("MbtPlanner"))
            $(this.Id).addClass("MbtPlanner");
        $(this.Id).html("<div style='font-size:" + this.fontSize.toString() + "px;line-height:" + this.dayHeight.toString() + "px'><div style='display: flex;'><div class='Tasks'></div><div class='Planning'></div></div><div class='Messages'></div></div>");

        if (drawMinDate === undefined || drawMinDate === null) {
            drawMinDate = this.LastDrawMinDate;
        } else {
            this.LastDrawMinDate = drawMinDate;
        }

        var startDate =
            drawMinDate === undefined || drawMinDate === null ?
                this.MinDate > this.MinDueDate ? this.MinDueDate : this.MinDate :
                getDate(drawMinDate);

        while (getIsoDay(startDate) !== this.FirstIsoDayOfWeek) {
            startDate = new Date(startDate.valueOf() - 864E5)
        }
        var drawMaxDate = this.MaxDate;
        var weekCount = Math.ceil((this.MaxDate.valueOf() - startDate.valueOf()) / (7 * 864E5));
        this.Resources.forEach(function (r) {
            r.OutOfWorkDays.forEach(function (d) {
                if (d > drawMaxDate)
                    drawMaxDate = d;
            });
        });
        while (getIsoDay(drawMaxDate) !== this.LastIsoDayOfWeek()) {
            drawMaxDate = new Date(drawMaxDate.valueOf() + 864E5);
        }
        var dtn = getDate(Date.now());

        let t = null; //la table
        let ld = null; //variable date
        let weekOfYear = null;
        switch (mode) {
            case "svg-experimental":
                if (this.DrawSvgTasks === undefined) {
                    throw "svg not found";
                }
                this.DrawSvgTasks(weekCount, startDate);                
                break;
            default:
                t = $("<table style='border-collapse:separate;border-spacing:1px 1px'><thead><tr><th>Tasks</th><th style='width:40px'></th><th style='width:30px'></th></tr>" +
                    "</thead><tbody></tbody></table>");
                var h = t.find("thead").first();
                var b = t.find("tbody").first();
                var loadSum = 0.0;

                for (var i = 0; i < this.Tasks.length; i++) {
                    var isLastForUser = false;
                    if (i === this.Tasks.length - 1) {
                        isLastForUser = true;
                    } else {
                        if (this.Tasks[i].Resource === null) {
                            if (this.Tasks[i + 1].Resource !== null) {
                                isLastForUser = true;
                            }
                        } else {
                            if (this.Tasks[i + 1].Resource === null) {
                                isLastForUser = true;
                            } else {
                                if (this.Tasks[i].Resource.Id !== this.Tasks[i + 1].Resource.Id) {
                                    isLastForUser = true;
                                }
                            }
                        }
                    }
                    let taskHead = "<div class='PBar' style='width: " + this.Tasks[i].Completion.toString() + "%'>" + this.FormatTaskHeader(this.Tasks[i]) + "</div>";

                    loadSum += (this.Tasks[i].Load * (1 - this.Tasks[i].Completion / 100));
                    let r = $("<tr data-taskid='" + this.Tasks[i].Id.toString() + "'><td>" + taskHead + "</td>" +
                        "<td>" + (this.Tasks[i].Load * (1 - this.Tasks[i].Completion / 100)).toFixed(2) + "</td>" +
                        "<td>" + (!isLastForUser ? "<span class='ActionB Back'>↓</span>" : "") + "<span class='ActionB Complete'>&gt;</span>" + "</td></tr>");

                    r.on('click', 'td:last-child span.Back', function (e) {
                        var r = $(e.target).closest('tr');
                        var taskId = r.data("taskid");
                        var i = this.Tasks.findIndex(function (t) { return t.Id === taskId; });
                        if (i !== -1 && i !== this.Tasks.length - 1) {
                            var j = this.Tasks[i].ExOrder;
                            this.Tasks[i].ExOrder = this.Tasks[i + 1].ExOrder;
                            this.Tasks[i + 1].ExOrder = j;
                            this.Plan();
                            this.Draw();
                        }
                    }.bind(this));
                    r.on('click', 'td:last-child span.Complete', function (e) {
                        var r = $(e.target).closest('tr');
                        var taskId = r.data("taskid");
                        var i = this.Tasks.findIndex(function (t) { return t.Id === taskId; });
                        if (this.Tasks[i].InitialCompletion !== 100) {
                            if (this.Tasks[i].Completion !== 100) {
                                this.Tasks[i].Completion += this.ProgressStep;
                                if (this.Tasks[i].Completion > 100)
                                    this.Tasks[i].Completion = 100;
                            } else {
                                this.Tasks[i].Completion = this.Tasks[i].InitialCompletion;
                            }
                            this.Plan();
                            this.Draw();
                        }

                    }.bind(this));

                    b.append(r);

                    if (isLastForUser) {
                        b.append("<tr><td colspan='2' style='text-align:right;'>" +
                            this.FormatResourceFooter(this.Tasks[i].Resource, loadSum) 
                            + "</tr>");
                        loadSum = 0;
                    }
                }
                $(this.Id + " .Tasks").html(t);

                var perf_DrawingTasksDuration = Date.now() - perf_startDrawing;                

                t = $("<table style='border-collapse:separate;border-spacing:1px 1px'><thead></thead><tbody></tbody><tfoot></tfoot></table>");
                h = t.find("thead").first();
                b = t.find("tbody").first();
                var f = t.find("tfoot").first();

                t.css("width", (this.dayWidth) * (weekCount * 7).toString() + "px");

                ld = startDate;
                let r = "<tr>";
                weekCount = 0;
                
                weekOfYear = this.GetIsoWeekForWeekStartingAt(ld);                

                while (ld <= drawMaxDate) {
                    r += "<th colspan='7'>" + weekOfYear.toString() + " : " + dateToString(ld) + "</th>";
                    ld = new Date(ld.valueOf() + 7 * 864E5);
                    weekCount++;
                    weekOfYear++;
                    if (weekOfYear > 52) {
                        weekOfYear = this.GetIsoWeekForWeekStartingAt(ld);
                    }
                }
                h.append(r + "</tr>");
                f.append(r + "</tr>");                
                var baseDate = startDate,
                    baseRow = "<tr>",
                    prevResourceId = -12587;

                let isTaskSpecific = false;
                for (i = 0; i < this.Tasks.length; i++) {
                    let curTask = this.Tasks[i];
                    if (curTask.Resource.Id !== prevResourceId) {
                        if (prevResourceId !== -12587) {
                            b.append("<tr><td></td></tr>");
                        }
                        prevResourceId = curTask.Resource.Id;
                        baseDate = startDate;
                        baseRow = "<tr>";                        
                    }
                    let ld = baseDate;
                    if (curTask.Production.length > 0) {
                        isTaskSpecific = false;
                    } else {
                        isTaskSpecific = true;
                    }
                    let r = baseRow;
                    var isToday = "";
                    while (ld <= drawMaxDate) { //endDate
                        isToday = ld.valueOf() === dtn.valueOf() ? this.TodayChar : "";
                        if (ld.valueOf() === curTask.DueDate.valueOf()) {
                            if (!isTaskSpecific) {
                                isTaskSpecific = true;
                                baseRow = r;
                                baseDate = ld;
                            }
                            if (this.IsOutOfWorkDay(ld, curTask.Resource)) {
                                r += "<td class='DueDateOO'>" + isToday + "</td>";
                            } else {
                                r += "<td class='DueDate'>" + isToday + "</td>";
                            }
                        } else if (!this.IsOpenDay(ld, curTask.Resource)) {
                            r += "<td class='Closed'>" + isToday + "</td>";
                        } else if (this.IsProductionDay(ld, curTask)) {
                            if (!isTaskSpecific) {
                                isTaskSpecific = true;
                                baseRow = r;
                                baseDate = ld;
                            }
                            if (ld > curTask.DueDate) {
                                r += "<td class='AfterDueDate'>" + isToday + "</td>";
                            } else {
                                if (curTask.Resource.BC !== undefined && curTask.Resource.BC !== "") {
                                    r += "<td style='background-color:" + curTask.Resource.BC + ";'/>";
                                } else {
                                    r += "<td class='Worked'>" + isToday + "</td>";
                                }
                            }
                        } else if (this.IsOutOfWorkDay(ld, curTask.Resource)) {
                            r += "<td class='OutOfWork'>" + isToday + "</td>";
                        } else {
                            r += "<td>" + isToday + "</td>";
                        }

                        ld = new Date(ld.valueOf() + 864E5);
                    }
                    b.append($(r + "</tr>"));
                }
                b.append("<tr><td></td></tr>");
                $(this.Id + " .Planning").html(t);
                break;
        }

        this.DrawingDuration = Date.now() - perf_startDrawing;
        $(this.Id + " .Messages").html(
            "Planning duration: " + this.PlanningDuration.toString() + ", Drawing duration: " +
            perf_DrawingTasksDuration.toString() + " + " +
            (this.DrawingDuration - perf_DrawingTasksDuration).toString());
    };    

    MbtPlanner.prototype.IsProductionDay = function (day, task) {
        return task.Production.findIndex(function (d) { return d.valueOf() === day.valueOf() }) !== -1;
    };

    MbtPlanner.prototype.IsOpenDay = function (date, resource) {
        var d = getIsoDay(date);
        if (this.ClosedIsoDays.indexOf(d) !== -1)
            return false;
        if (resource.ClosedIsoDays.indexOf(d) !== -1)
            return false;
        return true;
    };

    MbtPlanner.prototype.IsOutOfWorkDay = function (date, resource) {
        var r =
            (this.OutOfWorkDays.findIndex(function (d) { return d.valueOf() === date.valueOf(); }) !== -1) ||
            (resource.OutOfWorkDays.findIndex(function (d) { return d.valueOf() === date.valueOf(); }) !== -1);
        return r;
    };    

    MbtPlanner.prototype.AddToWorkableDay = function (date, days, resource) {
        date = getDate(date);
        if (typeof (days) === "string") {
            days = parseInt(days);
        }
        
        if (days < 0) {
            while (current > date) {
                if (!this.IsOpenDay(current, resource))
                    date = new Date(date.valueOf() - 864E5);
                current = new Date(current.valueOf() - 864E5);
            }
            while (!this.IsOpenDay(date, resource))
                date = new Date(date.valueOf() - 864E5);
        } else {
            while (!this.IsOpenDay(date, resource) || this.IsOutOfWorkDay(date, resource)) {
                date = new Date(date.valueOf() + 864E5);
            }
            var current = date;
            date = new Date(date.valueOf() + days * 864E5);            
            while (current < date) {
                if (!this.IsOpenDay(date, resource) || this.IsOutOfWorkDay(date, resource)) {
                    date = new Date(date.valueOf() + 864E5);
                }
                current = new Date(current.valueOf() + 864E5);
            }
        }
        return date;
    };

    MbtPlanner.prototype.GetResource = function (id) {
        if (id === undefined) {
            id = null;
        }
        let resource = this.Resources.find(function (e) {
            return e.Id === id;
        });
        if (resource === undefined) {
            resource = {
                Id: id,
                OutOfWorkDays: [],
                ClosedIsoDays: []
            };
            this.Resources.push(resource);
        }
        return resource;
    }

    /**
     * Append an array of tasks to the planner.
     * @param {array} tasks an array of appendable task object.
	 *
	 *     {
	 *       Id:         not null, unique identifier of the task. task silently ignored if not set
	 *       Code:       not null, task type identifier. task silently ignored if not set
	 *
	 *       ResourceId: can be null, unique identifier of a resource
	 *       Label:      can be null, default : "", not used but in CustomFormatter
	 *       IRef:       can be null, default : "", case identifier
	 *       DueDate:    can be null, date yyyy-MM-dd or json date
	 *       Load:       can be null, float, default : 0, float the whole load (in day) for the task
	 *                       => can be set by Code and this.DefaultLoads = [ {
	 *                           Code : not null
	 *                           Load : not null, float
	 *                       }]
	 *       Completion: can be null, default : 0, % of completion of the task,
	 *                       => load to be planned = Load * ( 1 - Completion / 100),
	 *       ExOrder:    can be null, int, default null
	 *
	 *       OTask:      the original object, may be used by CustomFormatter
	 *     }
     *
     * @param {array} codes can be null. Default load for task code.
     * 
     *     {
     *       Code:       not null
     *       Load:       not null, float
     *     }
     * 
     * @description Append a list of tasks to the planner and create the associated resources.
     * there is no other way to append a resource to the planner.
     */
    MbtPlanner.prototype.AppendTasks = function (tasks, codes) {
        for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].Id === undefined || tasks[i].Id === null) {
                continue;
            }
            if (tasks[i].Code === undefined || tasks[i].Code === null) {
                continue;
            } 
            let resource = this.GetResource(tasks[i].ResourceId);//.bind(this);
            var dd = null;
            if (tasks[i].DueDate !== undefined && tasks[i].DueDate !== null) {
                dd = getDate(tasks[i].DueDate);
                while (!this.IsOpenDay(dd, resource))
                    dd = new Date(dd.valueOf() + 864E5);
                if (this.MaxDueDate === null || dd > this.MaxDueDate) {
                    this.MaxDueDate = dd;
                }
                if (dd < this.MinDueDate) {
                    this.MinDueDate = dd;
                }
            }
            if (tasks[i].Load === undefined || tasks[i].Load === null) {
                var l = 0;
            } else {
                if (typeof (tasks[i].Load) === "string") {
                    l = parseFloat(tasks[i].Load);
                } else {
                    l = tasks[i].Load;
                }
            }
            if (tasks[i].IRef === undefined || tasks[i].IRef === null) {
                var iref = "";
            } else {
                iref = tasks[i].IRef;
            }
            if (tasks[i].Completion === undefined || tasks[i].Completion === null) {
                var completion = 0;
            } else {
                completion = parseFloat(tasks[i].Completion);
                if (completion > 100)
                    completion = 100;
            }
            if (tasks[i].ExOrder === undefined || tasks[i].ExOrder === null) {
                var eo = null;
            } else {
                if (typeof (tasks[i].ExOrder) === "string") {
                    eo = parseInt(tasks[i].ExOrder);
                } else {
                    eo = tasks[i].ExOrder;
                }
            }
            var t = {
                Id: tasks[i].Id,
                Resource: resource,
                Label: tasks[i].Label,
                IRef: iref,
                Code: tasks[i].Code,
                DueDate: dd,
                InitialExOrder : eo,
                ExOrder: eo,
                Load: l,
                StartDate: null,
                EndDate: null,
                //Completion éditée via le planner
                Completion: completion,
                //completion déclarée par la source de données
                InitialCompletion: completion,

                OTask: tasks[i]
            };
            if (t.DueDate === null)
                t.DueDate = _endOfTheWorld;
            if (t.Load === 0) {
                if (codes !== undefined && codes !== null) {
                    let c = codes.find(function (o) { return o.Code === t.Code; })
                    t.Load = (c !== undefined) ? c.Load : 0;
                }
            }
            this.Tasks.push(t);
        }
    };

    MbtPlanner.prototype.SortTasks = function () {
        this.Tasks.sort(function (a, b) {
            if (a.Resource !== null) {
                if (b.Resource !== null) {
                    if (a.Resource.Id !== b.Resource.Id) {
                        if (a.Resource.Id < b.Resource.Id)
                            return -1;
                        return 1;
                    }
                } else {
                    return -1;
                }
            } else {
                if (b.Resource !== null)
                    return 1;
            }
            if (a.ExOrder !== null) {
                if (b.ExOrder !== null) {
                    if (a.ExOrder !== b.ExOrder) {
                        if (a.ExOrder < b.ExOrder)
                            return -1;
                        return 1;
                    }
                } else {
                    return -1;
                }
            } else {
                if (b.ExOrder !== null)
                    return 1;
            }
            if (a.DueDate !== _endOfTheWorld) {
                if (b.DueDate !== _endOfTheWorld) {
                    if (a.DueDate < b.DueDate)
                        return -1;
                    return 1;
                } else {
                    return -1;
                }
            } else {
                if (b.DueDate !== _endOfTheWorld)
                    return 1;
            }
            return 0;
        });
    };

    /**
     * Append an out of work day
     * @param {?("*"|any)} resourceId an idnetifier of the resource. If "*" then you alter `this.OutOfWorkDays`.
     * @param {!(date|string)} day string may be a json serailized date or a "yyyy-mm-dd".
     */
    MbtPlanner.prototype.AppendOutOfWorkDay = function (resourceId, day) {
        day = getDate(day);
        if (resourceId === "*") {
            if (this.OutOfWorkDays.findIndex(function (d) { return d.valueOf() === day.valueOf(); }) === -1) {
                this.OutOfWorkDays.push(day);
            }
        } else {
            var resource = this.GetResource(resourceId);//.bind(this);
            if (resource.OutOfWorkDays.findIndex(function (d) { return d.valueOf() === day.valueOf(); }) === -1) {
                resource.OutOfWorkDays.push(day);
            }
        }
    };

    /**
     * Append a closed day  
     * @param {?("*"|any)} resourceId an identifier of the resource. If "*" then you alter `this.ClosedIsoDays`.
     * @param {!int} day between 1 (Monday) to 7 (Sunday)
     */
    MbtPlanner.prototype.AppendClosedIsoDay = function (resourceId, day) {
        if (day < 1 || day > 7)
            throw "not an iso day";
        if (resourceId === "*") {
            if (this.ClosedIsoDays.findIndex(function (d) { return d === day }) === -1) {
                this.ClosedIsoDays.push(day);
            }
        } else {
            var resource = this.GetResource(resourceId);//.bind(this);
            if (resource.ClosedIsoDays.findIndex(function (d) { return d === day; }) === -1) {
                resource.ClosedIsoDays.push(day);
            }
        }
    };

    /**
     * Set the the color of worked days for the resource.
     * @param {?any} resourceId an identifier of the resource. "*" is inefective ins this context.
     * @param {!string} color a color that will be set as background through a css style. Edit MbtPlanner.css for this.
     */
    MbtPlanner.prototype.SetBackGroundColor = function (resourceId, color) {
        var resource = this.GetResource(resourceId);//.bind(this);
        resource.BC = color;
    }

    /**
     * 
     * @param {string} direction "forward" or "forward". Default: "forward"
     * @param {?(date|string)} from The date used a the first planned day. Default: now() + 1 day
     * 
     * @description Tasks are planned ordered by resource, then by ExOrder, then by due date.
     */
    MbtPlanner.prototype.Plan = function (direction, from) {
        let scale = 100;
        var startPlanning = Date.now();
        if (direction === undefined || direction === null) {
            if (this.LastDirection === undefined || this.LastDirection === null) {
                this.LastDirection = "forward";
            }
            direction = this.LastDirection;
        } else {
            this.LastDirection = direction;
        }
        if (from === undefined || from === null) {
            if (this.LastFrom === undefined || this.LastFrom === null) {
                this.LastFrom = getDate(new Date(Date.now() + 864E5));
            }
            from = this.LastFrom;
        } else {
            from = getDate(from);
            this.LastFrom = from;
        }

        this.SortTasks();
        this.MinDate = null;
        this.MaxDate = null;
        this.Resources.forEach(function (o, i) {
            o.NextWorkableDay = this.AddToWorkableDay(from, 0, o);
            o.dayResidue = 1 * scale;
        }.bind(this));
        this.Tasks.forEach(function (t, i) {
            t.StartDate = null;
            t.EndDate = null;
            t.Production = [];
        });
        switch (direction) {
            case "forward":
                var curOrder = 1;
                for (let i = 0; i < this.Tasks.length; i++) {                    
                    var curTask = this.Tasks[i];                    
                    if (curTask.ExOrder === null) {
                        curTask.ExOrder = curOrder++;
                        curTask.InitialExOrder = curTask.ExOrder;
                    } else {
                        curOrder = curTask.ExOrder + 1;
                    }
                    if (curTask.DueDate !== _endOfTheWorld) {
                        if (this.MaxDate === null || curTask.DueDate > this.MaxDate) {
                            this.MaxDate = curTask.DueDate;
                        }
                    }
                    let load = (curTask.Load * scale) * (1 - curTask.Completion / 100);                    
                    curTask.StartDate = curTask.Resource.NextWorkableDay;
                    while (load >= (1 * scale)) {
                        curTask.Production.push(curTask.Resource.NextWorkableDay);
                        curTask.Resource.NextWorkableDay = this.AddToWorkableDay(curTask.Resource.NextWorkableDay, 1, curTask.Resource);
                        load -= (1 * scale);
                    }
                    //scale / this.Resolution <=> fraction de journée qui ne doit pas être planifiée
                    if (load > scale / this.Resolution) {                       
                        curTask.Production.push(curTask.Resource.NextWorkableDay);
                        if (load > curTask.Resource.dayResidue) {
                            curTask.Resource.NextWorkableDay = this.AddToWorkableDay(curTask.Resource.NextWorkableDay, 1, curTask.Resource);
                            curTask.Production.push(curTask.Resource.NextWorkableDay);
                            curTask.Resource.dayResidue = (curTask.Resource.dayResidue + (1 * scale)) - load;
                        } else {
                            curTask.Resource.dayResidue -= load;
                        }
                        if (curTask.Resource.dayResidue === 0) {
                            curTask.Resource.NextWorkableDay = this.AddToWorkableDay(curTask.Resource.NextWorkableDay, 1, curTask.Resource);
                            curTask.Resource.dayResidue = (1 * scale);
                        }                        
                    }

                    if (curTask.Production.length > 0) {
                        curTask.EndDate = curTask.Production[curTask.Production.length - 1];
                    } else {
                        curTask.EndDate = curTask.StartDate;
                    }
                    if (this.MaxDate === null || curTask.Resource.NextWorkableDay > this.MaxDate) {
                        this.MaxDate = curTask.Resource.NextWorkableDay;
                    }
                    if (this.MinDate === null || curTask.StartDate < this.MinDate) {
                        this.MinDate = curTask.StartDate;
                    }
                }
                break;
        }
        this.PlanningDuration = Date.now() - startPlanning;
    }

    exports.MbtPlanner = MbtPlanner;

    function getIsoDay(jsDate) {
        return jsDate.getDay() || 7;
    };

    function dateToString(d) {
        return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1).toString()).slice(-2) + "-" + ("0" + d.getDate().toString()).slice(-2);
    }

    function getDate(date) {
        if (typeof (date) === "string") {
            if (date.startsWith("/Date(")) {
                date = new Date(parseInt(date.substr(6)));
            } else {
                if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) {
                    throw "day must be a yyyy-MM-dd string"
                }
                return new Date(date);
            }
        } else if (typeof (date) === "number") {
            date = new Date(date);
        }
        if (typeof (date.getFullYear) !== "function") {
            throw "parameter is not a date";
        }
        return new Date(date.getFullYear().toString() + "-" + ("0" + (date.getMonth() + 1).toString()).slice(-2) + "-" + ("0" + date.getDate().toString()).slice(-2));

    }

    /*
     * For testing purposes
     * */
    exports.mbtpGetDate = getDate;
    
})(this);