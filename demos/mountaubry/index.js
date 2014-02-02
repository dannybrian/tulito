
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
		openedPaneGap: 120,
		shovedPaneGap: 60
	});

	/* Cache some DOM references */
	var main = document.querySelector('[data-tulito-id="main"]');
	var loader = document.querySelector('[data-tulito-id="main"] > .loader');
	var titlebar = document.querySelector('.title-bar');
	var menubutton = document.querySelector('#menu-button');
	var overview = document.querySelector('#overview');
	var login = document.querySelector('#login');
	var infopane = document.querySelector('[data-tulito-id="info-pane"]');
	var menu = document.querySelector('#menu-pane');
	var paypane = document.querySelector('#paybill-pane');
	
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
	
	var setptimer = function (el, time) {
		setTimeout(function() {
			tulito._addClass(el, 'shown');				
		}, time);
		
	}
	
	/* Manually handle the payment screen selections. */
	var options = paypane.querySelectorAll('.option:not(.submit)');
	for (var i = 0; i < options.length; ++i) {
		Hammer(options[i]).on("tap", function(e) {
			var parent = e.srcElement.parentNode;
			var instruct = parent.querySelector('.instruct');
			if (instruct) {
				tulito._removeClass(parent.querySelector('.instruct'), 'shown');
			}
			var aoptions = parent.querySelectorAll('.option');
			for (var ai = 0; ai < aoptions.length; ++ai) {
				if (e.srcElement === aoptions[ai]) {
					tulito._addClass(e.srcElement, 'selected');
					tulito._removeClass(e.srcElement, 'shown');
				}
				else
				{
					tulito._removeClass(aoptions[ai], 'shown');
				}
			}
			var nextblock = parent.getAttribute('data-nextblock');
			var nbdivs = document.querySelectorAll('[data-tulito-id="' + nextblock + '"] > div');
			for (var ni = 0; ni < nbdivs.length; ++ni) {
				tulito._addClass(nbdivs[ni], 'cascade');
				tulito._addClass(nbdivs[ni], 'shown');
			}
			
		});
	}
	
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
	
	var uncascade = function (pane) {
		var showels = pane.querySelectorAll('.cascade');
		for (var i = 0; i < showels.length; ++i) {
			tulito._removeClass(showels[i], 'shown');
			tulito._removeClass(showels[i], 'selected');			
		}
	};
	/* Cascade any needed contents (those with a .cascade class) when a hidden pane finishes
	   its transition. */
	var panes = document.querySelectorAll('[data-tulito-class="hidden-pane"]');
	for (var i = 0; i < panes.length; ++i) {
		panes[i].addEventListener('transitionend', function(e) {
			if (e.srcElement.getAttribute('data-tulito-class') === 'hidden-pane' && e.propertyName.match(/-transform$/)) {
				if (tulito._hasClass(e.srcElement, 'opened')) {
					cascade(e.srcElement);
				}
				// and reset stuff when it closes.
				else
				{
					uncascade(e.srcElement);
				}
			}
		}, false);
	}
	
	/* The payment screen is *extra-fancy*, and we need to clean up the manual cascades there
	   on close. */
	paypane.addEventListener('transitionend', function(e) {
		setTimeout(function() {
			if (!tulito._hasClass(paypane, 'opened')) {
				var tmp_cascades = paypane.querySelectorAll('.choose-amount .instruct, .choose-amount .amount.cascade, .choose-date .instruct, .choose-date .date.cascade, #submitpay-button.cascade');
				for (var i = 0; i < tmp_cascades.length; ++i) {
					tulito._removeClass(tmp_cascades[i], 'cascade');
				}
			}
		}, 1); // give the uncascade a moment to happen first
	}, false);
	
	var paybutton = paypane.querySelector('[data-tulito-id="submitpay-button"]')
	var payloader = paypane.querySelector('.loader');
	Hammer(paybutton).on("tap", function(e) {
		tulito._addClass(loader, 'full shown');
		setTimeout(function() {
			tulito._addClass(loader, 'opened');			
		}, 1);
		setTimeout(function() {
			tulito._togglePane(document.querySelector('[data-tulito-id="thankyou-pane"]'));
			tulito._removeClass(loader, 'opened');
			setTimeout(function() {
				tulito._togglePane(paypane);
			}, 1000);
			setTimeout(function() {
				tulito._togglePane(document.querySelector('[data-tulito-id="thankyou-pane"]'));
				setTimeout(function() {
					tulito._removeClass(loader, 'shown');
					tulito._removeClass(loader, 'full');					
				}, 1000)
			}, 2000);
		}, 4000);
	});
	
	
	/* Cascade the main page content */
	setTimeout(function() {
		cascade(login);
	}, 1500);
	
}, false);


