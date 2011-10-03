// 
//  --- our app behavior logic ---
//
run(function () {
    // immediately invoked on first run
    var data = {
        key: 'data',
        data: [],
        curr_punch: null
    };
    store.get('data', function(stored_data) {
        if (stored_data != null) {
            data = stored_data
        }
    });

    loadTable();
    var init = (function () {
        setInterval(function() {
            d = new Date();
            my_str = "";
            if (data.curr_punch != null) {
                my_str = toHours(d.valueOf() - data.curr_punch);
                my_str = " (" + my_str + ")"
                x$('#start_button').addClass('pressed');
            }
            x$('#title_bar').html('inner', d.toLocaleTimeString() + my_str);
        }, 1000);

    })();

    x$('.timer_button').on('click', function() {
        setTime(this);
    });

    x$('.plus').on('click', function(e) {
        var val_node = x$('#value-' + e.target.id.split('-')[1])[0];
        var old_value = parseInt(val_node.value);
        val_node.value = old_value + 1;
        return false;
    });

    x$('.minus').on('click', function(e) {
        var val_node = x$('#value-' + e.target.id.split('-')[1])[0];
        var old_value = parseInt(val_node.value);
        val_node.value = old_value - 1;
        return false;
    });

    x$('#pm').on('click', function(e) {
        x$('#value-ampm')[0].value = 'PM';
        return false;
    });

    x$('#am').on('click', function(e) {
        x$('#value-ampm')[0].value = 'AM';
        return false;
    });

    function toHours(time_interval) {
        return (time_interval / (60000 * 60)).toFixed(2);
    }

    function setTime(trigger) {
        x$('.app_button').removeClass('pressed');
        x$('#' + trigger.id).addClass('pressed');

        var curr = new Date();
        if (data.curr_punch != null) {
            data.data.push({start: data.curr_punch.valueOf(), stop: curr.valueOf(), duration: curr.valueOf() - data.curr_punch });
            data.curr_punch = null;
        } else {
            if (trigger.id == 'start_button') {
                data.curr_punch = curr.valueOf();
            } else {
                data.curr_punch = null;
            }
        }
        store.save(data, function(ret) {
            data = ret;
        });
        x$('#tracking-table tbody').html('inner', '');
        loadTable();
    }

    x$('#admin_button').on('click', function() {
        reset_view();
        x$('#admin').css({display:'block'});
        return false;
    });

    x$('#current_data_button').on('click', function() {
        reset_view();
        var curr_val = new Date(data.curr_punch);
        var hours = curr_val.getHours();
        var ampm= "AM";
        if (hours < 12) {
            hours = hours + 1;
        } else {
            ampm = "PM";
            if (hours != 12){
                hours = hours - 12;
            } else {
                hours = 12;
            }

        }
        x$('#value-year')[0].value = curr_val.getFullYear();
        x$('#value-month')[0].value = curr_val.getMonth()+1;
        x$('#value-day')[0].value = curr_val.getDate();
        x$('#value-minute')[0].value = curr_val.getMinutes();
        x$('#value-hour')[0].value = hours;
        x$('#value-ampm')[0].value = ampm;

        x$('#datepicker').css({display: 'block'});
        //$('#curr_date_input').val(new Date(data.curr_punch));
        var curr_date = x$('#curr_date_input');
        x$('.nav_button').css({display: 'none'});
        return false;
    });

    x$('#home_button').on('click', function() {
        reset_view();
        x$('#home').css({display:'block'});
        loadTable();
        return false;

    });

    x$('#date_cancel_button').on('click', function(e) {
        reset_view();
        x$('#admin').css({display:'block'});
        return false;
    });

    x$('#date_set_button').on('click', function(e) {
        var ampm = x$('#value-ampm')[0].value
        var factor = 0;
        var hour_value = x$('#value-hour')[0].value;
        if (ampm == 'PM') {
            if (hour_value < 12) {
                factor = 12;
            } else {
                if (hour_value == 12) {
                    factor = -12;
                }
            }


        }
        var d = new Date(
                x$('#value-year')[0].value,
                parseInt(x$('#value-month')[0].value) - 1,
                parseInt(x$('#value-day')[0].value),
                parseInt(x$('#value-hour')[0].value) + factor,
                x$('#value-minute')[0].value,
                0,
                0);
        data.curr_punch = d.valueOf();
        store.save(data, function(ret) {
            data = ret;
        });


        reset_view();


        x$('#admin').css({display:'block'});
        x$('.nav_button').css({display:'inline-block'});

    });


    x$('#clear_data_button').on('click', function() {
        store.nuke();
        data = {
            key: 'data',
            data: [],
            curr_punch: null
        };
        return false;

    });

    x$('.button').on('touchstart', function() {
        x$('#' + this.id).addClass('pressed');
    });

    x$('.button').on('touchend', function() {
        x$('#' + this.id).removeClass('pressed');
    });

    function reset_view() {
        loadTable();
        x$('.view').css({display:'none'});
    }


    function loadTable() {
        x$('#tracking-table tbody tr').html('remove');
        total = 0.0;
        data.data.forEach(function(row) {
            total += row.stop - row.start;
            x$('#tracking-table tbody').html('bottom', '<tr><td>' +
                    new Date(row.start).toLocaleTimeString() + '</td><td>' +
                    new Date(row.stop).toLocaleTimeString()
                    + '</td><td>' +
                    toHours(row.stop - row.start) + '</td></tr>');
        });
        x$('#tracking-table tbody').html('bottom', '<tr><td></td><td></td><td>' + toHours(total) + '</td></tr>');
    }

});
