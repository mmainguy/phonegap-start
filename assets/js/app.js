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

            }
            x$('#title_bar').html('inner', d.toLocaleTimeString() + my_str);
        }, 1000);

    })();

    x$('#start_button').on('click', function() {
        setTime('start')
    });

    x$('#stop_button').on('click', function() {
        setTime('stop')
    });
    function toHours(time_interval) {
        return (time_interval / (60000 * 60)).toFixed(2);
    }

    function setTime(start_or_stop) {
        var curr = new Date();
        if (data.curr_punch != null) {
            data.data.push({start: data.curr_punch.valueOf(), stop: curr.valueOf(), duration: curr.valueOf() - data.curr_punch });
            data.curr_punch = null;
        } else {
            if (start_or_stop == 'start') {
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
    });

    x$('#home_button').on('click', function() {
        reset_view();
        x$('#home').css({display:'block'});
        loadTable();

    });
    x$('#clear_data').on('click', function() {
        store.nuke();
        data = {
            key: 'data',
            data: [],
            curr_punch: null
        };

    })

    function reset_view() {
        loadTable();
        x$('.view').css({display:'none'});
    }

    function loadTable() {
        x$('#tracking-table tbody tr').html('remove');

        data.data.forEach(function(row) {
            x$('#tracking-table tbody').html('bottom', '<tr><td>' +
                    new Date(row.start).toLocaleTimeString() + '</td><td>' +
                    new Date(row.stop).toLocaleTimeString()
                    + '</td><td>' +
                    toHours(row.stop - row.start) + '</td></tr>');
        });
    }

});
