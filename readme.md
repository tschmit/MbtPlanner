# MbtPlanner

[![Build Status](https://travis-ci.org/tschmit/MbtPlanner.svg?branch=master)](https://travis-ci.org/tschmit/MbtPlanner)

A module to plan and display a corresponding schedule from a list of tasks each of one having:

- mandatorily:
  - a unique Id for the task,
  - a code for the type of task,
  - a load (in days, default resolution 0.125),
  - a due date.
- optionally:
  - a label,
  - an initial completion percentage,
  - a resource identifier,
  - an inner ref (to attach the task to a case...)
  - an explicit order to force the sorting of the planned tasks.
  - a save callback allowing to use deltas for, for example, a saving action

Once displayed, one can:

- reorder displayed tasks,
- change completion percentages.

The initial objective is to show what should happen, from a calendar persepctive, regarding the given tasks.

One can specify:

- days closed, globally or locally. By default those days are Saturday and Sunday.
- days off, globally or locally. For example this could be used for holidays.

[Samples](http://planner.madbuildertools.com)
[Documentation](http://planner.madbuildertools.com/docs/)

## version notes

### 1.1.0.0

#### news

- adding a contextual menu via GetSave((deltas) => {...})
- adding a load (float) parameter to CustomResourceFooter(r, load)
- allowing to preserve Resources when reseting the planner.
- adding a dataGetter delegate to QueryPlanAndDrawAsync
- adding the response as parameter to beforePlan of QueryPlanAndDrawAsync
- adding the ability to select lines in the plan

#### bug

- calculating the length of the plan after the integration of ressources out of work days, allowing the correct caculation of days in the planner.