tulito
======

Tulito is a template and library for building great mobile Web apps.

At this time, TULITO IS NEARING PRODUCTION-READY CODE. There is some to refactor in tulito.js and I will be opening issues for these items in the coming weeks. Also, no testing has been done outside of Chrome, Safari, and PhoneGap.

Visit http://tulito.org to see demos.

Why?
----

Mobile app behaviors don't come easily to Web technologies. Swipeable content panes, momentum scrolling, and native-feeling buttons require an exacting combination of HTML5, JavaScript, and CSS3. Tulito captures these patterns in a library and accompanying template as a starting point for Web and PhoneGap apps.

What?
-----

Many developers are unfamiliar with the practices that make it possible to build crisp, clean, and responsive apps using Web technologies. I wanted a prototype to demonstrate some of those techniques.

What?
-----

Many developers are unfamiliar with the practices that make it possible to build crisp, clean, and responsive apps using Web technologies. I wanted a prototype to demonstrate some of those techniques.

With tulito, you can instantly start building a mobile app with HTML5, CSS3, and JavaScript that has the following characteristics:

- Fully locked-down zoom and scroll control
- Automatic touch events (using Hammer.js)
- Native-like button behaviors
- Draggable, swipe-able, shove-able content panes in any direction
- Smooth pane animations
- Hidden content panes in any direction
- "Back" panes to the left and right
- Scrollable elements with momentum (using iScroll — optional)
- Responsive scaling between devices and orientations
- Compatible with most any JavaScript or CSS library or framework
- Everything configured through simple HTML data attributes
- 2 files (3 including the HTML template), each less than 20K when minified

Tulito also gives you:

- A starting point for PhoneGap-ready Web apps
- A JavaScript API to trigger or hook in to all events
- A lightweight API to manage events and drive UI programmatically

Things tulito does not give you:

