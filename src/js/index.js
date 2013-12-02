
document.addEventListener('deviceready', function() {
	StatusBar.overlaysWebView(false);
	StatusBar.hide();
	setTimeout(function() {
		navigator.splashscreen.hide();
	}, 1000);
}, false);

document.addEventListener('DOMContentLoaded', function() {
	
	// Add scrolling to elements with iScroll
	var optionsMenu = new IScroll( document.querySelector('[data-tulito-id="back-pane-left"]'), { eventPassthrough: false, scrollX: false, scrollY: true, snap: false } );
	var hScroller = new IScroll('#hscroller', { eventPassthrough: true, scrollX: true, scrollY: false, snap: false });
	var hScroller = new IScroll('#hscroller2', { eventPassthrough: true, scrollX: true, scrollY: false, snap: 'li' });
	// FIXME: why does snap break?
	
	// Initialize tulito
	tulito.init(
		{
			onOrientationChange: function (e) {
				// refresh iscroll elements (FIXME: a better way to pass the element that needs a refresh)
				optionsMenu.refresh();
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


