/*! tulito.js
 * http://tulito.org
 *
 * Copyright (c) 2013-2014 Danny Brian <danny@brians.org>;
 * Licensed under the MIT license */

(function(window, undefined) {
	'use strict';

	var swipeDist = 70; // the number in pixels to treat as a pane swipe.
	
	// Here we cache references to elements for events and relationships between panes, for example.
	// This avoids needing to query later, especially when we aren't using element IDs and don't
	// want to need them.
	var _cache = new Object; 
		
	var tulito = function() {
		
		this._inits = new Object;
		var self = this;
	
		var defaultOptions = {
			openedPaneGap: 150,
			openedHiddenPaneGap: 24,
			shovedPaneGap: 90,
			onOrientationChange: null,
			onHiddenPaneShown: null,
			onHiddenPaneHidden: null,
			onBackPaneShown: null,
			onBackPaneHidden: null
		};
		
		/* PUBLIC API */
		
		this.init = function (options) {

			this.options = {};
			
			// merge options
			for (var prop in defaultOptions) { 
			   if (prop in options) { this.options[prop] = options[prop]; }
			   else { this.options[prop] = defaultOptions[prop]; }
			}
			
			this.options.shovedHiddenRatio = this.options.shovedPaneGap / (window.innerWidth - this.options.openedHiddenPaneGap);
			this.options.shovedPaneRatio = this.options.shovedPaneGap / (window.innerWidth - this.options.openedPaneGap);
			
			// see if we're running with cordova, in which case there is no URL.
			this.realCordova = document.URL.indexOf( 'http://' ) === -1 && document.URL.indexOf( 'https://' ) === -1;
			
			// prevent in-document scrolling regardless of what's going on in the document; very important.
			// this gets a little tricky, because we don't want to disable drag input to some elements without
			// having to be explicit about it. We also want to allow scrolling of explicitly declared scrollable 
			// elements. So we disable touchmove for everything but input elements and those that have a 
			// data-tulito-scrollable attribute.
			
			document.ontouchmove = function(e) {
				if (e.srcElement.tagName.toLowerCase() !== "input") {
					e.preventDefault();
				}
			}
			
			// this._orient();
			
			if (!this.realCordova) {
				window.addEventListener( 'load', self._orient, false );
				window.addEventListener( 'orientationchange', self._orient, false );
			}
			else
			{
				this._orient();
				setTimeout(function() {
					navigator.splashscreen && navigator.splashscreen.hide(); // from the splashscreen plugin.				
				}, 100);
			}
			
			// Apply tulito behaviors to all elements with a data-tulito-id or data-tulito-class attribute.
			var elist = document.querySelectorAll('[data-tulito-id],[data-tulito-class]');
			for (var i = 0; i < elist.length; ++i) {
				this.apply(elist[i]);
			}
		};
		
		// This is the main API method; init() calls it for each tulito-id in the document, but if
		// you're manipulating the DOM, you'll want to call it for the elements that you add.
		this.apply = function (node) {
			var tclass = node.getAttribute('data-tulito-class');
			if (self._inits[tclass]) {
				self._inits[tclass](node);
			}
			else
			{
				console.log("tulito class not found: " + tclass);
			}
		};
		
		this.on = function (el) {
			// component, event, handler
		};
		
		this.toggleOpen = function (el) {
			self._togglePane(el);
		};
		
		this.toggleEnable = function (el) {
			// TODO
		};		

		this.state = function (el) {
			// TODO
		};
		
		
		/* INTERNAL API */
		
		// Experimental, but I don't see a reason to include this. Just use iScroll and register
		// your scrollables.
		this._inits['scrollable'] = function (node) {
			new iScroll(node, { bounce: false });
		};
			
		// These are the functional initializers for node behaviors.
		this._inits['button'] = function (node) {
			// All three of these will take place with a normal tap.
			Hammer(node).on("touch", function(e) {
				// We need touch to happen for highlighting before :active takes place!
				self._buttonTouch(node, e);
			});
			Hammer(node).on("tap", function(e) {
				// A tap event waits. We need touch to happen immediately.
				self._buttonTap(node, e);
			});
			Hammer(node).on("release", function(e) {
				// To remove the active class.
				self._buttonRelease(node, e);
			});
			
		}
		
		this._inits['pane'] = function (node) {

			// Initiatize some reference caching for this node.
			var ncache = self._getCache(node);
			
			// Panes move to expose back panes. So 
			node.addEventListener('transitionend', function(e) {
				if (e.propertyName.match(/-transform$/)) {
					if (ncache._backpane) {
						if (!self._hasClass(node, 'opened')) {
							self._removeClass(ncache._backpane, 'shown');
						}
						
					}
				}
			}, false);
			
			// Note: The directions this pane can be dragged depends on whether there are backpanes
			// that reference it, rather than any attributes it has itself.
			
			/* Shoving works differently for panes. A backpane with data-tulito-shovedir gets shoved
			   immediately at load time, and the shove classes get removed when the parent pane is dragged. We 
			   we need to set these classes here. */
			self._shoveBackpanes(node);

			var dragging = node.getAttribute('data-tulito-drag');
			if (dragging === 'none') { return; }
			
			// Disable transitions when a drag begins, and show the proper back pane.
			Hammer(node).on("dragstart", function(e) {
				if (e.srcElement !== node) { return; }
				
				if (ncache._opened) {
					self._startOpenPaneDrag(e, node, ncache);
				}
				else
				{
					self._startClosedPaneDrag(e, node, ncache);
				}
			});

			// During the drag, translate the pane directly. We shove the backpane, if enabled.
			// Because there are two "modes" here (opening and closing), we need to handle this differently
			// depending on whether the pane is already open or not.
			Hammer(node).on("drag", function(e) {
				if (e.srcElement !== node) { return; }
				
				// The pane is not open, and we're moving in the right direction. Drag away.
				// We constrain the drag so that the opposite end doesn't get exposed.
				// (Remember, open != shown or opening. It's not open until it's done being opened.)
				if (ncache._opened === false && e.gesture.direction === ncache._thisdrag) {
					self._dragPane(e, node, ncache);
				}
				
				// The pane is already open, and we're moving in the opposite direction. Drag away.
				// We constrain the drag so that the opposite end doesn't get exposed.
				else if (ncache._opened === true && e.gesture.direction !== ncache._thisdrag) {
					self._dragPane(e, node, ncache, true);
				}

			});
		
			// When the drag ends, set the CSS transform to put the pane smoothly in its place.
			Hammer(node).on("dragend", function(e) {
				if (e.srcElement !== node) { return; }
				
				// The pane is open and the drag was in the closing direction.
				if (ncache._opened === true && e.gesture.direction !== ncache._thisdrag)
				{
					self._endOpenPaneDrag(e, node, ncache);
				}
				// The pane is closed and the drag was in the opening direction
				else if (ncache._opened === false && e.gesture.direction === ncache._thisdrag)
				{
					self._endClosedPaneDrag(e, node, ncache);
				}
				// probably can't get here, but just in case
				else
				{
					self._resetTranslate(node, true);
				}
			});
			
		};  // end of pane pattern
		
		
		this._inits['hidden-pane'] = function (node) {
			
			var ncache = self._getCache(node);
			
			// Hidden panes get hidden (as in, CSS display: none) after a close transition.
			// This keeps things moving smoothly.
			node.addEventListener('transitionend', function(e) {
				if (e.propertyName.match(/-transform$/)) {
					if (!self._hasClass(e.srcElement, 'opened')) {
						self._removeClass(e.srcElement, 'shown');
					}
				}
			}, false);
			
			var dragging = node.getAttribute('data-tulito-drag');
			if (dragging === 'none') { return; }
			
			// Hidden panes can be dragged and swiped, but this happens only to the inverse
			// of their position. They are much simpler than panes, since they only get
			// dragged (functionally) in one direction.
			var pos = node.getAttribute('data-tulito-pos');
			
			var shove = node.getAttribute('data-tulito-shove');
			if (shove) {
				var shoveel = document.querySelector('[data-tulito-id="' + shove + '"]');
				ncache._shoveel = shoveel;
				var scache = self._getCache(shoveel);
			}
			
			var panegap;
			var tpanegap = panegap = node.getAttribute('data-tulito-panegap');
			
			if (panegap === null) {
				panegap = self.options.openedHiddenPaneGap;
			}
			else if (panegap === 'full') {
				panegap = 0;
			}
			ncache._panegap = tpanegap;
						
			// Disable transitions when a drag begins.
			Hammer(node).on("dragstart", function(e) {
				self._addClass(node, 'notransition'); 
				if (ncache._shoveel) {
					self._addClass(ncache._shoveel, 'notransition');
				}
			});
			
			// During the drag, translate the pane directly. Note that we don't do any
			// "shoving" of other panes during the drag.
			Hammer(node).on("drag", function(e) {
				if (e.gesture.direction === pos) {
					if (pos === "right") {
						self._translate(node, e.gesture.deltaX, 0, 0, { xMax: window.innerWidth, xMin: panegap });													
						if (ncache._shoveel) {
							self._translate(ncache._shoveel, e.gesture.deltaX * self.options.shovedHiddenRatio, 0, 0);
						}
					}
					else if (pos === "left")
					{
						self._translate(node, e.gesture.deltaX, 0, 0, { xMax: -(panegap), xMin: -(window.innerWidth) });							
						if (ncache._shoveel) {
							self._translate(ncache._shoveel, e.gesture.deltaX * self.options.shovedHiddenRatio, 0, 0, { xMax: self.options.shovedPaneGap, xMin: 0 });
						}
					}
					else if (pos === "up")
					{
						self._translate(node, 0, e.gesture.deltaY, 0, { yMax: -(panegap), yMin: -(window.innerHeight) } );
					}
					else if (pos === "down")
					{
						self._translate(node, 0, e.gesture.deltaY, 0, { yMax: window.innerHeight, yMin: panegap } );						
					}
				}
			});

			// When the drag ends, set the CSS transform to put the pane smoothly in its place.
			// We also "shove" the pane referenced by tulito-shove back into place.
			Hammer(node).on("dragend", function(e) {
				if (e.gesture.direction === pos) {
					self._removeClass(node, 'notransition');
					
					if (ncache._shoveel) {
						self._removeClass(ncache._shoveel, 'notransition');
					}
					
					if (pos === "left" || pos === "right") {
						if (Math.abs(e.gesture.deltaX) > swipeDist) {
							ncache._opened = !ncache._opened;
							self._removeClass(node, 'opened');
							self._resetTranslate(node);
							
							// FIXME: this shove incurs a perceptible pause between the dragend 
							// and the transition that follows. It doesn't happen without the shove,
							// so I think the start of 2 transitions at once might be the culprit.
							// Some experiments are needed here. One solution might be to stagger them
							// a bit, not sure.
							if (ncache._shoveel) {
								self._resetTranslate(ncache._shoveel);
								self._removeClass(ncache._shoveel, 'shovedleft');
								self._removeClass(ncache._shoveel, 'shovedright');
							}
							if (self.options.onHiddenPaneHidden) {
								self.options.onHiddenPaneHidden(node);
							}
							// mainscreen._resetTranslate();
							
							// turn controls on
							setTimeout(function() {
								self._toggleControlsOn();						
							}, 200);
							
						}
						else
						{
							self._resetTranslate(node, true);
							if (ncache._shoveel) {
								self._resetTranslate(ncache._shoveel, true);
							}
						}
					}
					if (pos === "up" || pos === "down") {
						if (Math.abs(e.gesture.deltaY) > swipeDist) {
							ncache._opened = !ncache._opened;
							self._removeClass(node, 'opened');
							self._resetTranslate(node);
							
							if (self.options.onHiddenPaneHidden) {
								self.options.onHiddenPaneHidden(node);
							}
							// mainscreen._resetTranslate();
							
							// turn on controls
							setTimeout(function() {
								self._toggleControlsOn();						
							}, 200);
							
						}
						else
						{
							self._resetTranslate(node, true);
						}
					}
				}
				else
				{
					self._resetTranslate(node);
				}
			});
		};
		
		this._inits['back-pane'] = function (node) {

		};
		
		// Highlight on touch so that :active doesn't cause a flicker.
		this._buttonTouch = function (node, e) {
			if (!node) { return; }
			this._addClass(node, 'active');
		};
		
		// This is the real-time button tap event.
		this._buttonTap = function (node, e) {
			if (!node) { return; }
			
			// this._addClass(node, 'active');
			// For now, I'm going to determine these panes at runtime.
			if (node.hasAttribute('data-tulito-open')) {
				node.getAttribute('data-tulito-open').split(/\s+/).forEach(function(key) {
					self._togglePane(document.querySelector('[data-tulito-id="' + key + '"]'), e);
				});
			}
		};
		
		// Turn off the highlight after a delay. Why still use tap above to trigger an event?
		// Because that also knows the difference between a tap and other gestures.
		this._buttonRelease = function (node, e) {
			if (!node) { return; }
			setTimeout(function() { self._removeClass(node, 'active') }, 200 );
		};

		// This is the real-time pane open event.
		this._togglePane = function (node, e) {
			if (!node) { return; }
			
			var ncache = self._getCache(node);
			
			// If this is a hidden pane, we just go for it.
			var tclass = node.getAttribute('data-tulito-class');
			if (tclass === 'hidden-pane')
			{
				self._toggleHiddenPane(e, node, ncache);
			}
			
			// But if it's a back pane, we need instead to manipulate the parent 
			// that it references. We also try to make the toggle close behavior work.
			else if (tclass === 'back-pane')
			{	
				self._toggleBackPane(e, node, ncache);
			}
						
			// mainscreen._translate(window.innerWidth / 5, 0, 0, 0);
		};
		
		// Utility methods to add and remove classes.
		this._addClass = function( node, cname ) {
			node.className = node.className + ' ' + cname;
		}

		this._hasClass = function( node, cname ) {
			var regex = new RegExp('\\s*\\b' + cname + '\\b', 'g');
			return node.className.match(regex);
		}
		
		this._removeClass = function( node, cname ) {
			var regex = new RegExp('\\s*\\b' + cname + '\\b', 'g');
			node.className = node.className.replace(regex,'');
		}
		
		this._translate = function(node, x, y, z, constraints) {
						
			/*
			this._style.webkitTransitionDuration = 
		    this._style.MozTransitionDuration = 
		    this._style.msTransitionDuration = 
		    this._style.OTransitionDuration = 
		    this._style.transitionDuration = speed + 'ms';
			// let's leave the transition to CSS if we can
			*/
			
			var ncache = this._getCache(node);
			
			var tx = ncache._tx + x;
			var ty = ncache._ty + y;
			var tz = ncache._tz + z;
						
			if (constraints) {
				if (constraints.xMax != undefined) {
					tx = Math.min( tx, constraints.xMax );
				}
				if (constraints.xMin !== undefined) {
					tx = Math.max( tx, constraints.xMin );
				}
				if (constraints.yMax != undefined) {
					ty = Math.min( ty, constraints.yMax );
				}
				if (constraints.yMin !== undefined) {
					ty = Math.max( ty, constraints.yMin );
				}
				// if (tx > constraints.xMax) { var delta = tx - constraints.xMax; tx = constraints.xMax + (delta / ( Math.abs(delta) / 50 + 1 ))  }
				// if (tx < constraints.xMin) { var delta = constraints.xMin - tx; tx = constraints.xMin - (delta / ( Math.abs(delta) / 50 + 1 ))  }
			}
			
			/*
			if (node.getAttribute('data-tulito-class') === 'back-pane') {
				console.log("_tx: " + node._tx + ", tx: " + tx + ", x: " + x);
				console.log("_ty: " + node._ty + ", ty: " + ty + ", y: " + y);
			}
			*/
			
			node.style.webkitTransform = 'translate(' + tx + 'px,' + ty + 'px)' + 'translateZ(' + tz + 'px)';
		    node.style.msTransform = 
		    node.style.MozTransform = 
		    node.style.OTransform = 'translateX(' + tx + 'px,' + ty + 'px)';	
		}
		
		// Now, we're using the low-level APIs to set translate on the style for nodes. We're caching 
		// the starting values here in order to track the movement. We're storing it ad hoc as attributes 
		// _tx, _ty, and _tz directly on the nodes, which isn't a great practice. But it prevents us from
		// having to cache lists of nodes, too. This will probably change in the future.
		this._translateEnd = function(node, x, y, z, constraints, absolute) {
			var ncache = this._getCache(node);
			
			if (constraints) {
				if (ncache._tx + x > constraints.xMax) { ncache._tx = constraints.xMax; x = 0; }
				if (ncache._tx + x < constraints.xMin) { ncache._tx = constraints.xMin; x = 0; }
			}
			
			if (absolute) { // take the XYZ values as non-relative.
				ncache._tx = x; // cache
				ncache._ty = y;
				ncache._tz = z;
			}
			else
			{
				ncache._tx = ncache._tx + x; // cache
				ncache._ty = ncache._ty + y;
				ncache._tz = ncache._tz + z;
			}
			
			node.style.webkitTransform = 'translate(0,0,0)';
		    node.style.msTransform = 
		    node.style.MozTransform = 
		    node.style.OTransform = 'translateX(0,0)';	
		}

		this._resetTranslate = function(node, keepcache) {
			this._removeClass(node, 'notransition');
			var ncache = this._getCache(node);
			
			if (keepcache !== true) {
				ncache._tx = 0;
				ncache._ty = 0;
				ncache._tz = 0;
			}
			setTimeout(function() {
				node.style.webkitTransform =
				node.style.msTransform = 
			    node.style.MozTransform = 
			    node.style.OTransform = '';
			}, 1); // grr, this happens a bit too quickly for right drags.
		}
		
		this._orient = function () {
			// We're taking a pretty specific approach here, but this seems reliable to setting our 
			// screen dimensions and still controlling scroll.
			
			var iOS = navigator.userAgent.match(/(iPad|iPhone|iPod)/g);
			var viewportmeta = document.querySelector('meta[name="viewport"]');
			if (iOS && viewportmeta) {
		    	if (viewportmeta.content.match(/width=device-width/)) {
		      		viewportmeta.content = viewportmeta.content.replace(/width=[^,]+/, 'width=1');
		    	}
		    	viewportmeta.content = viewportmeta.content.replace(/width=[^,]+/, 'width=' + window.innerWidth);
				viewportmeta.content = viewportmeta.content.replace(/height=[^,]+/, 'height=' + window.innerHeight);
			}

			less.modifyVars({
			    '@screenWidth': window.innerWidth + "px",
			    '@screenHeight': window.innerHeight + "px"
			});

			if( window.orientation === 0 ) { // what are we gonna do here?
				document.documentElement.style.overflow = '';
				document.body.style.height = '100%';
			}
			else {
				document.documentElement.style.overflow = '';
				document.body.style.height = '100%';
			}

			/*
			setTimeout( function() {
				window.scrollTo( 0, 1 );
			}, 10 );
			*/
			if (self.options.onOrientationChange) {
				self.options.onOrientationChange();
			}
		}
		
		/* FIXME: These next four utility functions do potentially expensive DOM manipulation and
		   need some optimization. */
		
		this._toggleControlsOffExcept = function (node) {
			// deactivate all controls except this one
			var controls = document.querySelectorAll('[data-tulito-class="button"], input, textarea, button, .hscroller-cont');
			for (var i = 0; i < controls.length; ++i) {
				self._addClass(controls[i], 'inactive');
			}
			if (node) {
				var thiscontrols = node.querySelectorAll('[data-tulito-class="button"], input, textarea, button, .hscroller-cont');
				for (var i = 0; i < thiscontrols.length; ++i) {
					self._removeClass(thiscontrols[i], 'inactive');
				}
			}
		}
		
		this._toggleControlsOn = function () {
			var controls = document.querySelectorAll('[data-tulito-class="button"], input, textarea, button, .hscroller-cont');
			for (var i = 0; i < controls.length; ++i) {
				self._removeClass(controls[i], 'inactive');
			}
		}
		
		this._hideAllBackpanes = function () {
			var backpanes = document.querySelectorAll('[data-tulito-class="back-pane"]');
			for (var i = 0; i < backpanes.length; ++i) {
				self._removeClass(backpanes[i], 'shown');
			}
		}
		
		this._hideAllHiddenPanes = function () {
			var hiddenpanes = document.querySelectorAll('[data-tulito-class="hidden-pane"]');
			for (var i = 0; i < hiddenpanes.length; ++i) {
				self._removeClass(hiddenpanes[i], 'shown');
			}
		}
		
		this._getCache = function (node) {
			var nodeid = node.getAttribute('id');
			if (!nodeid) {
				nodeid = node.getAttribute('data-tulito-id');
				if (!nodeid) {
					return;
				}
			}
			
			if (_cache[nodeid]) {
				return _cache[nodeid];
			};

			// otherwise, initialize a cache for the node.
			_cache[nodeid] = {};
			_cache[nodeid]['el'] = node;
			
			_cache[nodeid]._tx = _cache[nodeid]._ty = _cache[nodeid]._tz = 0;
			_cache[nodeid]._opened = false;
			_cache[nodeid]._thisdrag = null;
			
			return _cache[nodeid];
		}
		
		this._getBackpanes = function (node) {
			if (node) {
				return document.querySelectorAll('[data-tulito-class="back-pane"][data-tulito-parent="' + node.getAttribute('data-tulito-id') + '"]');
			}
			else
			{
				return document.querySelectorAll('[data-tulito-class="back-pane"]');
			}
		};
		
		this._shoveBackpanes = function (node) {
			var backpanes = self._getBackpanes(node);
			for (var i = 0; i < backpanes.length; ++i) {
				var bcache = self._getCache(backpanes[i]);
				var shovedist = backpanes[i].getAttribute('data-tulito-shovedist');
				if (shovedist === undefined) {
					shovedist = self.options.shovedPaneGap;
				}
				if (shovedist === "full") {
					shovedist = window.innerWidth;
				}
				var shovedir = backpanes[i].getAttribute('data-tulito-shovedir');
				if (shovedir === "right") {
					self._addClass(backpanes[i], 'shovedleft');
					self._translateEnd(backpanes[i], -(shovedist), 0, 0 );
				}
				else if (shovedir === "left") {
					self._addClass(backpanes[i], 'shovedright');
					self._translateEnd(backpanes[i], shovedist, 0, 0 );
				}
			}
		};
				
		this._startClosedPaneDrag = function (e, node, ncache) {
			self._addClass(node, 'notransition'); 
			
			if (ncache._backpane) {
				self._removeClass(ncache._backpane, 'shown');
			}
			
			// get any backpanes that belong to this node.
			var backpanes = self._getBackpanes(node);
			for (var i = 0; i < backpanes.length; ++i) {
				if (backpanes[i].getAttribute('data-tulito-parentdrag') === e.gesture.direction)
				{
					// this backpane is for the drag direction, so show it, cache it, and disable
					// transitions.
					ncache._backpane = backpanes[i];
					ncache._shovedir = backpanes[i].getAttribute('data-tulito-shovedir');
					ncache._thisdrag = e.gesture.direction;
					self._addClass(backpanes[i], 'shown');
					self._addClass(backpanes[i], 'notransition'); 
					if (self.options.onBackPaneShown) {
						self.options.onBackPaneShown(node);
					}
					continue;
				}
				else
				{
					self._removeClass(backpanes[i], 'shown');
				}
			}
		};
		
		this._startOpenPaneDrag = function (e, node, ncache) {
			// This pane is open, so just disable transitions on it and any backpane
			// to prepare for the drag.
			self._addClass(node, 'notransition'); 
			if (ncache._backpane && ncache._shovedir) {
				self._addClass(ncache._backpane, 'notransition'); 
			}
		};
		
		this._dragPane = function (e, node, ncache, reverse) { 
			// _thisdrag is the direction of the open, not the direction being dragged currently.
			if (ncache._thisdrag === "right") {
				self._translate(node, e.gesture.deltaX, 0, 0, { xMax: (window.innerWidth - self.options.openedPaneGap) * 1.1, xMin: 0 });
				if (ncache._backpane && ncache._shovedir) {
					if (ncache._shovedir === 'right') {
						self._translate(ncache._backpane, e.gesture.deltaX * self.options.shovedPaneRatio, 0, 0, { xMax: 0, xMin: -(self.options.shovedPaneGap) } );
					}
					else if (ncache._shovedir === 'left') {
						self._translate(ncache._backpane, e.gesture.deltaX * self.options.shovedPaneRatio, 0, 0, { xMax: self.options.shovedPaneGap, xMin: 0 } );
					}
				}							
			}
			else if (ncache._thisdrag === "left") { 
				if (reverse) {
					// in this case, we need to stop a close-dragging pane from going past 0.
					self._translate(node, e.gesture.deltaX, 0, 0, { xMax: 0, xMin: -(window.innerWidth - self.options.openedPaneGap) } );							
				}
				else
				{
					self._translate(node, e.gesture.deltaX, 0, 0, { xMax: window.innerWidth, xMin: -(window.innerWidth - (self.options.openedPaneGap * 0.9)) });							
				}
				if (ncache._backpane && ncache._shovedir) {
					if (ncache._shovedir === 'right') {
						self._translate(ncache._backpane, e.gesture.deltaX * self.options.shovedPaneRatio, 0, 0 );
					}
					else if (ncache._shovedir === 'left') { // FIXME: why is this not different with reverse? Maybe just needs an explanation.
						self._translate(ncache._backpane, e.gesture.deltaX * self.options.shovedPaneRatio, 0, 0 );
					}
				}
			}
			
			/* // for now, not allowing up or down.
			else if (drag === "up" || drag === "down")
			{
				self._translate(node, 0, e.gesture.deltaY, 0, { yMax: window.innerHeight - self.options.openedPaneGap, yMin: 0 });						
			}
			*/
		};
		
		this._endOpenPaneDrag = function (e, node, ncache) {
			
			self._removeClass(node, 'notransition');
			self._resetTranslate(node, true);
			
			// the drag was long enough to close the pane.	
			if (Math.abs(e.gesture.deltaX) > swipeDist) {
				self._removeClass(node, 'opened');
				self._resetTranslate(node);
				ncache._opened = false;
				if (self.options.onBackPaneHidden) {
					self.options.onBackPaneHidden(node);
				}
				if (ncache._backpane && ncache._shovedir) {
					self._removeClass(ncache._backpane, 'notransition');
					self._resetTranslate(ncache._backpane, true);
					
					if (ncache._shovedir === 'right') {
						self._translateEnd(ncache._backpane, -(self.options.shovedPaneGap), 0, 0 );
						self._addClass(ncache._backpane, 'shovedleft');
					}
					else if (ncache._shovedir === 'left') {
						self._translateEnd(ncache._backpane, self.options.shovedPaneGap, 0, 0 );
						self._addClass(ncache._backpane, 'shovedright');
					}
				}
				// Remove the backpane drag.
				setTimeout(function() {
					self._removeClass(node, 'draggedleft');
					self._removeClass(node, 'draggedright');									
				}, 200);
				
				// turn on controls
				setTimeout(function() {
					self._toggleControlsOn();						
				}, 200);
			}
			// the drag wasn't long enough, so keep the pane open.
			else
			{
				if (ncache._backpane && ncache._shovedir) {
					self._removeClass(ncache._backpane, 'notransition');
					self._resetTranslate(ncache._backpane, true);
					if (ncache._backpane && ncache._shovedir) {
						self._removeClass(ncache._backpane, 'notransition');
						self._resetTranslate(ncache._backpane, true);
					}
				}
			}
			
			/* not supporting up and down yet */
			/*
			if (node._thisdrag === "up" || node._thisdrag === "down") {
				if (Math.abs(e.gesture.deltaY) > swipeDist) {
					self._removeClass(node, 'opened');
					self._resetTranslate(node);
					node._opened = false;
					// Remove the backpane.
					setTimeout(function() {
						self._removeClass(node._backpane, 'shown');					
					}, 300);
				}
			}
			*/
		};
		
		this._endClosedPaneDrag = function (e, node, ncache) {
			
			self._removeClass(node, 'notransition');
			self._resetTranslate(node, true); // keep our translate cache.

			// the drag went far enough to open the pane.
			if (Math.abs(e.gesture.deltaX) > swipeDist) {
				self._addClass(node, 'opened');
				ncache._opened = true;
				
				if (ncache._thisdrag === "right") {
					self._addClass(node, 'draggedright');
					self._translateEnd(node, window.innerWidth - self.options.openedPaneGap, 0, 0, null, true);
					
				}
				else if (ncache._thisdrag === "left") {
					self._addClass(node, 'draggedleft');
					self._translateEnd(node, -(window.innerWidth - self.options.openedPaneGap), 0, 0, null, true);
				}

				if (ncache._shovedir === 'right') {
					self._removeClass(ncache._backpane, 'shovedleft');
				}
				else if (ncache._shovedir === 'left') {
					self._removeClass(ncache._backpane, 'shovedright');
				}
								
				if (ncache._backpane && ncache._shovedir) {
					self._removeClass(ncache._backpane, 'notransition');
					self._resetTranslate(ncache._backpane, true);
					self._translateEnd(ncache._backpane, 0, 0, 0, null, true);
				}
				
				// turn off controls; note that we aren't excluding ourselves (node) here. That's because
				// we're disabling our own controls, too.
				self._toggleControlsOffExcept(ncache._backpane);
			}
			// the drag did not go far enough to open the pane.
			else
			{
				self._resetTranslate(node, true);
				if (ncache._backpane && ncache._shovedir) {
					self._removeClass(ncache._backpane, 'notransition');
					self._resetTranslate(ncache._backpane, true);
				}
				
				setTimeout(function() {
					self._toggleControlsOn();						
				}, 200);
			}
			
			/* for now, we aren't allowing up or down.
			if (drag === "up" || drag === "down") {
				if (Math.abs(e.gesture.deltaY) > swipeDist) {
					self._addClass(node, 'opened');
					node._opened = true;
					self._translateEnd(node, 0, window.innerWidth - self.options.openedPaneGap, 0, null, true);
				}
				else
				{
					self._resetTranslate(node);
				}
			}
			*/
		};
		
		this._toggleHiddenPane = function (e, node, ncache) {
			var pos = node.getAttribute('data-tulito-pos');
			
			// They can shove other panes as they move.
			/* FIXME: the * 1.1 here was meant to smooth out the drag. If you look closely, you can
		       see that the up/down hidden pane drags are smoother than the left/right drags, and this 
		       is because it takes a moment for the gesture delta to catch up to the extra distance.
		       But so far, it's not working as well for left/right. */
		
			var shove = node.getAttribute('data-tulito-shove');
			var panegap;
			var tpanegap = panegap = node.getAttribute('data-tulito-panegap');
			var shoveel = document.querySelector('[data-tulito-id="' + shove + '"]');
			ncache._shoveel = shoveel;
			ncache._panegap = panegap;
			
			if (panegap === null) {
				panegap = self.options.openedHiddenPaneGap;
			}
			else if (panegap === 'full') {
				panegap = 0;
			}
			
			if (ncache._opened) {
				ncache._opened = false;
				if (shove) {
					if (pos === "left") {
						self._removeClass(ncache._shoveel, 'shovedright');
						self._resetTranslate(ncache._shoveel, true);
						// self._translateEnd(ncache._shoveel, self.options.shovedPaneGap * 1.1, 0, 0, null, true);
					}
					else if (pos === "right") {
						self._removeClass(ncache._shoveel, 'shovedleft');
						self._resetTranslate(ncache._shoveel, true);
						// self._translateEnd(ncache._shoveel, -(self.options.shovedPaneGap * 1.1), 0, 0, null, true);
					}
				}
		
				setTimeout(function() { self._toggleControlsOn() }, 200);
			
				ncache._opened = false;
				
				if (self.options.onHiddenPaneHidden) {
					self.options.onHiddenPaneHidden(node);
				}
				setTimeout(function() {
					self._removeClass(node, 'opened');
					if (tpanegap === 'full') { self._removeClass(node, 'full-pane'); }
				}, 1);
			}
			else
			{
				if (shove) {
					if (pos === "left") {
						setTimeout(function() { self._addClass(ncache._shoveel, 'shovedright') }, 50);
						self._translateEnd(ncache._shoveel, self.options.shovedPaneGap * 1.1, 0, 0, null, true);
					}
					else if (pos === "right") {
						setTimeout(function() { self._addClass(ncache._shoveel, 'shovedleft') }, 50);
						self._translateEnd(ncache._shoveel, -(self.options.shovedPaneGap * 1.1), 0, 0, null, true);
					}
				}
		
				// deactivate all controls except this one (if they exist)
				self._toggleControlsOffExcept(node);
			
				// show this one
				self._addClass(node, 'shown');
				if (tpanegap === 'full') { self._addClass(node, 'full-pane'); }
				ncache._opened = true;
				
				if (pos === "left") {
					self._translateEnd(node, -(panegap), 0, 0, null, true);
				}
				else if (pos === "right") {
					self._translateEnd(node, panegap, 0, 0, null, true);
				}
				else if (pos === "up") {
					self._translateEnd(node, 0, panegap, 0, null, true);
				}
				else if (pos === "down") {
					self._translateEnd(node, 0, -(panegap), 0, null, true);
				}
			
				if (self.options.onHiddenPaneShown) {
					self.options.onHiddenPaneShown(node);
				}
				setTimeout(function() { self._addClass(node, 'opened'); }, 1);
			}
		};
		
		this._toggleBackPane = function (e, node, ncache) {
			var parentid = node.getAttribute('data-tulito-parent');
			var parent = document.querySelector('[data-tulito-id="' + parentid + '"]');
			var shovedir = node.getAttribute('data-tulito-shovedir');
			var shovedist;
			var tshovedist = shovedist = node.getAttribute('data-tulito-shovedist');
			var pcache = self._getCache(parent);
			ncache._shovedist = shovedist;
			
			if (shovedist === null) {
				shovedist = self.options.shovedPaneGap;
			}
			else if (shovedist === "full") {
				shovedist = window.innerWidth;				
			}
			
			if (pcache._opened) {
				if (shovedir) {
					self._removeClass(node, 'notransition');
					self._resetTranslate(node);
				}
				var drag = node.getAttribute('data-tulito-parentdrag');
				if (drag === "left") {
					self._removeClass(parent, 'draggedleft');
					if (shovedir === 'right') {
						self._addClass(node, 'shovedleft');
						self._translateEnd(node, -(shovedist), 0, 0, null, true);
					}
					else if (shovedir === 'left') {
						self._addClass(node, 'shovedright');
						self._translateEnd(node, shovedist, 0, 0, null, true);
					}
				}
				else if (drag === "right") {
					self._removeClass(parent, 'draggedright');
					if (shovedir === 'right') {
						self._addClass(node, 'shovedleft');
						self._translateEnd(node, -(shovedist), 0, 0, null, true);
					}
					else if (shovedir === 'left') {
						self._addClass(node, 'shovedright');
						self._translateEnd(node, shovedist, 0, 0, null, true);
					}					
				}
				
				self._removeClass(parent, 'opened');
				if (tshovedist === 'full') {
					self._removeClass(parent, 'full-pane');
				}
				pcache._opened = false;
				self._resetTranslate(parent);
				
				if (self.options.onBackPaneHidden) {
					self.options.onBackPaneHidden(node);
				}
				
				setTimeout(function() {
					self._toggleControlsOn();						
				}, 200);

			}
			else
			{			
				// Show the backpane, then move the parent out of its way.
				pcache._backpane = node;
				pcache._shovedir = shovedir;
				// node._thisdrag = e.gesture.direction;

				self._toggleControlsOffExcept(node);

				self._addClass(node, 'shown');
				if (tshovedist === 'full') {
					self._addClass(parent, 'full-pane');
				}
				self._addClass(parent, 'opened');
				pcache._opened = true;
				
				self._resetTranslate(parent, true);
				
				if (shovedir) {
					self._removeClass(node, 'notransition');
					self._resetTranslate(node, true);						
				}
				
				if (self.options.onBackPaneShown) {
					self.options.onBackPaneShown(node);
				}
				
				// We also need to set some stuff up in case you want to drag it back, 
				// and this depends on the drag/position.
				var pos = node.getAttribute('data-tulito-parentdrag');
				if (pos === 'right') {
					pcache._thisdrag = 'right';
					self._addClass(parent, 'draggedright');
					self._translateEnd(parent, window.innerWidth - self.options.openedPaneGap, 0, 0, null, true);
					if (shovedir === 'left') {
						self._removeClass(node, 'shovedright');
						self._translateEnd(node, 0, 0, 0, null, true);
					}
					else if (shovedir === 'right') {
						self._removeClass(node, 'shovedleft');
						self._translateEnd(node, 0, 0, 0, null, true);
					}
				}
				
				// FIXME
				else if (pos === 'left') {
					pcache._thisdrag = 'left';
					self._addClass(parent, 'draggedleft');
						
					self._translateEnd(parent, -(window.innerWidth - self.options.openedPaneGap), 0, 0, null, true);						
					if (shovedir === 'left') {
						self._removeClass(node, 'shovedright');
						self._translateEnd(node, 0, 0, 0, null, true);
					}
					else if (shovedir === 'right') {
						self._removeClass(node, 'shovedleft');
						self._translateEnd(node, 0, 0, 0, null, true);
					}
				}
			}			
		};
		
		return this;
	};

	// Based off Lo-Dash's excellent UMD wrapper (slightly modified) - https://github.com/bestiejs/lodash/blob/master/lodash.js#L5515-L5543
	// some AMD build optimizers, like r.js, check for specific condition patterns like the following:
	if(typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
		// define as an anonymous module
		define(function() {
	  		return new tulito;
		});
		// check for `exports` after `define` in case a build optimizer adds an `exports` object
	}
	else if(typeof module === 'object' && typeof module.exports === 'object') {
		module.exports = new tulito;
	}
	else {
		window.tulito = new tulito;
	}
	
})(this);
