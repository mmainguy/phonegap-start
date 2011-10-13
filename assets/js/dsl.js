// the app method accepts a fn to invoke on init unobtrusively
Number.prototype.to_s = function() {

    if (this < 10) {
        return '0' + this.toString();
    } else {
        return this.toString();
    }
}

Number.prototype.toHours = function() {
        return (this / (60000 * 60)).toFixed(2);
}


String.prototype.to_i = function() {
    return parseInt(this,10);
}

var run = function(application) {
    if (navigator.userAgent.indexOf('Browzr') > -1) {
        // blackberry
        setTimeout(application, 250)	
    } else {
        // attach to deviceready event, which is fired when phonegap is all good to go.
        x$(document).on('deviceready', application, false);
    }
}

// throw our settings into a lawnchair
, store = new Lawnchair({adaptor:'dom'});


