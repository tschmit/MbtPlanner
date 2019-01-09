# MbtPlanner

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

Once displayed, one can:

- reorder displayed tasks,
- change completion percentages.

The initial objective is to show what should happen, from a calendar persepctive, regarding the given tasks.

One can specify:

- days closed, globally or locally. By default those days are Saturday and Sunday.
- days off, globally or locally. For example this could be used for holidays.

[Samples](http://planner.madbuildertools.com)