// 
//  --- our app behavior logic ---
//


run(function () {
    // immediately invoked on first run
    initDatePicker();
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
            var d = new Date();
            var my_str = "";
            if (data.curr_punch != null) {
                my_str = (d.valueOf() - data.curr_punch).toHours();
                my_str = " (" + my_str + ")"
                x$('#start_button').addClass('pressed');
            }
            x$('#title_bar').html('inner', d.toLocaleTimeString() + my_str);
        }, 1000);

    })();


    x$('.timer_button').on('click', function() {
        setTime(this);
    });

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


    x$('#tracking-table a').on('click'),function() {
        datepicker.build(new Date(data.curr_punch), function(e) {
            data.curr_punch = datepicker.getDate().valueOf();
            store.save(data, function(ret) {
                data = ret;
            });
        });

    }

    x$('#current_data_button').on('click', function() {

        datepicker.build(new Date(data.curr_punch), function(e) {
            data.curr_punch = datepicker.getDate().valueOf();
            store.save(data, function(ret) {
                data = ret;
            });
        });

        return false;
    });


    x$('#home_button').on('click', function() {
        reset_view();
        x$('#home').css({display:'block'});
        loadTable();
        return false;

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
            x$('#tracking-table tbody').html('bottom', '<tr><td><a id="date-' + row.id + '">' +
                    new Date(row.start).toLocaleTimeString() + '</a></td><td><a>' +
                    new Date(row.stop).toLocaleTimeString()
                    + '</a></td><td>' +
                    (row.stop - row.start).toHours() + '</td></tr>');
        });
        x$('#tracking-table tbody').html('bottom', '<tr><td></td><td></td><td>' + total.toHours() + '</td></tr>');
    }

});
