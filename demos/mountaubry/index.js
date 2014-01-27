
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

	/* Cache some DOM references */
	var loader = document.querySelector('.loader');
	var main = document.querySelector('[data-tulito-id="main"]');
	var titlebar = document.querySelector('.title-bar');
	var menubutton = document.querySelector('#menu-button');
	var overview = document.querySelector('#overview');
	var login = document.querySelector('#login');
	var infopane = document.querySelector('[data-tulito-id="info-pane"]');
	var menu = document.querySelector('#menu-pane');
	
	/* Listen for touch events */
	Hammer(document.querySelector('#login-button')).on("tap", function(e) {
		// we're managing the loader screen ourselves here to show ways to
		// sequence custom behaviors.
		tulito._addClass(loader, 'shown');
		setTimeout(function() {
			tulito._addClass(loader, 'opened');
		}, 1);
		
		// blur input to get rid of the keyboard, just in case.
		document.activeElement.blur();
		
		// pretend to authenticate and then transition to the account overview.
		setTimeout(function() {
			tulito._addClass(titlebar, 'small');
			// this cascade would be easier with a chaining pattern.
			setTimeout(function() {
				tulito._addClass(menubutton, 'shown');
				main.removeAttribute('data-tulito-drag');
				tulito.toggleOpen(overview);					
				setTimeout(function() {
					tulito._removeClass(loader, 'opened');
					setTimeout(function() {
						tulito._removeClass(loader, 'shown');
						// hide the login pane to improve transition performance.
						tulito._addClass(login, 'hidden');
					}, 1500);
				}, 200);
			}, 500);
		}, 2500);
	});
	
	/* Why isn't an info modal part of tulito? Because it doesn't require any 
	   special mobile behaviors, unlike buttons and dragging panes. */
	Hammer(document.querySelector('#save-username i.fa-info-circle')).on("tap", function(e) {
		var infop = infopane.querySelector('p.info');
		infop.innerHTML = "This app can remember your username to make logging in a faster process. However, for security reasons, the Mount Aubry app will never store your password.";
		setTimeout(function() {
			tulito.toggleOpen(infopane);
		}, 1); // needs a sec to refresh DOM.
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
	
	Hammer(document.querySelector('#logout-li')).on("tap", function(e) {
		main.setAttribute('data-tulito-drag', 'disabled');			
		tulito._togglePane(menu);
		tulito._addClass(titlebar.querySelector('.right p'), 'paused');
		tulito._addClass(loader, 'shown');
		setTimeout(function() {
			tulito._addClass(loader, 'opened');
		}, 1);
		setTimeout(function() {
			tulito._removeClass(login, 'hidden');
			setTimeout(function() {
				tulito._removeClass(menubutton, 'shown');
				tulito._togglePane(overview);
				tulito._removeClass(titlebar, 'small');
				setTimeout(function() {
					tulito._removeClass(loader, 'opened');
					setTimeout(function() {
						tulito._removeClass(loader, 'shown');	
						tulito._removeClass(titlebar.querySelector('.right p'), 'paused');
					}, 500);					
				}, 1000)
			}, 1000);
		}, 500);
	
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
			time += 100;
			setctimer(showels[i], time);			
		}
	};
	
	/* Cascade any needed contents (those with a .cascade class) when a hidden pane finishes
	   its transition. */
	var panes = document.querySelectorAll('[data-tulito-class="hidden-pane"]');
	for (var i = 0; i < panes.length; ++i) {
		panes[i].addEventListener('transitionend', function(e) {
			console.log(e.srcElement);
			if (e.srcElement.getAttribute('data-tulito-class') === 'hidden-pane' && e.propertyName.match(/-transform$/)) {
				cascade(e.srcElement);
			}
		}, false);
	}
	
	/* Cascade the main page content */
	setTimeout(function() {
		cascade(login);
	}, 1500);
	
}, false);


