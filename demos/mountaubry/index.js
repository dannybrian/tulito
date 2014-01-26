
/* For PhoneGap, hide the status bar and splash screen when ready. */
document.addEventListener('deviceready', function() {
	StatusBar.overlaysWebView(false);
	StatusBar.hide();
	setTimeout(function() {
		navigator.splashscreen.hide();
	}, 100);
}, false);

var app = new Object;

document.addEventListener('DOMContentLoaded', function() {

	/* Initialize tulito. */
	tulito.init({
		noReorient: true,
		openedPaneGap: 100,
		shovedPaneGap: 60
	});

	/* Listen for touch events */
	Hammer(document.querySelector('#login-button')).on("tap", function(e) {
		// we're managing the loader screen ourselves here to show ways to
		// sequence custom behaviors.
		var loader = document.querySelector('.loader');
		tulito._addClass(loader, 'shown');
		setTimeout(function() {
			tulito._addClass(loader, 'opened');
		}, 1);
		
		// blur input to get rid of the keyboard, just in case.
		document.activeElement.blur();
		
		// pretend to authenticate and then transition to the account overview.
		setTimeout(function() {
			tulito._addClass(document.querySelector('.title-bar'), 'small');
			setTimeout(function() {
				tulito._addClass(document.querySelector('#menu-button'), 'shown');
				document.querySelector('[data-tulito-id="main"]').removeAttribute('data-tulito-drag');
				tulito.toggleOpen(document.querySelector('#overview'));					
				setTimeout(function() {
					tulito._removeClass(loader, 'opened');
					setTimeout(function() {
						tulito._removeClass(loader, 'shown');
					}, 1000);
				}, 200);
			}, 500);
		}, 2500);
	});
	
	/* Why isn't an info modal part of tulito? Because it doesn't require any 
	   special mobile behaviors, unlike buttons and dragging panes. */
	Hammer(document.querySelector('#save-username i.fa-info-circle')).on("tap", function(e) {
		var infop = document.querySelector('[data-tulito-id="info-pane"] p.info');
		infop.innerHTML = "This app can remember your username to make logging in a faster process. However, for security reasons, the Mount Aubry app will never store your password.";
		tulito.toggleOpen(document.querySelector('[data-tulito-id="info-pane"]'));
	});
	
	/* Of course, you could use a JavaScript framework with binding to make stuff like 
	   this simpler. */
	Hammer(document.querySelector('input[type="checkbox"]')).on("tap", function(e) {
		if (e.srcElement.checked === false) {
			tulito._addClass(document.querySelector('#save-username .fa-check'), 'shown');
		}
		else
		{
			tulito._removeClass(document.querySelector('#save-username .fa-check'), 'shown');
		}
	});
	
	/* This is our simple cascade implementation. */
	var setctimer = function (el, time) {
		setTimeout(function() {
			tulito._addClass(el, 'shown');				
		}, time);
		
	}
	var cascade = function (pane) {
		var showels = pane.querySelectorAll('.cascade');
		var time = 0;
		for (var i = 0; i < showels.length; ++i) {
			time += 200;
			setctimer(showels[i], time);			
		}
	};
	
	/* Cascade any needed contents (those with a .cascade class) when a hidden pane finishes
	   its transition. */
	var panes = document.querySelectorAll('[data-tulito-class="hidden-pane"]');
	for (var i = 0; i < panes.length; ++i) {
		panes[i].addEventListener('transitionend', function(e) {
			if (e.propertyName.match(/-transform$/)) {
				cascade(e.srcElement);
			}
		}, false);
	}
	
	/* Cascade the main page content */
	setTimeout(function() {
		cascade(document.querySelector('#login'));
	}, 1);
	
}, false);


