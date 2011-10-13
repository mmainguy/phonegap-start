function initDatePicker() {
    x$('.plus').on('click', function(e) {
        datepicker.changeValue(e, 1);
        return false;
    });

    x$('.minus').on('click', function(e) {
        datepicker.changeValue(e, -1);
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

    x$('#date_cancel_button').on('click', function(e) {
        x$('#datepicker').css({display:'none'});
        return false;
    });


}
var datepicker = {
    build : function (curr_val, callback) {

        var hours = curr_val.getHours();
        var ampm = "AM";
        if (hours > 11) {
            ampm = "PM";
        }

        hours = hours % 12;
        if (hours == 0) {
            hours = 12;
        }

        x$('#value-year')[0].value = curr_val.getFullYear();
        x$('#value-month')[0].value = (curr_val.getMonth() + 1).to_s();
        x$('#value-day')[0].value = curr_val.getDate().to_s();
        x$('#value-minute')[0].value = curr_val.getMinutes().to_s();
        x$('#value-hour')[0].value = hours.to_s();
        x$('#value-ampm')[0].value = ampm;

        var my_top = (screen.height - 370)/2;
        var my_left = (screen.width - 278)/2;
        x$('#datepicker').css({top: my_top+'px', left: my_left+'px', display: 'block'});

        // 280 * 370
        x$('#date_set_button').on('click', callback);


    },

    getDate : function() {
        var ampm = x$('#value-ampm')[0].value
        var factor = 0;
        var hour_value = x$('#value-hour')[0].value.to_i();
        if (ampm == 'PM') {
            if (hour_value < 12) {
                factor = 12;
            }
        } else {
            if (hour_value == 12) {
                factor = -12;
            }
        }
        var d = new Date(
                x$('#value-year')[0].value,
                x$('#value-month')[0].value.to_i() - 1,
                x$('#value-day')[0].value.to_i(),
                x$('#value-hour')[0].value.to_i() + factor,
                x$('#value-minute')[0].value,
                0,
                0);

        x$('#datepicker').setStyle('display','none');
        return d;

    },
    changeValue : function(e, i) {
        var val_node = x$('#value-' + e.target.id.split('-')[1])[0];
        var old_value = val_node.value.to_i();
        val_node.value = (old_value + i).to_s();
    }

}

