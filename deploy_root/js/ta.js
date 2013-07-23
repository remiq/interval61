var ta = {
    invalid: true
    ,time_slots: {}
    ,prepareTimebox: function(timeStart, timeEnd)
    {
        if (!timeEnd) timeEnd = moment().endOf('day');
        if (!timeStart) timeStart = moment().startOf('month');
        // console.log(timeStart);
        // console.log(timeEnd);
        var time_box = [];
        _.each(ta.time_slots, function(ts) {
            if (ta.isBetween(ts.attributes.time_start, timeStart, timeEnd) || ta.isBetween(ts.attributes.time_end, timeStart, timeEnd))
            {
                time_box.push(ts);
            }
        });
        // console.log(time_box);
        var tasks = [];
        var taskProjects = {};
        _.each(time_box, function(ts) {
            var task = {
                startDate: ts.attributes.time_start
                ,endDate: ts.attributes.time_end
                ,taskName: ts.attributes.project
                ,taskDescription: ts.getDescription()
                ,status: ts.attributes.rating
            };
            tasks.push(task);
            if (!taskProjects[ts.attributes.project]) taskProjects[ts.attributes.project] = 0;
            taskProjects[ts.attributes.project] += ts.get("time_track");
        });
        var taskTypes = _.keys(taskProjects);
        taskTypes = [];
        _.each(tasks, function(task) {
            var ts = new Timeslot();
            var taskName = task.taskName + "\n" + ts.getTimeTracked(taskProjects[task.taskName]);
            task.taskName = taskName;
            taskTypes.push(taskName);
        });
        var taskStatus = {
            "-1": 'bar-rating-none'
            ,0: 'bar-rating-0'
            ,1: 'bar-rating-1'
            ,2: 'bar-rating-2'
            ,3: 'bar-rating-3'
            ,4: 'bar-rating-4'
            ,5: 'bar-rating-5'
        };
        var gantt = d3.gantt().taskTypes(taskTypes).taskStatus(taskStatus);
        gantt.timeDomainMode("fixed").timeDomain([timeStart, timeEnd]);
        gantt(tasks);
    }
    ,isBetween: function(time_checked, time_start, time_end)
    {
        return (time_checked.isAfter(time_start) && time_checked.isBefore(time_end));
    }
    ,onLoad: function()
    {
        ta.loadLocal();
    }
    ,loadLocal: function()
    {
        if (localStorage['timeslots'])
        {
            var time_slots = JSON.parse(localStorage['timeslots']);
            _.each(time_slots, function(time_slot_data) {
                time_slot_data.time_start = moment(time_slot_data.time_start);
                time_slot_data.time_end = moment(time_slot_data.time_end);
                var time_slot = new Timeslot(time_slot_data);
                ta.time_slots[time_slot.cid] = time_slot;
            });
        }
    }
};