- An SoC framework (like http://knockoutjs.com/)
- Templating (like http://ejohn.org/blog/javascript-micro-templating/)
- Routing (like http://sammyjs.org/)
- DOM manipulation (like jQuery)

(NOTE: the lack of dependencies (other than LESS) in tulito is not a statement about other libraries. I just didn't want to force any more on potential implementors than necessary. Face it -- we (Web developers) are a finicky group. Better to offend as few as possible.)

How?
----

Load tulito LESS CSS at the top of your HTML:

        <link rel="stylesheet/less" type="text/css" href="css/tulito.less" />
        <script src="js/less-1.5.0.min.js" type="text/javascript"></script>
		
Load tulito JavaScript at the bottom of your HTML:

	    <script type="text/javascript" src="js/tulito.js"></script>

Initialize tulito when the DOM is ready.

		tulito.init({});
		
You enable tulito behaviors by attaching `data-tulito-*` attributes to your HTML elements. I recommended starting with the barebones demo to see how div's are organized there.
    
        data-tulito-id="ID"
        data-tulito-class="pane"
        data-tulito-class="hidden-pane"
        data-tulito-class="back-pane"
        data-tulito-class="button"
		data-tulito-class="link"

### Panes

Panes are bits of content, like pages. They are displayed initially, and can be dragged out of the way temporarily to reveal a backpane.  Backpanes (see below) set a `data-tulito-parent` attribute to identify the pane ID to which they "belong" and push out of the way when they appear. The backpane shown on a drag will also depend on the backpane's `data-tulito-parentdrag` attribute, if multiple backpanes exist. The attribute `data-tulito-drag="none"` can be used to disable the default drag behaviors of any pane, including hidden. A less common attribute `data-tulito-allowchilddrags="yes"` (on ancestors) allows descendant elements to drag the pane. This is useful for nesting several pane behaviors; for example, a collection of hidden panes used to transition content while having back panes behind that collection. See the demos for examples. Lastly, if you want to absolutely prevent any kind of drags occurring for a given pane, you can use `data-tulito-drag="never"`. Just be aware that this means you'll need other ways to manipulate the panes, such as close buttons.

Default behavior for all panes (including hidden) is to disable controls — buttons, input elements, scrollers — for non-focused panes when a pane is open. You can disable this behavior with the attribute `data-tulito-controls="leave"`.

### Hidden Panes

These are hidden off screen, animated into view, and dragged or swiped off screen. Where they dwell depends on the `data-tulito-pos` attribute. The legal values of "left", "right", "up", and "down" will give you panes that are initially hidden in respective locations, must be opened with buttons, and then be dragged back to their original positions.

Hidden panes will stretch to a standard distance from the edge of the screen, configured at the top of tulito.js and tulito.less. You can also cause a hidden pane to cover the entire screen with the attribute `data-tulito-panegap="full"`. If you do so, I recommend adding a close button to the pane to make obvious how to close the pane. 

### Back Panes

This is a pattern that gives you a static (non-moving) pane that sits behind the others, and is normally lighter or darker than the rest of the content to temporarily display configuration or options. These are shown when the main content gets out of the way. For a backpane, the `data-tulito-parentdrag` attribute determines which backpane is shown when a pane is dragged — and any time it is dragged. In fact, normal panes will ONLY be draggable if there is a back pane that references them. Backpanes also provide a `data-tulito-shovedir` to indicate the direction in which a pane will shove its parent, and a `data-tulito-shovedist="full"` option to cause a back pane to open completely. (This last bit is not very useful at the moment, since back panes themselves cannot be dragged.)

Setting a button's `data-tulito-toggle` target to a backpane actually triggers the drag of the pane that is the back pane's parent, in the direction identified by its `data-tulito-pos` attribute.

### Shoving

"Shoving" lets you relate the dragging or opening of a content pane to another pane in order to move them together. This usually takes the form of a slight offset of a back pane when the main pane is moved to give the impression of a shove. Shoving is enabled via the attribute `data-tulito-shove` and `data-tulito-shovedir`, but this design is changing between now and "release".

### Buttons

Buttons are simple, but tulito adds to them touch behaviors and touch delays, and attaches `-toggle` behaviors as specified. If a `-toggle` attribute refers to a pane, it will trigger the showing or closing of that pane. If it references a backpane, it triggers the drag of the pane that is the parent of that backpane, in the direction specified by the backpane. See the next section in links for details on this behavior.

The `-toggle` attribute can take a space-delimited list of `data-tulito-id`s. If you put colon after an ID followed by a class, only elements with those classes will be toggled (e.g. `data-tulito-id="thanks-pane:opened"`). You can also add a `data-tulito-toggledelay` attribute in milliseconds to cause a delay between each toggle.

### Links

Links behave exactly like buttons, except without applying the default tulito button CSS styles. Both links and buttons, when touched, get an `.active` class added to them, which gets removed after a delay. This provides for an intuitive native-like button delay that lasts after the user's finger has moved out of the way. You should provide both buttons and links with identical `.active` and `:active` entries to allow for this behavior. The power of links is that by simply adding the `data-tulito-class="link"` attribute to anything, you can give it this delayed behavior. Again, buttons do the same, but also incur tulito styling.

### API

If all you want to do is get these behaviors, you can do it firstly through HTML. If you want instead to use tulito as the basis for your own events, you can register those using the API.

To apply tulito to a new element:

      tulito.apply(element);

When?
-----

I'll have a production-ready version sometime before Spring 2014. I'll have a second demo available about that same time, less of a "kitchen sink" than the current demo and closer to a real-world app.

### TODOs

- Create a test suite.
- Create a build that:
 	- Targets browser or PhoneGap.
	- Allows removing of LESS and other non-dependencies.
- Improve the `tulito.init()` events to allow passing of elements that need refreshes or changes.
- Add additional events to the API.
- Clean up the `[data-tulito-class]` selectors in tulito.less.
- Move more default styling from tulito.less to index.css. 
- Troubleshoot iScroll errors when using the `snap` option.
- Investigate cause of the pause on the `dragend` shove with hidden panes.
- Enable swipe anywhere (over other events) to open/close panes.
- Multiple optimizations possible, including caching of related elements.
- Add an argument to allow for a "give" ratio on drag threshold elasticity.
- Versioning to source

