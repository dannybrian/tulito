
/* This file is not necessary to tulito functionality, but is an illustration of 
   how to use tulito.js and tulito.less for handling and triggering of your 
   own custom events. */

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
	app.scroller1 = new IScroll('#hscroller1', { eventPassthrough: true, scrollX: true, scrollY: false, snap: false, probeType: 3 });
	app.scroller2 = new IScroll('#hscroller2', { eventPassthrough: true, scrollX: true, scrollY: false, snap: false, probeType: 3 });
	app.scroller3 = new IScroll('#hscroller3', { eventPassthrough: true, scrollX: true, scrollY: false, snap: true, snapStepX: window.innerWidth - 31 });
	
	// Make the two small carousels highlight the middle button
	var liNum1 = 3;
	var scroll1Target = document.querySelector('#hscroller1 li:nth-of-type(' + liNum1 + ')');
	tulito._addClass(scroll1Target, 'ptarget');
	
	app.scroller1.on('scroll', function(e) {
		var newLiNum = Math.round(-(app.scroller1.x / 64)) + 3;
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
	
	app.scroller2.on('scroll', function(e) {
		var newLiNum = Math.round(-(app.scroller2.x / 64)) + 3;
		if (newLiNum !== liNum2) {
			tulito._removeClass(scroll2Target, 'ptarget');
			liNum2 = newLiNum;
			scroll2Target = document.querySelector('#hscroller2 li:nth-of-type(' + liNum2 + ')');
			tulito._addClass(scroll2Target, 'ptarget');
		}
	});
	
	// The buttons in the scroller do not have data-tulito-open attributes because we 
	// want to handle this ourselves, opening the bottom pane to the matching content.
	// This is a good illustration of where tulito stops being helpful in order to avoid 
	// too much abstraction in the library.
	var buttons = document.querySelectorAll('#hscroller1 li');
	for (var i = 0; i < buttons.length; ++i) {
		Hammer(buttons[i]).on("tap", function(e) {
			var scrollid = e.srcElement.getAttribute('data-scrollid');
			var targetel = document.querySelector('#hscroller3 * [data-scrollid="' + scrollid + '"]');
			tulito.toggleOpen(document.querySelector('[data-tulito-id="bottom-pane"]'), e);
			// this needs a timer from the refresh that happens below.
			setTimeout(function() { 
				app.scroller3.scrollToElement(targetel, 0, -25);
			}, 1);
		});
	}
	
	// Initialize tulito
	tulito.init(
		{
			onOrientationChange: function (e) {
				// refresh iscroll elements (FIXME: a better way to pass the element that needs a refresh)
				optionsMenu.refresh();
				app.scroller1.refresh();
				app.scroller2.refresh();
				app.scroller3.refresh();
			},
			onBackPaneShown: function (node) {
				// refresh iscroll elements
				optionsMenu.refresh();
			},
			onHiddenPaneShown: function (node) {
				app.scroller3.refresh();
			}
		}
	);
	
	if (tulito.realCordova && deviceready) {
		navigator.splashscreen.hide();
	}
		
	// Automatically open the about pane, once.
	if (window.localStorage.getItem('notified') !== 'true') {
		setTimeout(function() {
			window.localStorage.setItem('notified', 'true');
			tulito._openPane(document.querySelector('[data-tulito-id="top-pane"]'));
		}, 1500);
	}

}, false);


