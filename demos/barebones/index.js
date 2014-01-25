
/* For PhoneGap, hide the status bar and splash screen when ready. */
document.addEventListener('deviceready', function() {
	StatusBar.overlaysWebView(false);
	StatusBar.hide();
	setTimeout(function() {
		navigator.splashscreen.hide();
	}, 100);
}, false);

var app = new Object;

/* Initialize tulito. */
document.addEventListener('DOMContentLoaded', function() {

	tulito.init({});
	
}, false);


