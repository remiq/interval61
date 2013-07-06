var dd;
var Timer = Backbone.Model.extend({
    defaults: {
        time_started: 0
        ,time_changed: 0
        ,time_tracked: 0
        ,state: 'off'
        ,project: ''
        ,feature: ''
    }
    ,render: function()
    {
        var el = ich.timer({
            id: this.cid
            ,state: this.get("state")
            ,project: this.get("project")
            ,feature: this.get("feature")
        });
        $('#timers').prepend(el);
        $('#timer-'+this.cid).slideDown();
        this.on("change:state", this.onChangeState);
    }
    ,onChangeState: function(model, new_state)
    {
        $('#timer-'+model.cid).removeClass('timer-off').removeClass('timer-on').removeClass('timer-pause').addClass('timer-'+new_state);
    }
    ,doStart: function()
    {
        var now = moment();
        if (this.get("time_started") == 0)
        {
            this.set("time_started", now);
        }
        this.set("time_changed", now);
        this.set("state", 'on');
    }
    ,doPause: function()
    {
        var now = moment();
        var time_diff = now - this.get("time_changed");
        this.set("time_tracked", this.get("time_tracked") + time_diff);
        this.set("time_changed", now);
        this.set("state", 'pause');
    }
    ,doStop: function()
    {
        var now = moment();
        if (this.get("state") == 'on')
        {
            var time_diff = now - this.get("time_changed");
            this.set("time_tracked", this.get("time_tracked") + time_diff);
        }
        this.set("time_changed", now);
        this.set("state", 'on');
        tt.addNewTimeslot(
            this.get("time_started"),
            now,
            this.get("time_tracked"),
            $('#timer-'+this.cid+' .form-project').val(),
            $('#timer-'+this.cid+' .form-feature').val()
        );
        tt.destroyTimer(this.cid);
    }
    ,doAbort: function()
    {
        tt.destroyTimer(this.cid);
    }
    ,doUpdate: function()
    {
        var now = moment();
        var SECOND = 1000;
        var MINUTE = 60 * SECOND;
        var HOUR = MINUTE * 60;
        var time_diff = now - this.get("time_changed");
        var time_tracked = this.get("time_tracked");
        if (this.get("state") == 'on')
        {
            time_tracked += time_diff;
        }
        var hours = Math.floor(time_tracked / HOUR);
        time_tracked -= hours * HOUR;
        var minutes = Math.floor(time_tracked / MINUTE);
        time_tracked -= minutes * MINUTE;
        var seconds = Math.floor(time_tracked / SECOND);
        if (hours < 10)
        {
            hours = '0'+hours;
        }
        if (minutes < 10)
        {
            minutes = '0'+minutes;
        }
        if (seconds < 10)
        {
            seconds = '0'+seconds;
        }
        var time_string = hours + ':' + minutes + '.' + seconds;
        $('#timer-'+this.cid+' .form-counter').val(time_string);
    }
});
var Timeslot = Backbone.Model.extend({
    defaults: {
        time_start: null
        ,time_end: null
        ,time_track: null
        ,project: ''
        ,feature: ''
    }
    ,formatString: "YYYY-MM-DD HH:mm:ss"
    ,_render: function ()
    {
        var now = moment();
        var SECOND = 1000;
        var MINUTE = 60 * SECOND;
        var HOUR = MINUTE * 60;
        var time_track = this.get("time_track");
        var hours = Math.floor(time_track / HOUR);
        time_track -= hours * HOUR;
        var minutes = Math.floor(time_track / MINUTE);
        time_track -= minutes * MINUTE;
        var seconds = Math.floor(time_track / SECOND);
        if (hours < 10)
        {
            hours = '0'+hours;
        }
        if (minutes < 10)
        {
            minutes = '0'+minutes;
        }
        if (seconds < 10)
        {
            seconds = '0'+seconds;
        }
        var time_string = hours + ':' + minutes + '.' + seconds;

        var el = ich.timeslot({
            id: this.cid
            ,time_start: this.get("time_start").format(this.formatString)
            ,time_end: this.get("time_end").format(this.formatString)
            ,project: this.get("project")
            ,feature: this.get("feature")
            ,time_track: time_string
        });
        return el;
    }
    ,render: function ()
    {
        var element = this._render();
        $('#timeslots').prepend(element);
        $('#timeslot-'+this.cid).slideDown();
    }
    ,renderUpdate: function ()
    {
        var element = this._render();
        $('#timeslot-'+this.cid).html(element.html());
    }
});
var tt = {
    timers: {}
    ,timeslots: {}
    ,timer_active: null
    ,project_list: {}
    ,feature_list: {}
    ,onLoad: function()
    {
        this.loadLocal();
        this.refreshProjectsAndFeatures();
        this.isEnoughTimers();
        window.setInterval(tt.timerEvent, 1000);
    }
    ,isEnoughTimers: function()
    {
        if (_.keys(tt.timers).length < 1)
        {
            tt.addNewTimer();
        }
    }
    ,timerEvent: function()
    {
        if (tt.timer_active)
        {
            tt.timer_active.doUpdate();
        }
    }
    ,addNewTimer: function(project, feature)
    {
        var timer = new Timer({
            project: project
            ,feature: feature
        });
        tt.timers[timer.cid] = timer;
        timer.render();
        tt.refreshTypeahead();
        return timer;
    }
    ,addNewTimerAndStart: function(project, feature)
    {
        var timer = tt.addNewTimer(project, feature);
        tt.clickStart(timer.cid);
    }
    ,addExistingTimer: function(timer)
    {
        timer.render();
        timer.doUpdate();
        tt.refreshTypeahead();
    }
    ,destroyTimer: function(cid)
    {
        $('#timer-'+cid).slideUp();
        delete(tt.timers[cid]);
        this.isEnoughTimers();
    }
    ,addNewTimeslot: function(time_started, time_ended, time_tracked, project, feature)
    {
        var timeslot = new Timeslot({
            time_start: time_started
            ,time_end: time_ended
            ,time_track: time_tracked
            ,project: project
            ,feature: feature
        });
        tt.timeslots[timeslot.cid] = timeslot;
        timeslot.render();
    }
    ,addExistingTimeslot: function (time_slot)
    {
        time_slot.render();
    }
    ,refreshProjectsAndFeatures: function()
    {
        tt.project_list = {};
        tt.feature_list = {};
        _.each(this.timeslots, function (timeslot) {
            tt.project_list[timeslot.get("project")] = 1;
            tt.feature_list[timeslot.get("feature")] = 1;
        });
        tt.refreshTypeahead();
    }
    ,refreshTypeahead: function()
    {
        $('.form-project').typeahead({
            source: function (query, process) {
                process(_.keys(tt.project_list));
            }
        });
        $('.form-feature').typeahead({
            'source': function (query, process) {
                process(_.keys(tt.feature_list));
            }
        });
    }
    ,loadLocal: function()
    {
        if (localStorage['timers'])
        {
            var timers = JSON.parse(localStorage['timers']);
            _.each(timers, function(timer_data) {
                timer_data.time_started = moment(timer_data.time_started);
                timer_data.time_changed = moment(timer_data.time_changed);
                var timer = new Timer(timer_data);
                tt.timers[timer.cid] = timer;
                if (timer.get("state") == 'on')
                {
                    tt.timer_active = timer;
                }
                tt.addExistingTimer(timer);
            });
        }
        if (localStorage['timeslots'])
        {
            var time_slots = JSON.parse(localStorage['timeslots']);
            _.each(time_slots, function(time_slot_data) {
                time_slot_data.time_start = moment(time_slot_data.time_start);
                time_slot_data.time_end = moment(time_slot_data.time_end);
                var time_slot = new Timeslot(time_slot_data);
                tt.timeslots[time_slot.cid] = time_slot;
                tt.addExistingTimeslot(time_slot);
            });
        }
        if (!localStorage['timers'] && !localStorage['timeslots'])
        {
            tt.startDemo();
        }
    }
    ,saveLocal: function()
    {
        localStorage['timers'] = JSON.stringify(tt.timers);
        localStorage['timeslots'] = JSON.stringify(tt.timeslots);
    }
    ,startDemo: function()
    {
        var timer = this.addNewTimer('Self-improvement', 'Testing new TimeTracking tool!');
        $('.demo').show();
        tt.clickStart(timer.cid);
    }
    ,clickStart: function(cid)
    {
        if (this.timer_active)
        {
            this.timer_active.doPause();
        }
        var timer = tt.timers[cid];
        this.timer_active = timer;
        timer.doStart();
        this.saveLocal();
    }
    ,clickPause: function(cid)
    {
        this.timer_active = null;
        var timer = tt.timers[cid];
        timer.doPause();
        this.saveLocal();
    }
    ,clickStop: function(cid)
    {
        if (this.timer_active && this.timer_active.cid == cid)
        {
            this.timer_active = null;
        }
        var timer = tt.timers[cid];
        timer.doStop();
        this.saveLocal();
        this.refreshProjectsAndFeatures();
    }
    ,clickAbort: function(cid)
    {
        if (this.timer_active && this.timer_active.cid == cid)
        {
            this.timer_active = null;
        }
        var timer = tt.timers[cid];
        timer.doAbort();
        this.saveLocal();
    }
    ,clickEdit: function (cid)
    {
        var time_slot = tt.timeslots[cid];
        var element = ich.modalTimeSlot({
            id: time_slot.cid
            ,project: time_slot.get("project")
            ,feature: time_slot.get("feature")
        });
        $('#modal').html(element);
        var project_arr = _.keys(tt.project_list);
        var feature_arr = _.keys(tt.feature_list);
        $('#fieldProject').typeahead({
            'source' : project_arr
        });
        $('#fieldFeature').typeahead({
            'source': feature_arr
        });
        $('#mTimeSlot').modal();
    }
    ,clickUpdate: function (cid)
    {
        var time_slot = tt.timeslots[cid];
        time_slot.set("project", $('#fieldProject').val());
        time_slot.set("feature", $('#fieldFeature').val());
        time_slot.renderUpdate();
        this.saveLocal();
        this.refreshProjectsAndFeatures();
        $('#mTimeSlot').modal('hide');
    }
    ,clickRepeat: function (cid)
    {
        tt.addNewTimer($('#timeslot-'+cid+' .field-project').text(), $('#timeslot-'+cid+' .field-feature').text());
        return false;
    }
    ,clickDelete: function (cid)
    {
        $('#timeslot-'+cid).slideUp();
        delete(tt.timeslots[cid]);
        this.saveLocal();
        return false;
    }
    ,changeProject: function (cid, el)
    {
        this.timers[cid].set("project", el.value);
        this.saveLocal();
    }
    ,changeFeature: function (cid, el)
    {
        this.timers[cid].set("feature", el.value);
        this.saveLocal();
    }
};