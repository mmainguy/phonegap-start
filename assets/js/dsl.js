// the app method accepts a fn to invoke on init unobtrusively 
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


