/*! tulito.js - 2013-11-18
 * http://tulito.org
 *
 * Copyright (c) 2013 Danny Brian <danny@brians.org>;
 * Licensed under the MIT license */

/* 
   FIXME: in several places, the library caches data or even nodes directly within the 
   DOM element objects. No, this isn't a great practice. But it does prevent me from 
   having to maintain a cache for this data, or to update that cache when the DOM
   changes. I'm investigating the pros and cons here.
*/

(function(window, undefined) {
	'use strict';

	var swipeDist = 70; // the number in pixels to treat as a pane swipe.
	
	// Here we cache references to elements for events; this avoids needing to query later,
	// especially when we aren't using element IDs and don't want to need them.
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

			// The directions this pane can be dragged depends on whether there are backpanes
			// that reference it.
						
			// Initiatize some crazy cache; FIXME: can we just leave this as vars in this scope?
			node._tx = node._ty = node._tz = 0;
			node._opened = false;
			node._thisdrag = null;
			
			/* Shoving works differently for panes. A backpane with data-tulito-shove="yes" gets shoved
			   immediately at load time, and the shove classes get removed when the parent pane is dragged. We 
			   we need to set these classes here. */
			var backpanes = document.querySelectorAll('[data-tulito-class="back-pane"][data-tulito-parent="' + node.getAttribute('data-tulito-id') + '"]');
			for (var i = 0; i < backpanes.length; ++i) {
				backpanes[i]._tx = backpanes[i]._ty = backpanes[i]._tz = 0;
				var shove = backpanes[i].getAttribute('data-tulito-shove');
				if (shove === "right") {
					self._addClass(backpanes[i], 'shovedleft');
					self._translateEnd(backpanes[i], -(self.options.shovedPaneGap), 0, 0 );
				}
				else if (shove === "left") {
					self._addClass(backpanes[i], 'shovedright');
					self._translateEnd(backpanes[i], self.options.shovedPaneGap, 0, 0 );
				}
			}
		
			// Disable transitions when a drag begins, and show the proper back pane.
			Hammer(node).on("dragstart", function(e) {
				// FIXME: we're not doing much caching here, and we could be.
				
				if (e.srcElement !== node) { return; }
				
				self._addClass(node, 'notransition'); 
				
				if (!node._opened) {
					if (node._backpane) {
						self._removeClass(node._backpane, 'shown');
					}
					
					var backpanes = document.querySelectorAll('[data-tulito-class="back-pane"][data-tulito-parent="' + node.getAttribute('data-tulito-id') + '"]');
					for (var i = 0; i < backpanes.length; ++i) {
						if (backpanes[i].getAttribute('data-tulito-parentdrag') === e.gesture.direction)
						{ // what a pain in the back.
							node._backpane = backpanes[i];
							node._shove = backpanes[i].getAttribute('data-tulito-shove');
							node._thisdrag = e.gesture.direction;
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
				}
				else
				{
					self._addClass(node, 'notransition'); 
					if (node._backpane && node._shove) {
						self._addClass(node._backpane, 'notransition'); 
					}
				}
				
			});

			// During the drag, translate the pane directly. We shove the backpane, if enabled.
			// Because there are two "modes" here (opening and closing), we need to handle this differently
			// depending on whether the pane is already open or not.
			Hammer(node).on("drag", function(e) {
				if (e.srcElement !== node) { return; }
				
				// The pane is not open, and we're moving in the right direction. Drag away.
				// We constrain the drag so that the opposite end doesn't get exposed.
				if (node._opened === false && e.gesture.direction === node._thisdrag) {
					if (node._thisdrag === "right") {
						self._translate(node, e.gesture.deltaX, 0, 0, { xMax: (window.innerWidth - self.options.openedPaneGap) * 1.1, xMin: 0 });
						if (node._backpane && node._shove) {
							if (node._shove === 'right') {
								self._translate(node._backpane, e.gesture.deltaX * self.options.shovedPaneRatio, 0, 0, { xMax: 0, xMin: -(self.options.shovedPaneGap) } );
							}
							else if (node._shove === 'left') {
								self._translate(node._backpane, e.gesture.deltaX * self.options.shovedPaneRatio, 0, 0, { xMax: self.options.shovedPaneGap, xMin: 0 } );
							}
						}							
					}
					else if (node._thisdrag === "left") {
						self._translate(node, e.gesture.deltaX, 0, 0, { xMax: window.innerWidth, xMin: -(window.innerWidth - (self.options.openedPaneGap * 0.9)) });							
						if (node._backpane && node._shove) {
							if (node._shove === 'right') {
								self._translate(node._backpane, e.gesture.deltaX * self.options.shovedPaneRatio, 0, 0 );
							}
							else if (node._shove === 'left') {
								self._translate(node._backpane, e.gesture.deltaX * self.options.shovedPaneRatio, 0, 0 );
							}
						}
					}
					/* // for now, not allowing up or down.
					else if (drag === "up" || drag === "down")
					{
						self._translate(node, 0, e.gesture.deltaY, 0, { yMax: window.innerHeight - self.options.openedPaneGap, yMin: 0 });						
					}
					*/
				}
				// The pane is already open, and we're moving in the opposite direction. Drag away.
				// We constrain the drag so that the opposite end doesn't get exposed.
				
				if (node._opened === true && e.gesture.direction !== node._thisdrag) {
					
					if (node._thisdrag === "right" && e.gesture.direction === "left") {
						self._translate(node, e.gesture.deltaX, 0, 0, { xMax: window.innerWidth - self.options.openedPaneGap, xMin: 0 });													
						if (node._backpane && node._shove) {
							if (node._shove === 'left') {
								self._translate(node._backpane, e.gesture.deltaX * self.options.shovedPaneRatio, 0, 0 );
							}
							else if (node._shove === 'right') {
								self._translate(node._backpane, e.gesture.deltaX * self.options.shovedPaneRatio, 0, 0 );
							}
						}
					}
					else if (node._thisdrag === "left" && e.gesture.direction === "right")
					{
						self._translate(node, e.gesture.deltaX, 0, 0, { xMax: 0, xMin: -(window.innerWidth - self.options.openedPaneGap) });							
						if (node._backpane && node._shove) {
							if (node._shove === 'left') {
								self._translate(node._backpane, e.gesture.deltaX * self.options.shovedPaneRatio, 0, 0 );
							}
							else if (node._shove === 'right') {
								self._translate(node._backpane, e.gesture.deltaX * self.options.shovedPaneRatio, 0, 0 );
							}
						}
					}
					/* for now, not allowing up or down.
					else if ((drag === "up" && e.gesture.direction === "down") ||
					          (drag === "down" && e.gesture.direction === "up"))
					{
						self._translate(node, 0, e.gesture.deltaY, 0, { yMax: window.innerHeight, yMin: 0 });						
					}
					*/
				}
			});
		
			// When the drag ends, set the CSS transform to put the pane smoothly in its place.
			Hammer(node).on("dragend", function(e) {
				/* FIXME: this needs serious cleanup, lots of duplicate logic here. */
				if (e.srcElement !== node) { return; }
				
				if (node._opened === false && e.gesture.direction === node._thisdrag) {
					self._removeClass(node, 'notransition');
					self._resetTranslate(node, true); // keep our translate cache.
			
					if (node._thisdrag === "right") {
						if (Math.abs(e.gesture.deltaX) > swipeDist) {
							self._addClass(node, 'opened draggedright');
							node._opened = true;
							self._translateEnd(node, window.innerWidth - self.options.openedPaneGap, 0, 0, null, true);
							if (node._backpane && node._shove) {
								self._removeClass(node._backpane, 'notransition');
								self._resetTranslate(node._backpane, true);
								self._translateEnd(node._backpane, 0, 0, 0, null, true);
								if (node._shove === 'right') {
									self._removeClass(node._backpane, 'shovedleft');
								}
								else if (node._shove === 'left') {
									self._removeClass(node._backpane, 'shovedright');
								}
								
								// turn off controls; note that we aren't excluding ourselves (node) here. That's because
								// we're disabling our own controls, too.
								self._toggleControlsOffExcept(node._backpane);
							}
						}
						else
						{
							self._resetTranslate(node, true);
							if (node._backpane && node._shove) {
								self._removeClass(node._backpane, 'notransition');
								self._resetTranslate(node._backpane, true);
							}
							
							setTimeout(function() {
								self._toggleControlsOn();						
							}, 200);
						}
					}

					else if (node._thisdrag === "left") {
						if (Math.abs(e.gesture.deltaX) > swipeDist) {
							self._addClass(node, 'opened draggedleft');
							node._opened = true;
							self._translateEnd(node, -(window.innerWidth - self.options.openedPaneGap), 0, 0, null, true);
							if (node._backpane && node._shove) {
								self._removeClass(node._backpane, 'notransition');
								self._resetTranslate(node._backpane, true);
								self._translateEnd(node._backpane, 0, 0, 0, null, true);
								
								if (node._shove === 'right') {
									self._removeClass(node._backpane, 'shovedleft');
								}
								else if (node._shove === 'left') {
									self._removeClass(node._backpane, 'shovedright');
								}
							}
							
							// note that we aren't excluding ourselves (node) here. That's because
							// we're disabling our own controls too
							self._toggleControlsOffExcept(node._backpane);
						}
						else
						{
							self._resetTranslate(node);
							if (node._backpane && node._shove) {
								self._removeClass(node._backpane, 'notransition');
								self._resetTranslate(node._backpane, true);
							}
							
							// turn on controls
							setTimeout(function() {
								self._toggleControlsOn();						
							}, 200);
							
						}
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
				}

				else if (node._opened === true && e.gesture.direction !== node._thisdrag) {
					self._removeClass(node, 'notransition');
					self._resetTranslate(node, true);
					if (node._thisdrag === "left" || node._thisdrag === "right") {
						if (Math.abs(e.gesture.deltaX) > swipeDist) {
							self._removeClass(node, 'opened');
							self._resetTranslate(node);
							node._opened = false;
							if (self.options.onBackPaneHidden) {
								self.options.onBackPaneHidden(node);
							}
							if (node._backpane && node._shove) {
								self._removeClass(node._backpane, 'notransition');
								self._resetTranslate(node._backpane, true);
								
								if (node._shove === 'right') {
									self._translateEnd(node._backpane, -(self.options.shovedPaneGap), 0, 0 );
									self._addClass(node._backpane, 'shovedleft');
								}
								else if (node._shove === 'left') {
									self._translateEnd(node._backpane, self.options.shovedPaneGap, 0, 0 );
									self._addClass(node._backpane, 'shovedright');
								}
							}
							// Remove the backpane drag.
							setTimeout(function() {
								self._removeClass(node, 'draggedleft');
								self._removeClass(node, 'draggedright');									
							}, 300);
							
							// turn on controls
							setTimeout(function() {
								self._toggleControlsOn();						
							}, 200);
						}
						else
						{
							if (node._backpane && node._shove) {
								self._removeClass(node._backpane, 'notransition');
								self._resetTranslate(node._backpane, true);
								if (node._backpane && node._shove) {
									self._removeClass(node._backpane, 'notransition');
									self._resetTranslate(node._backpane, true);
								}
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
				}
				else
				{
					self._resetTranslate(node, true);
				}
			});
		};  // end of pane
		
		this._inits['hidden-pane'] = function (node) {
			
			// Hidden panes can be dragged and swiped, but this happens only to the inverse
			// of their position. They are much simpler than panes, since they only get
			// dragged (functionally) in one direction.
			var pos = node.getAttribute('data-tulito-pos');

			// Initiatize some crazy cache.
			node._tx = node._ty = node._tz = 0;
			
			var shove = node.getAttribute('data-tulito-shove');
			if (shove) {
				var shoveel = document.querySelector('[data-tulito-id="' + shove + '"]');
				node._shove = shoveel;
				node._shove._tx = node._shove._ty = node._shove._tz = 0;
			}
			
			// Disable transitions when a drag begins.
			Hammer(node).on("dragstart", function(e) {
				self._addClass(node, 'notransition'); 
				if (node._shove) {
					self._addClass(node._shove, 'notransition');
				}
			});
			
			// During the drag, translate the pane directly. Note that we don't do any
			// "shoving" of other panes during the drag.
			Hammer(node).on("drag", function(e) {
				if (e.gesture.direction === pos) {
					if (pos === "right") {
						self._translate(node, e.gesture.deltaX, 0, 0, { xMax: window.innerWidth, xMin: self.options.openedHiddenPaneGap });													
						if (node._shove) {
							self._translate(node._shove, e.gesture.deltaX * self.options.shovedHiddenRatio, 0, 0);
						}
					}
					else if (pos === "left")
					{
						self._translate(node, e.gesture.deltaX, 0, 0, { xMax: -(self.options.openedHiddenPaneGap), xMin: -(window.innerWidth) });							
						if (node._shove) {
							self._translate(node._shove, e.gesture.deltaX * self.options.shovedHiddenRatio, 0, 0, { xMax: self.options.shovedPaneGap, xMin: 0 });
						}
					}
					else if (pos === "up")
					{
						self._translate(node, 0, e.gesture.deltaY, 0, { yMax: -(self.options.openedHiddenPaneGap), yMin: -(window.innerHeight) } );
					}
					else if (pos === "down")
					{
						self._translate(node, 0, e.gesture.deltaY, 0, { yMax: window.innerHeight, yMin: self.options.openedHiddenPaneGap } );						
					}
				}
			});

			// When the drag ends, set the CSS transform to put the pane smoothly in its place.
			// We also "shove" the pane referenced by tulito-shove back into place.
			Hammer(node).on("dragend", function(e) {
				if (e.gesture.direction === pos) {
					self._removeClass(node, 'notransition');
					
					if (node._shove) {
						self._removeClass(node._shove, 'notransition');
					}
					if (pos === "left" || pos === "right") {
						if (Math.abs(e.gesture.deltaX) > swipeDist) {
							self._removeClass(node, 'opened');
							self._resetTranslate(node);
							
							// FIXME: this shove incurs a perceptible pause between the dragend 
							// and the transition that follows. It doesn't happen without the shove,
							// so I think the start of 2 transitions at once might be the culprit.
							// Some experiments are needed here. One solution might be to stagger them
							// a bit, not sure.
							if (node._shove) {
								self._resetTranslate(node._shove);
								self._removeClass(node._shove, 'shovedleft');
								self._removeClass(node._shove, 'shovedright');
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
							if (node._shove) {
								self._resetTranslate(node._shove, true);
							}
						}
					}
					if (pos === "up" || pos === "down") {
						if (Math.abs(e.gesture.deltaY) > swipeDist) {
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
			// nothing to do here.
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
					self._openPane(document.querySelector('[data-tulito-id="' + key + '"]'), e);
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
		this._openPane = function (node, e) {
			if (!node) { return; }
			
			// If this is a hidden pane, we just go for it.
			var tclass = node.getAttribute('data-tulito-class');
			if (tclass === 'hidden-pane')
			{
				var pos = node.getAttribute('data-tulito-pos');
				
				// They can shove other panes as they move.
				/* FIXME: the * 1.1 here was meant to smooth out the drag. If you look closely, you can
			       see that the up/down hidden pane drags are smoother than the left/right drags, and this 
			       is because it takes a moment for the gesture delta to catch up to the extra distance.
			       But so far, it's not working as well for left/right. */
				var shove = node.getAttribute('data-tulito-shove');
				if (shove) {
					if (pos === "left") {
						self._addClass(node._shove, 'shovedright');
						self._translateEnd(node._shove, self.options.shovedPaneGap * 1.1, 0, 0, null, true);
					}
					else if (pos === "right") {
						self._addClass(node._shove, 'shovedleft');
						self._translateEnd(node._shove, -(self.options.shovedPaneGap * 1.1), 0, 0, null, true);
					}
				}
			
				// deactivate all controls except this one (if they exist)
				self._toggleControlsOffExcept(node);
				
				// hide all hidden panes
				var hiddenpanes = document.querySelectorAll('[data-tulito-class="hidden-pane"]');
				for (var i = 0; i < hiddenpanes.length; ++i) {
					self._removeClass(hiddenpanes[i], 'shown');
				}
				
				// show this one
				self._addClass(node, 'shown');
				
				if (pos === "left") {
					self._translateEnd(node, -(self.options.openedHiddenPaneGap), 0, 0, null, true);
				}
				else if (pos === "right") {
					self._translateEnd(node, self.options.openedHiddenPaneGap, 0, 0, null, true);
				}
				else if (pos === "up") {
					self._translateEnd(node, 0, self.options.openedHiddenPaneGap, 0, null, true);
				}
				else if (pos === "down") {
					self._translateEnd(node, 0, -(self.options.openedHiddenPaneGap), 0, null, true);
				}
				
				if (self.options.onHiddenPaneShown) {
					self.options.onHiddenPaneShown(node);
				}
				setTimeout(function() { self._addClass(node, 'opened'); }, 1);
			}
			
			// But if it's a back pane, we need instead to manipulate the parent 
			// that it references. We also try to make the toggle close behavior work.
			else if (tclass === 'back-pane')
			{	
				var parentid = node.getAttribute('data-tulito-parent');
				var parent = document.querySelector('[data-tulito-id="' + parentid + '"]');
				var shove = node.getAttribute('data-tulito-shove');
								
				if (parent._opened) {
					if (shove) {
						self._removeClass(node, 'notransition');
						self._resetTranslate(node);
					}
					var drag = node.getAttribute('data-tulito-parentdrag');
					if (drag === "left") {
						self._removeClass(parent, 'draggedleft');
						if (shove === 'right') {
							self._addClass(node, 'shovedleft');
							self._translateEnd(node, -(self.options.shovedPaneGap), 0, 0, null, true);
						}
						else if (shove === 'left') {
							self._addClass(node, 'shovedright');
							self._translateEnd(node, self.options.shovedPaneGap, 0, 0, null, true);
						}
					}
					else if (drag === "right") {
						self._removeClass(parent, 'draggedright');
						if (shove === 'right') {
							self._addClass(node, 'shovedleft');
							self._translateEnd(node, -(self.options.shovedPaneGap), 0, 0, null, true);
						}
						else if (shove === 'left') {
							self._addClass(node, 'shovedright');
							self._translateEnd(node, self.options.shovedPaneGap, 0, 0, null, true);
						}					
					}
					
					self._removeClass(parent, 'opened');
					parent._opened = false;
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
					parent._backpane = node;
					parent._shove = shove;
					// node._thisdrag = e.gesture.direction;
					
					self._toggleControlsOffExcept(node);
					
					// hide all backpanes
					var backpanes = document.querySelectorAll('[data-tulito-class="back-pane"]');
					for (var i = 0; i < backpanes.length; ++i) {
						self._removeClass(backpanes[i], 'shown');
					}
					
					self._addClass(node, 'shown');
					self._addClass(parent, 'opened');
					parent._opened = true;
					
					self._resetTranslate(parent, true);
					
					if (shove) {
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
						parent._thisdrag = 'right';
						self._addClass(parent, 'draggedright');
						self._translateEnd(parent, window.innerWidth - self.options.openedPaneGap, 0, 0, null, true);
						if (shove === 'left') {
							self._removeClass(node, 'shovedright');
							self._translateEnd(node, 0, 0, 0, null, true);
						}
						else if (shove === 'right') {
							self._removeClass(node, 'shovedleft');
							self._translateEnd(node, 0, 0, 0, null, true);
						}
					}
					
					// FIXME
					else if (pos === 'left') {
						parent._thisdrag = 'left';
						self._addClass(parent, 'draggedleft');	
						self._translateEnd(parent, -(self.options.openedPaneGap), 0, 0, null, true);						
						if (shove === 'left') {
							self._removeClass(node, 'shovedright');
							self._translateEnd(node, 0, 0, 0, null, true);
						}
						else if (shove === 'right') {
							self._removeClass(node, 'shovedleft');
							self._translateEnd(node, 0, 0, 0, null, true);
						}
					}
				}
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
			
			var tx = node._tx + x;
			var ty = node._ty + y;
			var tz = node._tz + z;
						
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
			if (constraints) {
				if (node._tx + x > constraints.xMax) { node._tx = constraints.xMax; x = 0; }
				if (node._tx + x < constraints.xMin) { node._tx = constraints.xMin; x = 0; }
			}
			
			if (absolute) { // take the XYZ values as non-relative.
				node._tx = x; // cache
				node._ty = y;
				node._tz = z;
			}
			else
			{
				node._tx = node._tx + x; // cache
				node._ty = node._ty + y;
				node._tz = node._tz + z;
			}
			node.style.webkitTransform = 'translate(' + this._tx + 'px,' + this._ty + 'px)' + 'translateZ(' + this._tz + 'px)';
		    node.style.msTransform = 
		    node.style.MozTransform = 
		    node.style.OTransform = 'translateX(' + this._tx + 'px,' + this._ty + 'px)';	
		}

		this._resetTranslate = function(node, keepcache) {
			this._removeClass(node, 'notransition');
			if (keepcache !== true) {
				node._tx = 0;
				node._ty = 0;
				node._tz = 0;
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
