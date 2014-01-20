
document.addEventListener('deviceready', function() {
	StatusBar.overlaysWebView(false);
	StatusBar.hide();
	setTimeout(function() {
		navigator.splashscreen.hide();
	}, 1000);
}, false);


var app = new Object;

document.addEventListener('DOMContentLoaded', function() {
	
	// Add scrolling to elements with iScroll
	var optionsMenu = new IScroll( document.querySelector('[data-tulito-id="back-pane-left"]'), { eventPassthrough: false, scrollX: false, scrollY: true, snap: false } );
	app.hScroller1 = new IScroll('#hscroller1', { eventPassthrough: true, scrollX: true, scrollY: false, snap: false, probeType: 3 });
	app.hScroller2 = new IScroll('#hscroller2', { eventPassthrough: true, scrollX: true, scrollY: false, snap: true, snapStepX: 64, probeType: 1 });
	
	// Initialize tulito
	tulito.init(
		{
			onOrientationChange: function (e) {
				// refresh iscroll elements (FIXME: a better way to pass the element that needs a refresh)
				optionsMenu.refresh();
				app.hScroller1.refresh();
				app.hScroller2.refresh();
			},
			onBackPaneShown: function (node) {
				// refresh iscroll elements
				optionsMenu.refresh();
			}
		}
	);
	
	if (tulito.realCordova && deviceready) {
		navigator.splashscreen.hide();
	}
	
	// Add some fake behaviors to the submit button. Pretending to work is fun!
	
	
	// Automatically open the about pane, once.
	if (window.localStorage.getItem('notified') !== 'true') {
		setTimeout(function() {
			window.localStorage.setItem('notified', 'true');
			tulito._openPane(document.querySelector('[data-tulito-id="top-pane"]'));
		}, 1500);
	}

}, false);


