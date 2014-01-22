
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
	app.hScroller2 = new IScroll('#hscroller2', { eventPassthrough: true, scrollX: true, scrollY: false, snap: false, probeType: 3 });
	app.hScroller3 = new IScroll('#hscroller3', { eventPassthrough: true, scrollX: true, scrollY: false, snap: true, snapStepX: window.innerWidth - 74 });
	
	
	var liNum1 = 3;
	var scroll1Target = document.querySelector('#hscroller1 li:nth-of-type(' + liNum1 + ')');
	tulito._addClass(scroll1Target, 'ptarget');
	
	app.hScroller1.on('scroll', function(e) {
		var newLiNum = Math.round(-(app.hScroller1.x / 64)) + 3;
		if (newLiNum !== liNum1) {
			tulito._removeClass(scroll1Target, 'ptarget');
			liNum1 = newLiNum;
			scroll1Target = document.querySelector('#hscroller1 li:nth-of-type(' + liNum1 + ')');
			tulito._addClass(scroll1Target, 'ptarget');
		}
	});
	
	var liNum2 = 3;
	var scroll2Target = document.querySelector('#hscroller2 li:nth-of-type(' + liNum2 + ')');
	tulito._addClass(scroll2Target, 'ptarget');
	
	app.hScroller2.on('scroll', function(e) {
		var newLiNum = Math.round(-(app.hScroller2.x / 64)) + 3;
		if (newLiNum !== liNum2) {
			tulito._removeClass(scroll2Target, 'ptarget');
			liNum2 = newLiNum;
			scroll2Target = document.querySelector('#hscroller2 li:nth-of-type(' + liNum2 + ')');
			tulito._addClass(scroll2Target, 'ptarget');
		}
	});
	
	// Initialize tulito
	tulito.init(
		{
			onOrientationChange: function (e) {
				// refresh iscroll elements (FIXME: a better way to pass the element that needs a refresh)
				optionsMenu.refresh();
				app.hScroller1.refresh();
				app.hScroller2.refresh();
				app.hScroller3.refresh();
			},
			onBackPaneShown: function (node) {
				// refresh iscroll elements
				optionsMenu.refresh();
			},
			onHiddenPaneShown: function (node) {
				app.hScroller3.refresh();
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


