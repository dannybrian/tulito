(function(window,undefined){"use strict";var swipeDist=70;var _cache=new Object;var tulito=function(){this._inits=new Object;var self=this;var defaultOptions={openedPaneGap:150,openedHiddenPaneGap:24,shovedPaneGap:90,onOrientationChange:null,onHiddenPaneShown:null,onHiddenPaneHidden:null,onBackPaneShown:null,onBackPaneHidden:null};this.init=function(options){this.options={};for(var prop in defaultOptions){if(prop in options){this.options[prop]=options[prop]}else{this.options[prop]=defaultOptions[prop]}}this.options.shovedHiddenRatio=this.options.shovedPaneGap/(window.innerWidth-this.options.openedHiddenPaneGap);this.options.shovedPaneRatio=this.options.shovedPaneGap/(window.innerWidth-this.options.openedPaneGap);this.realCordova=document.URL.indexOf("http://")===-1&&document.URL.indexOf("https://")===-1;document.ontouchmove=function(e){if(e.srcElement.tagName.toLowerCase()!=="input"){e.preventDefault()}};if(!this.realCordova){window.addEventListener("load",self._orient,false);window.addEventListener("orientationchange",self._orient,false)}else{this._orient();setTimeout(function(){navigator.splashscreen&&navigator.splashscreen.hide()},100)}var elist=document.querySelectorAll("[data-tulito-id],[data-tulito-class]");for(var i=0;i<elist.length;++i){this.apply(elist[i])}};this.apply=function(node){var tclass=node.getAttribute("data-tulito-class");if(self._inits[tclass]){self._inits[tclass](node)}else{console.log("tulito class not found: "+tclass)}};this._inits["scrollable"]=function(node){new iScroll(node,{bounce:false})};this._inits["button"]=function(node){Hammer(node).on("touch",function(e){self._buttonTouch(node,e)});Hammer(node).on("tap",function(e){self._buttonTap(node,e)});Hammer(node).on("release",function(e){self._buttonRelease(node,e)})};this._inits["pane"]=function(node){var ncache=self._getCache(node);self._shoveBackpanes(node);Hammer(node).on("dragstart",function(e){if(e.srcElement!==node){return}if(ncache._opened){self._startOpenPaneDrag(e,node,ncache)}else{self._startClosedPaneDrag(e,node,ncache)}});Hammer(node).on("drag",function(e){if(e.srcElement!==node){return}if(ncache._opened===false&&e.gesture.direction===ncache._thisdrag){self._dragPane(e,node,ncache)}else if(ncache._opened===true&&e.gesture.direction!==ncache._thisdrag){self._dragPane(e,node,ncache,true)}});Hammer(node).on("dragend",function(e){if(e.srcElement!==node){return}if(ncache._opened===true&&e.gesture.direction!==ncache._thisdrag){self._endOpenPaneDrag(e,node,ncache)}else if(ncache._opened===false&&e.gesture.direction===ncache._thisdrag){self._endClosedPaneDrag(e,node,ncache)}else{self._resetTranslate(node,true)}})};this._inits["hidden-pane"]=function(node){var ncache=self._getCache(node);var pos=node.getAttribute("data-tulito-pos");var shove=node.getAttribute("data-tulito-shove");if(shove){var shoveel=document.querySelector('[data-tulito-id="'+shove+'"]');ncache._shoveel=shoveel;var scache=self._getCache(shoveel)}var panegap;var tpanegap=panegap=node.getAttribute("data-tulito-panegap");if(panegap===null){panegap=self.options.openedHiddenPaneGap}else if(panegap==="full"){panegap=0}ncache._panegap=tpanegap;Hammer(node).on("dragstart",function(e){self._addClass(node,"notransition");if(ncache._shoveel){self._addClass(ncache._shoveel,"notransition")}});Hammer(node).on("drag",function(e){if(e.gesture.direction===pos){if(pos==="right"){self._translate(node,e.gesture.deltaX,0,0,{xMax:window.innerWidth,xMin:panegap});if(ncache._shoveel){self._translate(ncache._shoveel,e.gesture.deltaX*self.options.shovedHiddenRatio,0,0)}}else if(pos==="left"){self._translate(node,e.gesture.deltaX,0,0,{xMax:-panegap,xMin:-window.innerWidth});if(ncache._shoveel){self._translate(ncache._shoveel,e.gesture.deltaX*self.options.shovedHiddenRatio,0,0,{xMax:self.options.shovedPaneGap,xMin:0})}}else if(pos==="up"){self._translate(node,0,e.gesture.deltaY,0,{yMax:-panegap,yMin:-window.innerHeight})}else if(pos==="down"){self._translate(node,0,e.gesture.deltaY,0,{yMax:window.innerHeight,yMin:panegap})}}});Hammer(node).on("dragend",function(e){if(e.gesture.direction===pos){self._removeClass(node,"notransition");if(ncache._shoveel){self._removeClass(ncache._shoveel,"notransition")}if(pos==="left"||pos==="right"){if(Math.abs(e.gesture.deltaX)>swipeDist){ncache._opened=!ncache._opened;self._removeClass(node,"opened");self._resetTranslate(node);if(ncache._shoveel){self._resetTranslate(ncache._shoveel);self._removeClass(ncache._shoveel,"shovedleft");self._removeClass(ncache._shoveel,"shovedright")}if(self.options.onHiddenPaneHidden){self.options.onHiddenPaneHidden(node)}setTimeout(function(){self._toggleControlsOn()},200)}else{self._resetTranslate(node,true);if(ncache._shoveel){self._resetTranslate(ncache._shoveel,true)}}}if(pos==="up"||pos==="down"){if(Math.abs(e.gesture.deltaY)>swipeDist){ncache._opened=!ncache._opened;self._removeClass(node,"opened");self._resetTranslate(node);if(self.options.onHiddenPaneHidden){self.options.onHiddenPaneHidden(node)}setTimeout(function(){self._toggleControlsOn()},200)}else{self._resetTranslate(node,true)}}}else{self._resetTranslate(node)}})};this._inits["back-pane"]=function(node){var ncache=self._getCache(node)};this._buttonTouch=function(node,e){if(!node){return}this._addClass(node,"active")};this._buttonTap=function(node,e){if(!node){return}if(node.hasAttribute("data-tulito-open")){node.getAttribute("data-tulito-open").split(/\s+/).forEach(function(key){self._togglePane(document.querySelector('[data-tulito-id="'+key+'"]'),e)})}};this._buttonRelease=function(node,e){if(!node){return}setTimeout(function(){self._removeClass(node,"active")},200)};this._togglePane=function(node,e){if(!node){return}var ncache=self._getCache(node);var tclass=node.getAttribute("data-tulito-class");if(tclass==="hidden-pane"){self._toggleHiddenPane(e,node,ncache)}else if(tclass==="back-pane"){self._toggleBackPane(e,node,ncache)}};this._addClass=function(node,cname){node.className=node.className+" "+cname};this._hasClass=function(node,cname){var regex=new RegExp("\\s*\\b"+cname+"\\b","g");return node.className.match(regex)};this._removeClass=function(node,cname){var regex=new RegExp("\\s*\\b"+cname+"\\b","g");node.className=node.className.replace(regex,"")};this._translate=function(node,x,y,z,constraints){var ncache=this._getCache(node);var tx=ncache._tx+x;var ty=ncache._ty+y;var tz=ncache._tz+z;if(constraints){if(constraints.xMax!=undefined){tx=Math.min(tx,constraints.xMax)}if(constraints.xMin!==undefined){tx=Math.max(tx,constraints.xMin)}if(constraints.yMax!=undefined){ty=Math.min(ty,constraints.yMax)}if(constraints.yMin!==undefined){ty=Math.max(ty,constraints.yMin)}}node.style.webkitTransform="translate("+tx+"px,"+ty+"px)"+"translateZ("+tz+"px)";node.style.msTransform=node.style.MozTransform=node.style.OTransform="translateX("+tx+"px,"+ty+"px)"};this._translateEnd=function(node,x,y,z,constraints,absolute){var ncache=this._getCache(node);if(constraints){if(ncache._tx+x>constraints.xMax){ncache._tx=constraints.xMax;x=0}if(ncache._tx+x<constraints.xMin){ncache._tx=constraints.xMin;x=0}}if(absolute){ncache._tx=x;ncache._ty=y;ncache._tz=z}else{ncache._tx=ncache._tx+x;ncache._ty=ncache._ty+y;ncache._tz=ncache._tz+z}node.style.webkitTransform="translate(0,0,0)";node.style.msTransform=node.style.MozTransform=node.style.OTransform="translateX(0,0)"};this._resetTranslate=function(node,keepcache){this._removeClass(node,"notransition");var ncache=this._getCache(node);if(keepcache!==true){ncache._tx=0;ncache._ty=0;ncache._tz=0}setTimeout(function(){node.style.webkitTransform=node.style.msTransform=node.style.MozTransform=node.style.OTransform=""},1)};this._orient=function(){var iOS=navigator.userAgent.match(/(iPad|iPhone|iPod)/g);var viewportmeta=document.querySelector('meta[name="viewport"]');if(iOS&&viewportmeta){if(viewportmeta.content.match(/width=device-width/)){viewportmeta.content=viewportmeta.content.replace(/width=[^,]+/,"width=1")}viewportmeta.content=viewportmeta.content.replace(/width=[^,]+/,"width="+window.innerWidth);viewportmeta.content=viewportmeta.content.replace(/height=[^,]+/,"height="+window.innerHeight)}less.modifyVars({"@screenWidth":window.innerWidth+"px","@screenHeight":window.innerHeight+"px"});if(window.orientation===0){document.documentElement.style.overflow="";document.body.style.height="100%"}else{document.documentElement.style.overflow="";document.body.style.height="100%"}if(self.options.onOrientationChange){self.options.onOrientationChange()}};this._toggleControlsOffExcept=function(node){var controls=document.querySelectorAll('[data-tulito-class="button"], input, textarea, button, .hscroller-cont');for(var i=0;i<controls.length;++i){self._addClass(controls[i],"inactive")}if(node){var thiscontrols=node.querySelectorAll('[data-tulito-class="button"], input, textarea, button, .hscroller-cont');for(var i=0;i<thiscontrols.length;++i){self._removeClass(thiscontrols[i],"inactive")}}};this._toggleControlsOn=function(){var controls=document.querySelectorAll('[data-tulito-class="button"], input, textarea, button, .hscroller-cont');for(var i=0;i<controls.length;++i){self._removeClass(controls[i],"inactive")}};this._hideAllBackpanes=function(){var backpanes=document.querySelectorAll('[data-tulito-class="back-pane"]');for(var i=0;i<backpanes.length;++i){self._removeClass(backpanes[i],"shown")}};this._hideAllHiddenPanes=function(){var hiddenpanes=document.querySelectorAll('[data-tulito-class="hidden-pane"]');for(var i=0;i<hiddenpanes.length;++i){self._removeClass(hiddenpanes[i],"shown")}};this._getCache=function(node){var nodeid=node.getAttribute("id");if(!nodeid){nodeid=node.getAttribute("data-tulito-id");if(!nodeid){return}}if(_cache[nodeid]){return _cache[nodeid]}_cache[nodeid]={};_cache[nodeid]["el"]=node;_cache[nodeid]._tx=_cache[nodeid]._ty=_cache[nodeid]._tz=0;_cache[nodeid]._opened=false;_cache[nodeid]._thisdrag=null;return _cache[nodeid]};this._getBackpanes=function(node){if(node){return document.querySelectorAll('[data-tulito-class="back-pane"][data-tulito-parent="'+node.getAttribute("data-tulito-id")+'"]')}else{return document.querySelectorAll('[data-tulito-class="back-pane"]')}};this._shoveBackpanes=function(node){var backpanes=self._getBackpanes(node);for(var i=0;i<backpanes.length;++i){var bcache=self._getCache(backpanes[i]);var shovedist=backpanes[i].getAttribute("data-tulito-shovedist");if(shovedist===undefined){shovedist=self.options.shovedPaneGap}if(shovedist==="full"){shovedist=window.innerWidth}var shovedir=backpanes[i].getAttribute("data-tulito-shovedir");if(shovedir==="right"){self._addClass(backpanes[i],"shovedleft");self._translateEnd(backpanes[i],-shovedist,0,0)}else if(shovedir==="left"){self._addClass(backpanes[i],"shovedright");self._translateEnd(backpanes[i],shovedist,0,0)}}};this._startClosedPaneDrag=function(e,node,ncache){self._addClass(node,"notransition");if(ncache._backpane){self._removeClass(ncache._backpane,"shown")}var backpanes=self._getBackpanes(node);for(var i=0;i<backpanes.length;++i){if(backpanes[i].getAttribute("data-tulito-parentdrag")===e.gesture.direction){ncache._backpane=backpanes[i];ncache._shovedir=backpanes[i].getAttribute("data-tulito-shovedir");ncache._thisdrag=e.gesture.direction;self._addClass(backpanes[i],"shown");self._addClass(backpanes[i],"notransition");if(self.options.onBackPaneShown){self.options.onBackPaneShown(node)}continue}else{self._removeClass(backpanes[i],"shown")}}};this._startOpenPaneDrag=function(e,node,ncache){self._addClass(node,"notransition");if(ncache._backpane&&ncache._shovedir){self._addClass(ncache._backpane,"notransition")}};this._dragPane=function(e,node,ncache,reverse){if(ncache._thisdrag==="right"){self._translate(node,e.gesture.deltaX,0,0,{xMax:(window.innerWidth-self.options.openedPaneGap)*1.1,xMin:0});if(ncache._backpane&&ncache._shovedir){if(ncache._shovedir==="right"){self._translate(ncache._backpane,e.gesture.deltaX*self.options.shovedPaneRatio,0,0,{xMax:0,xMin:-self.options.shovedPaneGap})}else if(ncache._shovedir==="left"){self._translate(ncache._backpane,e.gesture.deltaX*self.options.shovedPaneRatio,0,0,{xMax:self.options.shovedPaneGap,xMin:0})}}}else if(ncache._thisdrag==="left"){if(reverse){self._translate(node,e.gesture.deltaX,0,0,{xMax:0,xMin:-(window.innerWidth-self.options.openedPaneGap)})}else{self._translate(node,e.gesture.deltaX,0,0,{xMax:window.innerWidth,xMin:-(window.innerWidth-self.options.openedPaneGap*.9)})}if(ncache._backpane&&ncache._shovedir){if(ncache._shovedir==="right"){self._translate(ncache._backpane,e.gesture.deltaX*self.options.shovedPaneRatio,0,0)}else if(ncache._shovedir==="left"){self._translate(ncache._backpane,e.gesture.deltaX*self.options.shovedPaneRatio,0,0)}}}};this._endOpenPaneDrag=function(e,node,ncache){self._removeClass(node,"notransition");self._resetTranslate(node,true);if(Math.abs(e.gesture.deltaX)>swipeDist){self._removeClass(node,"opened");self._resetTranslate(node);ncache._opened=false;if(self.options.onBackPaneHidden){self.options.onBackPaneHidden(node)}if(ncache._backpane&&ncache._shovedir){self._removeClass(ncache._backpane,"notransition");self._resetTranslate(ncache._backpane,true);if(ncache._shovedir==="right"){self._translateEnd(ncache._backpane,-self.options.shovedPaneGap,0,0);self._addClass(ncache._backpane,"shovedleft")}else if(ncache._shovedir==="left"){self._translateEnd(ncache._backpane,self.options.shovedPaneGap,0,0);self._addClass(ncache._backpane,"shovedright")}}setTimeout(function(){self._removeClass(node,"draggedleft");self._removeClass(node,"draggedright")},300);setTimeout(function(){self._toggleControlsOn()},200)}else{if(ncache._backpane&&ncache._shovedir){self._removeClass(ncache._backpane,"notransition");self._resetTranslate(ncache._backpane,true);if(ncache._backpane&&ncache._shovedir){self._removeClass(ncache._backpane,"notransition");self._resetTranslate(ncache._backpane,true)}}}};this._endClosedPaneDrag=function(e,node,ncache){self._removeClass(node,"notransition");self._resetTranslate(node,true);if(Math.abs(e.gesture.deltaX)>swipeDist){self._addClass(node,"opened");ncache._opened=true;if(ncache._thisdrag==="right"){self._addClass(node,"draggedright");self._translateEnd(node,window.innerWidth-self.options.openedPaneGap,0,0,null,true)}else if(ncache._thisdrag==="left"){self._addClass(node,"draggedleft");self._translateEnd(node,-(window.innerWidth-self.options.openedPaneGap),0,0,null,true)}if(ncache._shovedir==="right"){self._removeClass(ncache._backpane,"shovedleft")}else if(ncache._shovedir==="left"){self._removeClass(ncache._backpane,"shovedright")}if(ncache._backpane&&ncache._shovedir){self._removeClass(ncache._backpane,"notransition");self._resetTranslate(ncache._backpane,true);self._translateEnd(ncache._backpane,0,0,0,null,true)}self._toggleControlsOffExcept(ncache._backpane)}else{self._resetTranslate(node,true);if(ncache._backpane&&ncache._shovedir){self._removeClass(ncache._backpane,"notransition");self._resetTranslate(ncache._backpane,true)}setTimeout(function(){self._toggleControlsOn()},200)}};this._toggleHiddenPane=function(e,node,ncache){var pos=node.getAttribute("data-tulito-pos");var shove=node.getAttribute("data-tulito-shove");var panegap;var tpanegap=panegap=node.getAttribute("data-tulito-panegap");var shoveel=document.querySelector('[data-tulito-id="'+shove+'"]');ncache._shoveel=shoveel;ncache._panegap=panegap;if(panegap===null){panegap=self.options.openedHiddenPaneGap}else if(panegap==="full"){panegap=0}if(ncache._opened){ncache._opened=false;if(shove){if(pos==="left"){self._removeClass(ncache._shoveel,"shovedright");self._resetTranslate(ncache._shoveel,true)}else if(pos==="right"){self._removeClass(ncache._shoveel,"shovedleft");self._resetTranslate(ncache._shoveel,true)}}setTimeout(function(){self._toggleControlsOn()},200);ncache._opened=false;if(self.options.onHiddenPaneHidden){self.options.onHiddenPaneHidden(node)}setTimeout(function(){self._removeClass(node,"opened");if(tpanegap==="full"){self._removeClass(node,"full-pane")}},1)}else{if(shove){if(pos==="left"){setTimeout(function(){self._addClass(ncache._shoveel,"shovedright")},50);self._translateEnd(ncache._shoveel,self.options.shovedPaneGap*1.1,0,0,null,true)}else if(pos==="right"){setTimeout(function(){self._addClass(ncache._shoveel,"shovedleft")},50);self._translateEnd(ncache._shoveel,-(self.options.shovedPaneGap*1.1),0,0,null,true)}}self._toggleControlsOffExcept(node);self._hideAllHiddenPanes();self._addClass(node,"shown");if(tpanegap==="full"){self._addClass(node,"full-pane")}ncache._opened=true;if(pos==="left"){self._translateEnd(node,-panegap,0,0,null,true)}else if(pos==="right"){self._translateEnd(node,panegap,0,0,null,true)}else if(pos==="up"){self._translateEnd(node,0,panegap,0,null,true)}else if(pos==="down"){self._translateEnd(node,0,-panegap,0,null,true)}if(self.options.onHiddenPaneShown){self.options.onHiddenPaneShown(node)}setTimeout(function(){self._addClass(node,"opened")},1)}};this._toggleBackPane=function(e,node,ncache){var parentid=node.getAttribute("data-tulito-parent");var parent=document.querySelector('[data-tulito-id="'+parentid+'"]');var shovedir=node.getAttribute("data-tulito-shovedir");var shovedist;var tshovedist=shovedist=node.getAttribute("data-tulito-shovedist");var pcache=self._getCache(parent);ncache._shovedist=shovedist;if(shovedist===null){shovedist=self.options.shovedPaneGap}else if(shovedist==="full"){shovedist=window.innerWidth}if(pcache._opened){if(shovedir){self._removeClass(node,"notransition");self._resetTranslate(node)}var drag=node.getAttribute("data-tulito-parentdrag");if(drag==="left"){self._removeClass(parent,"draggedleft");if(shovedir==="right"){self._addClass(node,"shovedleft");self._translateEnd(node,-shovedist,0,0,null,true)}else if(shovedir==="left"){self._addClass(node,"shovedright");self._translateEnd(node,shovedist,0,0,null,true)}}else if(drag==="right"){self._removeClass(parent,"draggedright");if(shovedir==="right"){self._addClass(node,"shovedleft");self._translateEnd(node,-shovedist,0,0,null,true)}else if(shovedir==="left"){self._addClass(node,"shovedright");self._translateEnd(node,shovedist,0,0,null,true)}}self._removeClass(parent,"opened");if(tshovedist==="full"){self._removeClass(parent,"full-pane")}pcache._opened=false;self._resetTranslate(parent);if(self.options.onBackPaneHidden){self.options.onBackPaneHidden(node)}setTimeout(function(){self._toggleControlsOn()},200)}else{pcache._backpane=node;pcache._shovedir=shovedir;self._toggleControlsOffExcept(node);self._hideAllBackpanes();self._addClass(node,"shown");if(tshovedist==="full"){self._addClass(parent,"full-pane")}self._addClass(parent,"opened");pcache._opened=true;self._resetTranslate(parent,true);if(shovedir){self._removeClass(node,"notransition");self._resetTranslate(node,true)}if(self.options.onBackPaneShown){self.options.onBackPaneShown(node)}var pos=node.getAttribute("data-tulito-parentdrag");if(pos==="right"){pcache._thisdrag="right";self._addClass(parent,"draggedright");self._translateEnd(parent,window.innerWidth-self.options.openedPaneGap,0,0,null,true);if(shovedir==="left"){self._removeClass(node,"shovedright");self._translateEnd(node,0,0,0,null,true)}else if(shovedir==="right"){self._removeClass(node,"shovedleft");self._translateEnd(node,0,0,0,null,true)}}else if(pos==="left"){pcache._thisdrag="left";self._addClass(parent,"draggedleft");self._translateEnd(parent,-(window.innerWidth-self.options.openedPaneGap),0,0,null,true);if(shovedir==="left"){self._removeClass(node,"shovedright");self._translateEnd(node,0,0,0,null,true)}else if(shovedir==="right"){self._removeClass(node,"shovedleft");self._translateEnd(node,0,0,0,null,true)}}}};return this};if(typeof define=="function"&&typeof define.amd=="object"&&define.amd){define(function(){return new tulito})}else if(typeof module==="object"&&typeof module.exports==="object"){module.exports=new tulito}else{window.tulito=new tulito}})(this);