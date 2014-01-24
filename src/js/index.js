
/* This file is not necessary to tulito functionality, but is an illustration of 
   how to use tulito.js and tulito.less for handling and triggering of your 
   own custom events. */

document.addEventListener('deviceready', function() {
	
	setTimeout(function() {
		navigator.splashscreen.hide();
	}, 1);
}, false);


var app = new Object;

document.addEventListener('DOMContentLoaded', function() {

	// Add scrolling to elements with iScroll
	var optionsMenu = new IScroll( document.querySelector('[data-tulito-id="back-pane-left"]'), { eventPassthrough: false, scrollX: false, scrollY: true, snap: false } );
	app.scroller1 = new IScroll('#hscroller1', { eventPassthrough: true, scrollX: true, scrollY: false, probeType: 3, deceleration: 0.001 });
	app.scroller2 = new IScroll('#hscroller2', { eventPassthrough: true, scrollX: true, scrollY: false, probeType: 3, deceleration: 0.001 });
	app.scroller3 = new IScroll('#hscroller3', { eventPassthrough: true, scrollX: true, scrollY: false, snap: true, snapStepX: window.innerWidth - 31, deceleration: 0.008 });
	
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
	// too much abstraction in the library. For the first scroller, we'll make this open
	// the equivalent card in the bottom pane.
	var buttons1 = document.querySelectorAll('#hscroller1 li');
	for (var i = 0; i < buttons1.length; ++i) {
		Hammer(buttons1[i]).on("tap", function(e) {
			var scrollid = e.srcElement.getAttribute('data-scrollid');
			var targetel = document.querySelector('#hscroller3 * [data-scrollid="' + scrollid + '"]');
			tulito.toggleOpen(document.querySelector('[data-tulito-id="bottom-pane"]'), e);
			// this needs a timer from the refresh that happens below.
			setTimeout(function() { 
				app.scroller3.scrollToElement(targetel, 0, -25);
			}, 1);
		});
	}
	
	// For the second scroller, we'll have the buttons remove the corresponding button in the
	// upper scroller.
	var buttons2 = document.querySelectorAll('#hscroller2 li');
	for (var i = 0; i < buttons2.length; ++i) {
		Hammer(buttons2[i]).on("tap", function(e) {
			var scrollid = e.srcElement.getAttribute('data-scrollid');
			var targetel = document.querySelector('#hscroller1 * [data-scrollid="' + scrollid + '"]');
			// Let the transition happen, then remove the element.
			targetel.addEventListener('transitionend', function(e) {
				if (e.propertyName === 'width') {
					targetel.parentNode.removeChild(targetel);
					document.querySelector('#hscroller1').style.width = (64 * document.querySelectorAll('#hscroller1 li').length) + "px";
					setTimeout(function() {
						app.scroller1.refresh();
					}, 100);
				}
			}, false);
			tulito._addClass(targetel, 'removing');
		});
	}
	
	Hammer(document.querySelector('#thanks-button')).on("tap", function(e) {
		var loader = document.querySelector('.loader');
		tulito._addClass(loader, 'shown');
		setTimeout(function() {
			tulito._addClass(loader, 'opened');
		}, 1);
		setTimeout(function() {
			tulito._removeClass(loader, 'opened');
			setTimeout(function() { tulito._removeClass(loader, 'shown') }, 500);
			tulito.toggleOpen(document.querySelector('[data-tulito-id="thanks-pane"]'));
		}, 2000);
	});
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


