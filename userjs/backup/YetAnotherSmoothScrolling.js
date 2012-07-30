(function () {
var oConfig = {
		'red': [70,575,20,70,100,588,14,100],
		'green': [60,707,130,163,86,600,124,105],
		'blue': [30,792,187,416,70,823,244,110]
	};

// --------------- 配置 ------------------
var aConfig = oConfig['green'];
// --------------- 配置 ------------------

var yass = {
	m_pref: {},
	// m_prefservice: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch),
	// m_printinterface: QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebBrowserPrint),
	m_sobj: null,
	m_jumpto: 0,
	m_wheelactive: false,
	m_lastfunctime: 0,
	m_lasteventtime: 0,
	m_lasteventtime_vtp: 0,
	m_speed: 300,
	m_keys: null,
	m_lastcheckdesignmodearg: null,
	m_lastrefreshtargetarg: null,
	m_keyscrolltarget: null,
	m_clickedtarget: null,
	m_keyeventtarget: null,
	m_mousescrolltarget: null,
	m_mousemoved: [-100000,-100000],
	m_edgesize: 54,
	m_sumpixelscroll: 0,
	m_jumptoremain: 0,
	// m_timer: Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer),

	oneshot: function(func, delay) {
		setTimeout(func, delay);
		// this.m_timer.initWithCallback(func,delay,0);
	},
	range: function(t,min,max) { return (t<min)?min:((t>max)?max:t); },
	dump: function(s) { if(this.m_pref.dolog) dump(s); },

	getbedgesize: function() { return Math.min(this.m_sobj.body.clientHeight * 0.2, this.m_edgesize); },

	m_virtualtrackpad: {
		// m_timer: Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer),
		m_running: false,
		m_step: 0,
		m_reset: false,
		m_lastinstep: 0,
		m_lastinstep_cur: 0,

		oneshot: function(func, delay) {
			setTimeout(func, delay);
			// this.m_timer.initWithCallback(func,delay,0);
		},

		startvirtualtrackpad: function(step,time) {
			this.m_reset = true;
			//yass.dump("" + step + "/" + time + "  ");
			if(time > 30) return; // too big gap of time
			var laststep = this.m_lastinstep;
			var absstep = Math.abs(step);
			if(laststep + 50 < absstep) return; // ignore big positive gap
			// calcurate average from remaining 3 items
			if(absstep < 30) {
				this.m_step = 0; // step too small to determine as flick
			}
			else if(laststep < absstep) {
				//yass.dump(" flick ");
				this.m_step = step;
				if(this.m_running == false) this.virtualtrackpad();
			}

			// save current step
			this.m_lastinstep = absstep;
		},

		virtualtrackpad: function() {
			this.m_running = true;
			if(!this.m_reset){
				this.m_step *= 0.94;
				yass.handleEvent({
					type:"MozMousePixelScroll",
					detail:this.m_step,
					preventDefault:function(){},
					stopPropagation: function(){},
					generated:true
				});
			}
			//yass.dump("trackpad " + this.m_vtp_step + "\n");
			if(Math.abs(this.m_step) < 1 || (yass.m_sobj && yass.m_sobj.offset != 0)) { this.m_running = false; return; }
			this.m_reset = false;
			this.oneshot(function(){yass.m_virtualtrackpad.virtualtrackpad();},10);
		}
	},

	urgeRefreshTarget: function()
	{
		this.m_mousescrolltarget = null;
		this.m_keyscrolltarget = null;
		this.m_clickedtarget = null;
	},

	handleEvent: function(ev)
	{
		if (ev.type === 'BeforeEvent.mousedown') {
			ev = ev.event;
		}

		if(!this.m_pref.enabled) return;
		if(ev.altKey || ev.shiftKey || ev.ctrlKey) return;

		// if(gInPrintPreviewMode == true) return;

		var fromkeyboard = false;

		var mozscrollstep = 0;


		switch(ev.type)
		{

		case "MozMousePixelScroll":
			mozscrollstep = ev.detail;
		case "mousewheel":
			if(ev.axis && ev.axis == ev.HORIZONTAL_AXIS) return; // handle only vertical events
			this.m_keyscrolltarget = null;
			var mousex = ev.screenX - this.m_mousemoved[0];
			var mousey = ev.screenY - this.m_mousemoved[1];
			if((mousex*mousex)+(mousey*mousey) >= 16 || this.m_mousescrolltarget == null)
			{
				this.m_mousescrolltarget = ev.target;
				this.m_mousemoved = [ev.screenX,ev.screenY];
				this.refreshTarget(ev.target,ev.detail);
			}
			break;

		case "shortcut":
			// sometimes happens on ff3 and this event must be ignored.
			if(this.m_keyeventtarget &&
				this.m_keyeventtarget.tagName.toLowerCase() == "input" &&
				this.m_keyeventtarget.getAttribute("type").toLowerCase() == "text") { return; }
			fromkeyboard = true;
			this.m_mousescrolltarget = null;
			this.m_clickedtarget = null;
			break;

		case "keydown_sidebar":
			this.refreshTarget(null,null);
			return;

		case "keydown":
			this.m_keyeventtarget = ev.target;
			this.checkDesignMode(ev);
			if(this.m_keyscrolltarget == null || this.m_sobj == null || this.m_clickedtarget != null) {
				var t = this.m_clickedtarget ? this.m_clickedtarget : ev.target;
				this.refreshTarget(t,ev.detail);
				this.m_keyscrolltarget = ev.target;
			}
			return;

		case "TabSelect":
			this.refreshTarget(null,null);
			this.m_lastcheckdesignmodearg = null;
			this.urgeRefreshTarget();
			this.checkDesignMode(ev);
			return;

		case "DOMContentLoaded":
			this.m_lastcheckdesignmodearg = null;
			this.urgeRefreshTarget();
			this.checkDesignMode(ev);
			return;

		case "resize":
			this.urgeRefreshTarget();
			return;

		case "mousedown":
			this.m_clickedtarget = ev.target;
			//this.m_wheelactive = false;
			if(this.m_sobj && this.m_sobj.offset/this.m_lastd < 0) return;
			this.m_jumpto = this.m_vpos;
			return;

		default:
			return;
		}

		if(!this.m_sobj) { return; }

		ev.preventDefault();

		if(ev.detail == 0) return; // maybe this fixes microsoft smooth wheel problem

		var ctm = (new Date()).getTime();

		var detailsq = ev.detail*ev.detail;
		var pagescroll = (detailsq == 4);
		var wholepagescroll = (detailsq == 9);

		this.m_speed = (this.m_speed + Math.min(300, ctm - this.m_lasteventtime)) / 2;

		var edgemargin = (0.64 / (fromkeyboard ? this.m_pref.kbddumping : this.m_pref.wheeldumping)) + ((this.m_edgesize==0)?2:0) ;
		var edgelimit = this.getbedgesize() + edgemargin + 25;

		// branch for pixel scroller
		// set "step" and "this.m_lasteventtime"
		var step = 0;
		if(mozscrollstep != 0)
		{
			var absscrollstep = Math.abs(mozscrollstep);
			step = absscrollstep;
			var p = 300;
			if(this.m_pref.useflickemulation) {
				if(!("generated" in ev)) {
					this.m_virtualtrackpad.startvirtualtrackpad(mozscrollstep, ctm-this.m_lasteventtime_vtp);
					this.m_lasteventtime_vtp = ctm;
				}
			}
			this.m_sumpixelscroll += absscrollstep;
			if(this.m_sumpixelscroll >= p) { this.m_sumpixelscroll %= p; this.m_lasteventtime = ctm; }
		}
		else
		{
			// branch of step
			step =
			(fromkeyboard) ?
				((pagescroll) ?
					Math.max(0, this.m_sobj.body.clientHeight - this.m_pref.pagemargin) :
					((wholepagescroll) ?
						(this.m_sobj.maxscroll + 100) :
						this.m_pref.kbdstep)) :
				this.m_pref.wheelstep;

			this.m_lasteventtime = ctm;
		}

		if(!this.m_wheelactive)
		{
			this.m_sobj.refreshmaxscroll();
			this.m_beginsmoothtime = ctm;
			this.m_resetsmooth = 0;
			this.m_reset = 0;
			this.m_lastd = 0;
			var delta =  (step-1) * ((ev.detail<0)?-1:1);
			// something special power prevents scrollTop to be just 1pixel up so
			this.m_sobj.body.scrollTop = (this.m_sobj.body.scrollTop - ((ev.detail<0)?1.0000001:-1));
			this.m_jumpto = this.m_sobj.body.scrollTop - 0 + delta
				+ ((ev.detail*this.m_jumptoremain>0)?this.m_jumptoremain:0);
			this.m_jumpto = this.range(this.m_jumpto, -edgelimit, this.m_sobj.maxscroll + edgelimit);
			this.m_jumptoremain = 0;
			this.m_wheelactive = true;
			this.m_lastscrolltop = this.m_sobj.body.scrollTop;
			this.m_lastfunctime = (new Date()).getTime() - 17;
			this.m_vpos = this.m_sobj.body.scrollTop;
			this.funcwheel(fromkeyboard,delta,edgemargin);
		}
		else
		{
			this.m_resetsmooth = 1;

			var accel = 1.0;

			if(fromkeyboard) {
				if(!pagescroll) accel = this.m_pref.kbdaccel/100;
			} else {
				if(this.m_sobj.offset == 0 && (this.m_jumpto - this.m_vpos) * ev.detail < 0) {
					this.m_jumpto += (this.m_vpos - this.m_jumpto) * 0.92;
					return;
				}
				accel = this.range(this.m_pref.wheelaccel/this.m_speed, 1.0, (400/step));
			}
			var delta = step*((ev.detail<0)?-1:1);
			this.m_jumpto += delta * accel;
			this.m_jumpto = this.range(this.m_jumpto, -edgelimit, this.m_sobj.maxscroll + edgelimit);
		}
	},

	// class scroller that have no edge element
	scroller_noedge: (function(){
		var F = function(orig,b,type,w,h,log){
			this.target = orig;
			this.body = b;
			this.scrolltype = type;
			this.width = w;
			this.height = h;
			this.log = log;
			this.offset = 0;
		};
		F.prototype = {
			activate: function() {
				this.etop = yass.edgetop;
				this.ebot = yass.edgebot;
				this.innerframe = (this.body.ownerDocument.defaultView.frameElement)?true:false;
				this.maxscroll = this.body.scrollHeight - this.body.clientHeight;
			},
			adjust: function(newp,oldp) {
				// adjust maxscroll
				var scrollsize = this.body.scrollHeight - this.body.clientHeight;
				if(scrollsize != this.maxscroll) this.maxscroll = scrollsize;
				if(this.maxscroll == 0) return false;
				// on the edge - must be stopped explicitly
				if(this.body.scrollTop == 0 || this.body.scrollTop == this.maxscroll) return false;
				return true;
			},
			scrollovercheck: function(hint) {
				dump("yass - must not be called.");
				return false;
			},
			stop: function() {
			},
			release: function() {
			},
			render: function(offsetscroll,pos) {
				this.body.scrollTop = pos;
			},
			restoreedges: function(){
			},
			refreshmaxscroll: function(){
				this.maxscroll = this.body.scrollHeight - this.body.clientHeight;
			}
		};
		return F;
	})(),

	// class scroller
	scroller: (function(){
		var F = function(orig,b,type,w,h,log){
			this.target = orig;
			this.body = b;
			this.scrolltype = type;
			this.width = w;
			this.height = h;
			this.log = log;
			this.offset = 0;
		};
		F.prototype = {
			activate: function() {
				this.etop = yass.edgetop;
				this.ebot = yass.edgebot;
				this.body._yass_ownedby = this;
				this.offset = 0;
				var h0 = this.ebot.setowner(this.body);
				var h1 = this.etop.setowner(this.body);
				this.innerframe = (this.body.ownerDocument.defaultView.frameElement)?true:false;
				this.maxscroll = this.body.scrollHeight - this.body.clientHeight - h0 - h1;
			},
			refreshmaxscroll: function(){
				this.maxscroll = this.body.scrollHeight - this.body.clientHeight;
			},
			adjust: function(newp,oldp) {
				// adjust maxscroll
				var scrollsize = this.body.scrollHeight - this.body.clientHeight - this.ebot.e.clientHeight - this.etop.e.clientHeight;
				if(scrollsize != this.maxscroll) {
					// there are evil pages that have 100% height child or absolutely positioned child. scrollHeight not be changed by making botedge height changed
					if(this._lastscrollheight == this.body.scrollHeight && newp > this.maxscroll) return false; // bot edge's height change changes maxscroll - emergency stop
					this.maxscroll = scrollsize;
				}
				this._lastscrollheight = this.body.scrollHeight;
				if(this.maxscroll == 0) return false;

				// when entering top edge
				if(oldp >= 0 && newp < 0) {
					this.etop.adjust(this.ebot);
				}
				// when entering bottom edge
				else if(oldp <= this.maxscroll && newp > this.maxscroll) {
					this.ebot.adjust();
				}

				return true;
			},
			restoreedges: function() {
				if(this.etop.restore(this.body.ownerDocument) == true)
					this.ebot.restore(this.body.ownerDocument);
			},
			scrollovercheck: function(hint) {
				if(this.offset == 0) {
					return (
					(hint > 0 && this.body.scrollTop < this.maxscroll) ||
					(hint < 0 && this.body.scrollTop > 0));
				} else {
					return !((this.offset > 0 && hint > 0) || (this.offset < 0 && hint < 0));
				}
			},
			stop: function() {
				this.etop.e.style.height =
				this.ebot.e.style.height = "0px";
				this.etop.render_abs(0);
				if(this.offset < 0) this.body.scrollTop = 0;
				//if(this.body.scrollTop > this.maxscroll) this.body.scrollTop = this.maxscroll;
				this.offset = 0;
			},
			release: function() {
				this.stop();
				if(this.body._yass_ownedby == this) this.body._yass_ownedby = null;
			},
			// realize virtual offset
			render: function(offsetscroll,pos) {
				this.offset = offsetscroll;
				if(offsetscroll < 0)
				{
					offsetscroll = -offsetscroll; // invert
					var h = this.etop.e.clientHeight;
					if(h < offsetscroll) h += 64;
					this.etop.render_abs(h);
					this.etop.e.style.height = h + "px";
					this.body.scrollTop = h - offsetscroll;
				}
				else if(offsetscroll > 0)
				{
					if(this.ebot.e.clientHeight < offsetscroll ) this.ebot.e.style.height = (offsetscroll + 50) + "px";
					this.body.scrollTop = this.maxscroll + offsetscroll;
				}
				else
				{
					this.etop.e.style.height =
					this.ebot.e.style.height = "0px";
					this.etop.render_abs(0);
					this.body.scrollTop = pos;
				}
			}
		};
		return F;
	})(),

	// edgetop object extends div element
	edgetop: {
		e: null,

		dummy :null,

		eorig: (function(){
			var e = document.createElement("div");
			e.style.backgroundImage = "url(chrome://yass/content/edgebgtop.png)";
			e.style.backgroundAttachment =
			e.style.backgroundAttachment = "scroll";
			e.style.backgroundPosition = "bottom";
			e.style.height =
			e.style.borderWidth =
			e.style.margin =
			e.style.padding = "0px";
			e.style.display = "block";
			//e.style.postion = "absolute";
			//e.style.left = e.style.top = "0px";
			e.setAttribute("id","yass_top_edge");
			return e;
		})(),

		dummyorig: (function(){
			var e = document.createElement("div");
			e.style.height = e.style.width = "1px";
			e.style.borderWidth =
			e.style.margin =
			e.style.padding = "0px";
			e.style.display = "block";
			//e.style.postion = "absolute";
			//e.style.left = e.style.top = "0px";
			e.setAttribute("id","yass_top_edge_dummy");
			return e;
		})(),

		_owner: null,
		_abselm: [],

		restore: function(doc) {
			var e = doc.getElementById("yass_top_edge");
			if(e == null) return false;
			if(e == this.e) return false;
			yass.dump("different instance of the edge created and catched up\n");
			this.e = e;
			this.dummy = doc.getElementById("yass_top_edge_dummy");
			return true;
		},

		setowner: function(owner) {
			this.e = this.eorig;
			this.dummy = this.dummyorig;
			this.abselms = [];
			// edges must be inserted inside of body not html even if html is scrollable
			// body may return frameset but owner must be scrollable something inside of frame, so it must not be, as far as here.
			var owner = (owner == owner.ownerDocument.documentElement) ? owner.ownerDocument.body : owner;
			if(this._owner == owner || this.e == owner) return this.e.clientHeight;
			if(this._owner) { try {
				this._owner.removeChild(this.e);
				this._owner.removeChild(this.dummy);
				if(this._ancientnode) this._ancientnode.style.marginTop = this._ancientnode_marginback; // restore offset - must be tested
			} catch(ex) {} }
			this.e.style.height = "0px";
			this.e.style.marginBottom = "0px";
			this._owner = owner;
			this._ancientnode = null;
			// detect body margin size
			var bodymargintop = 0;
			var bodymarginleft = 0;
			this._widthtarget = owner;
			if(owner == owner.ownerDocument.body) {
				var s = owner.ownerDocument.defaultView.getComputedStyle(owner,null);
				bodymargintop = parseInt(s.getPropertyValue("margin-top")); // as pixels
				bodymargintop += parseInt(s.getPropertyValue("padding-top")); // as pixels
				bodymarginleft = ((owner.parentNode.clientWidth - owner.offsetWidth)/2); // this way can get correct margin in case margin:0 auto
				//bodymarginleft = s.getPropertyCSSValue("margin-left").getFloatValue(5);
				this._widthtarget = owner.ownerDocument.documentElement;
				this._ancientnode = owner.ownerDocument.querySelector(
				"body>p:-moz-first-node,body>dl:-moz-first-node,body>multicol:-moz-first-node,body>blockquote:-moz-first-node,body>h1:-moz-first-node,"+
				"body>h2:-moz-first-node,body>h3:-moz-first-node,body>h4:-moz-first-node,body>h5:-moz-first-node,body>h6:-moz-first-node,body>listing:-moz-first-node,"+
				"body>plaintext:-moz-first-node,body>xmp:-moz-first-node,body>pre:-moz-first-node,body>ul:-moz-first-node,body>menu:-moz-first-node,body>dir:-moz-first-node,body>ol:-moz-first-node"
				); // compatible only with 3.5 and later versions
				// put dummy div for negate first node offset hack
				if(this._ancientnode){
					// check style for display:noe
					var astyle = owner.ownerDocument.defaultView.getComputedStyle(this._ancientnode,null);
					if(astyle.getPropertyValue("display") == "none") this._ancientnode = null;
				}
				if(this._ancientnode) {
					this._ancientnode_marginback =  this._ancientnode.style.marginTop;
					var origmargin = parseInt(owner.ownerDocument.defaultView.getComputedStyle(this._ancientnode,null).getPropertyValue("margin-top"));
					this._ancientnode.style.marginTop = (origmargin + bodymargintop) + "px";
				} else {
					// apply bodymargin to dummy element
					this.e.style.marginBottom = bodymargintop + "px";
				}
			}
			// collect absolute elements
			var elms = owner.children;
			for(i in elms){
				var e = elms[i];
				if(e.nodeName === undefined) continue;
				if(e.nodeName.toLowerCase() != "div") continue;
				if(e.id == "yass_bottom_edge") continue;
				var s = e.ownerDocument.defaultView.getComputedStyle(e,null);
				if(s.getPropertyValue("position") == "absolute"){
					var top = parseInt(s.getPropertyValue("top"));
					this.abselms.push([e,top]);
				}
			}
			this.dummy.style.marginTop = -(bodymargintop+1) + "px"; // negate docuemnt margin
			this.e.style.marginLeft = -bodymarginleft + "px";
			this.e.style.width = "1px";
			if(owner.childNodes.length == 0) owner.appendChild(this.e); // edge is below the dummy element
			else owner.insertBefore(this.e,owner.childNodes[0]);
			if(owner.childNodes.length == 0) owner.appendChild(this.dummy); // dummy is above
			else owner.insertBefore(this.dummy,owner.childNodes[0]);
			return 0;
		},

		adjust: function(ebot) {
			// adjust width
			//this.e.style.width = this._widthtarget.clientWidth + "px";
			// copy width from edge on the bottom
			this.e.style.width = ebot.e.ownerDocument.defaultView.getComputedStyle(ebot.e,null).getPropertyValue("width");
			// for firebug sidewindow : item inserted on top of children so late
			if(this._owner.childNodes[0] != this.dummy){
				this._owner.insertBefore(this.e,this._owner.childNodes[0]);
				this._owner.insertBefore(this.dummy,this._owner.childNodes[0]);
				yass.dump("top edge children order changed\n");
			}
		},

		render_abs: function(offset) {
			for(i in this.abselms){
				this.abselms[i][0].style.top = (this.abselms[i][1] + offset) + "px";
			}
		}
	},

	// edgebot object extends div element
	edgebot: {
		e: null,

		eabsolute: (function(){
			var e = document.createElement("div");
			e.style.backgroundImage = "url(chrome://yass/content/edgebgbot.png)";
			e.style.backgroundPosition = "0px 0px";
			e.style.position = "absolute";
			e.style.top =
			e.style.left =
			e.style.height =
			e.style.borderWidth =
			e.style.padding =
			e.style.margin = "0px";
			e.style.width = "100%";
			e.style.display = "block";
			e.setAttribute("id","yass_bottom_edge");
			return e;
		})(),

		estatic: (function(){
			var e = document.createElement("div");
			e.style.backgroundImage = "url(chrome://yass/content/edgebgbot.png)";
			e.style.backgroundPosition = "0px 0px";
			e.style.position = "static";
			e.style.height =
			e.style.borderWidth =
			e.style.padding =
			e.style.margin = "0px";
			e.style.width = "100%";
			e.style.display = "block";
			e.setAttribute("id","yass_bottom_edge");
			return e;
		})(),

		_owner: null,

		restore: function(doc) {
			this.e = doc.getElementById("yass_bottom_edge");
		},

		setowner: function(owner) {
			// edges must be inserted inside of body not html even if html is scrollable
			var body = owner.ownerDocument.body;
			var owner = (owner == owner.ownerDocument.documentElement) ? body : owner;
			if(this._owner == owner || this.e == owner) return this.e.clientHeight;
			if(this._owner) { try { this._owner.removeChild(this.e); } catch(e) {} }
			if(this.e) this.e.style.height = "0px";
			this._owner = owner;
			if(owner == body){
				this.e = this.eabsolute;
				// height hint is from html's if body is owner
				// body or html the one more difference between clientH and scrollH
				var doc = owner.ownerDocument.documentElement;
				var body_h = owner.scrollHeight;
				var doc_h = doc.scrollHeight;
				this._heighttarget = (body_h > doc_h) ? body : doc;
			} else {
				this.e = this.estatic;
				this._heighttarget = owner;
			}
			owner.appendChild(this.e);

			return 0;
		},

		adjust: function() {
			// adjust position top
			if(this._owner == null) return;
			this.e.style.top = this._heighttarget.scrollHeight + "px";
			// adjust children order
			if(this._owner.childNodes[this._owner.childNodes.length-1] != this.e){
				this._owner.appendChild(this.e);
				yass.dump("bottom edge children order changed\n");
			}
		}
	},

	funcwheel: function(kbd,idelta,edgemargin)
	{
		if(this.m_wheelactive == false || this.m_sobj == null)
		{
			this.m_wheelactive = false;
			if(yassev.m_enable) yassev.glow_indicator(0);
			if(this.m_sobj){ this.m_sobj.stop(); }
			return;
		}

		var bdumpfunc = (this.m_pref.prefversion <= 2) ?
			(function(t,_d) { return yass.range(t/_d + 0.2, 0.05, 1.0); }) :
			(function(t,_d) { return yass.range(t/_d, 0.05, 1.0); }) ;

		var dump = kbd?this.m_pref.kbddumping:this.m_pref.wheeldumping;
		var bdump = kbd?this.m_pref.kbdbdumping:this.m_pref.wheelbdumping;

		var tm = (new Date()).getTime();
		var frametime = (tm - this.m_lastfunctime);
		frametime = Math.min(frametime,51);
		this.m_lastfunctime = tm;

		if(frametime<=0) { this.oneshot(function(){yass.funcwheel(kbd,idelta,edgemargin);},1); return; }

		var fordest = (this.m_jumpto - this.m_vpos);

		if((this.m_sobj.offset/fordest) < 0) {
			dump = 0.45;
			bdump = 0.295;
		}

		bdump *= 2000;

		var d = 0;
		var looptimetotal = 0;
		var lastd = 0;

		do {
			var localfordest = fordest - d;
			var looptime = Math.min(17,frametime-looptimetotal);
			looptimetotal += looptime;

			var f = dump * (looptime / 17);

			// dumping of begining
			if(bdump>0.0)
			{
				// check reset beginning smooth
				if(this.m_resetsmooth > 0)
				{
					if(this.m_pref.prefversion >= 3){
						var lastsmoothtime = this.m_beginsmoothtime;
						var smoothtime = tm;
						var count = 0;
						do{
							if(smoothtime < lastsmoothtime) { break; }
							var timefromev = tm - smoothtime + 17 + looptimetotal;
							var b = bdumpfunc(timefromev,bdump);
							var x = this.m_lastd / (localfordest * f * b);
							if(x < 0) { this.m_beginsmoothtime = tm; break; }
							if(x < 1) { this.m_beginsmoothtime = smoothtime; break; }
							smoothtime -= 34;
							count++;
						}while(true);
					} else {
						this.m_beginsmoothtime = tm;
					}
					this.m_resetsmooth = 0;
				}

				var timefromev = tm - this.m_beginsmoothtime + 17 + looptimetotal;
				f *= bdumpfunc(timefromev,bdump);
			}

			d += localfordest * f;
			if(lastd == 0) lastd = d;

		}while(frametime-looptimetotal > 4);

		this.m_lastd = lastd;

		var lastmvpos = this.m_vpos;
		this.m_vpos += d;

		var lenfordest = fordest*fordest;

		// adjust maxscroll (autopagerize or somthing dynamically add elements on m_sobj.body)
		if(this.m_sobj.adjust(this.m_vpos,lastmvpos) == false) {
			this.m_wheelactive = false;
			if(yassev.m_enable) yassev.glow_indicator(0);
			this.m_sobj.stop();
			return;
		}

		if(yassev.m_enable)
		{
			yassev.glow_indicator(this.range(Math.abs(fordest)/(kbd?this.m_pref.kbdstep:this.m_pref.wheelstep),0,1.0));
		}

		// get virtual scrolltop offset
		var ofs = this.getbedgesize(); // offset size
		var offsetscroll = 0;
		if(this.m_vpos < 0)
		{
			offsetscroll = this.m_vpos;
			//if((d*d < 0.9) && lenfordest < 400 && this.m_jumpto != edgemargin)
			if(this.m_jumpto != edgemargin && (d*d < ofs/(ofs-Math.min(-offsetscroll,ofs))-1))
				{ this.m_jumpto = edgemargin; this.m_resetsmooth = 1; }
			if(this.m_sobj.innerframe) this.urgeRefreshTarget(); // forcibly reset scroll target and prompt to check scroll over
		}
		else if(this.m_vpos > this.m_sobj.maxscroll)
		{
			offsetscroll = this.m_vpos - this.m_sobj.maxscroll;
			//if((d*d < 0.9) && lenfordest < 400 && this.m_jumpto != this.m_sobj.maxscroll - edgemargin)
			if(this.m_jumpto != this.m_sobj.maxscroll - edgemargin && (d*d < ofs/(ofs-Math.min(offsetscroll,ofs))-1))
				{ this.m_jumpto = this.m_sobj.maxscroll - edgemargin; this.m_resetsmooth = 1; }
			if(this.m_sobj.innerframe) this.urgeRefreshTarget(); // forcibly reset scroll target and prompt to check scroll over
		}
		else if(lenfordest<=1.0 || (lenfordest<100.0 && d*d<0.2) || this.m_sobj.body.scrollTop != this.m_lastscrolltop )
		{
			this.m_wheelactive = false;
			this.m_sobj.stop();
			this.m_jumptoremain = fordest;
			if(yassev.m_enable) yassev.glow_indicator(0);
			return;
		}

		this.m_sobj.render(offsetscroll, this.m_vpos);

		this.m_lastscrolltop = this.m_sobj.body.scrollTop;

		this.oneshot(function(){yass.funcwheel(kbd,idelta,edgemargin);},10);
	},

	toggleKeyHook: function(b)
	{
		var cursor = yass.m_pref.usekbd;
		var pagejump = yass.m_pref.usepagejump;
		var wholejump = yass.m_pref.usewholejump;

		for(var i = 0; i < this.m_keys.length; i++)
		{
			var disabled = "true";
			if(b && ((i <= 1 && cursor) || (i >= 2 && i <= 5 && pagejump) || (i >= 6 && wholejump))) disabled = "false";
			this.m_keys[i].setAttribute("disabled",disabled);
		}
	},

	refreshTarget: function(target,detail)
	{
		// the reason this is here is just frequency of execution.
		if(this.m_sobj)	this.m_sobj.restoreedges();

		// externally ordered for releasing of m_sobj
		if(target == null) {
			if(this.m_sobj) this.m_sobj.release();
			this.m_sobj = null;
			return;
		}

		var newobj = this.findNodeToScroll(target,detail,"");
		// null : stop immediately
		// object not activated : change to it
		// 1 : do not change the target

		if(newobj === 1)  return;

		if(newobj == null)
		{
			this.m_wheelactive = false;
			if(this.m_sobj) this.m_sobj.release();
			this.m_sobj = null;
			this.dump("N: target null\n");
		}
		else if(this.m_sobj && newobj.body != this.m_sobj.body)
		{
			this.m_wheelactive = false;
			this.m_sobj.release();
			this.m_sobj = newobj;
			this.m_sobj.activate();
			this.dump("A:");
		}
		else if(this.m_sobj == null)
		{
			this.m_sobj = newobj;
			this.m_sobj.activate();
			this.dump("B:");
		}

		if(newobj) { this.dump(newobj.log + "\n"); }
	},

	checkDesignMode: function(ev)
	{
		if(ev.target == this.m_lastcheckdesignmodearg) return;
		this.m_lastcheckdesignmodearg = ev.target;

		var b = true;
		var mode = (ev.target.ownerDocument && ev.target.ownerDocument.designMode)
			? ev.target.ownerDocument.designMode : "off";
		if(mode && mode.toLowerCase() == "on") b = false;
		if(ev.target.getAttribute && ev.target.getAttribute("contenteditable")) b = false;
		this.toggleKeyHook(b);
	},

	// based on the code in All-in-One Gestures
	findNodeToScroll: function(orig,hint,log)
	{
		function getstyle(e, pname)
		{
			var p = e.ownerDocument.defaultView.getComputedStyle(e, "").getPropertyValue(pname);
			var val = parseFloat(p);
			if(!isNaN(val)) return Math.ceil(val);
			if(p == "thin") return 1;
			if(p == "medium") return 3;
			if(p == "thick") return 5;
			return 0;
		}

		// 0 neither scrollable 1 vertical only  2 horizontal only 3 both
		function getscrolltype(wscroll, wclient, hscroll, hclient)
		{
			if(hclient < 50) return 0;
			if(hscroll - hclient < 10) hclient = hscroll; // too small to scroll
			//if(hscroll - hclient == 1) hclient += 1; // there are some region unmovable really but looks 1px scrollable
			var flag = 0;
			if(wscroll > wclient) flag += 1;
			if(hscroll > hclient) flag += 2;
			return flag;
		}

		function newobject(p)
		{
			var editable = false;
			if(p.parentNode && p.parentNode.nodeName.toLowerCase() == "textarea") editable = true;
			var mode = (p.ownerDocument && p.ownerDocument.designMode)
				? p.ownerDocument.designMode : "off";
			if(mode && mode.toLowerCase() == "on") editable = true;
			if(p.getAttribute("contenteditable")) editable = true;

			if(editable) return yass.scroller_noedge;
			return (yass.m_edgesize == 0 || orig.baseURI.indexOf("//firebug") > 0) ? yass.scroller_noedge : yass.scroller;
		}

		// true: scrollable / false: bottom most or top most
		// this is called onto html or body only
		var scrollovercheck =
			(!hint)?
			(function(){return true;}):(
			(hint<0)?
				(function(fe,n,a,b){
					if(fe == null) return true;
					return (("_yass_ownedby" in n) && n._yass_ownedby) ? n._yass_ownedby.scrollovercheck(hint) : (a>0);
				}):
				(function(fe,n,a,b){
					if(fe == null) return true;
					return (("_yass_ownedby" in n) && n._yass_ownedby) ? n._yass_ownedby.scrollovercheck(hint) : (a<b)&&(b>1); // <- magic code | there are some region unmovable really but looks 1px scrollable
				})
		);

		// select element have scrollable parameters even if they are popup window type
		// directly rendered selectable pane return option for origin of event
		if(orig.nodeName.toLowerCase() == "select") orig = orig.parentNode;

		var doc = orig.ownerDocument.documentElement;
		if(doc && doc.nodeName.toLowerCase() != "html") { this.dump("doc is " + doc.nodeName + " not html\n"); return null; }

		var bodies = doc.getElementsByTagName("body");
		if(!bodies || bodies.length == 0) { this.dump("no body\n"); return null; }
		var body = bodies[0];

		var node = (orig == doc) ? body : orig;

		var frameelement = orig.ownerDocument.defaultView.frameElement;

		// if this is in a unscrollable frame element
		if(frameelement && frameelement.scrolling && frameelement.scrolling.toLowerCase() == "no")
		{
			return this.findNodeToScroll(frameelement.ownerDocument.documentElement,hint,log + "!");
		}

		do{
			var nodename = node.nodeName.toLowerCase();

			/*log*/log += nodename;

			/***/try{

			if(/^(option|optgroup)$/.test(nodename)) { this.dump("option found :" + log); return null; }

			var overflowprop = node.ownerDocument.defaultView.getComputedStyle(node, "").getPropertyValue("overflow");

			if(node.clientWidth && node.clientHeight &&
				(overflowprop != "hidden") &&
				(node == doc || node == body || overflowprop != "visible")
			  )
			{
				var realwidth = node.clientWidth + getstyle(node,"border-left-width") + getstyle(node,"border-right-width");
				var realheight = node.clientHeight + getstyle(node,"border-top-width") + getstyle(node,"border-bottom-width");

				var scrolltype = getscrolltype(node.scrollWidth, realwidth, node.scrollHeight, realheight);
				/*log*/log += "(" + node.scrollTop + " " + (node.scrollHeight-realheight) + ")";

				if((scrolltype >= 2) &&
					// scroll focus overflow applied only on inner frame (HTML|BODY)
					((node != doc && node != body) || scrollovercheck(frameelement,node,node.scrollTop,node.scrollHeight-realheight))
				)
				{
					return new (newobject(node))(orig,node,scrolltype,realwidth,realheight,log);
				}
			}

			if(node == doc) break;

			/***/}catch(e){}

			/*log*/log += ">";

			node = node.parentNode;

		}while(node);

		if(frameelement)
		{
			var upper = this.findNodeToScroll(frameelement.ownerDocument.documentElement,hint,log + "!");
			if(upper != null) return upper;
			return 1;
		}

		// no scrollable area found in content ( mainly for image only page to handle )

		if(body.clientHeight < body.scrollHeight) {
			log += " *DEFAULT body*";
			return new (newobject(body))(orig,body,3,body.clientWidth,body.clientHeight,log);
		}
		if(doc.clientHeight < doc.scrollHeight) {
			log += " *DEFAULT html*";
			return new (newobject(doc))(orig,doc,3,doc.clientWidth,doc.clientHeight,log);
		}

		this.dump(log + " *continue*\n");
		return 1;
	},

	refresh_preferences: function()
	{
		this.refreshTarget(null,null);

		var f;

		var ps = this.m_prefservice;

		var presetid = 0;
		var presets = aConfig;

		this.m_pref.wheelstep = presets[0];
		this.m_pref.wheeldumping = (900-presets[1])/1000;
		this.m_pref.wheelbdumping = presets[2]/890;
		this.m_pref.wheelaccel = presets[3];
		this.m_pref.kbdstep = presets[4];
		this.m_pref.kbddumping = (900-presets[5])/1000;
		this.m_pref.kbdbdumping = presets[6]/890;
		this.m_pref.kbdaccel = presets[7];
		this.m_pref.usekbd = true;
		this.m_pref.enabled = true;
		this.m_pref.usepagejump = false;
		this.m_pref.pagemargin = 40;
		this.m_pref.prefversion = 3;
		this.m_pref.usewholejump = false;
		this.m_pref.usepixelscroll = false;
		this.m_pref.useflickemulation = false;
		this.m_pref.dolog = false;
		try{ this.m_pref.dolog = ps.getBoolPref("extensions.yass.dolog"); } catch(e) {}

		this.m_edgesize = 0;

		// status bar color indicator
		var showstatus = false;
		// document.getElementById("yass_status").hidden = !showstatus;
		yassev = {};
		yassev.m_enable = showstatus;
		// yassev.update_indicator(presetid);

		// switch event listener
		// window.removeEventListener("MozMousePixelScroll",yass,false);
		window.removeEventListener("mousewheel",yass,false);

		// if(this.m_pref.usepixelscroll)
		    // window.addEventListener("MozMousePixelScroll",yass,false);
		// else
			window.addEventListener("mousewheel",yass,false);


		// contextmenu
		this.m_pref.showcontextmenu = false;

		// key
		/*{
			var doc = window.document;
			var keyset = doc.getElementsByTagName("keyset")[0];
			if(!keyset) keyset = doc.body.appendChild(doc.createElement("keyset"));

			if(!this.m_keys)
			{
				this.m_keys = [];

				var k = keyset.appendChild(doc.createElement("key"));
				k.setAttribute("id","YASS - Scroll Down Smoothly");
				k.setAttribute("modifiers","");
				k.setAttribute("keycode","VK_DOWN");
				k.setAttribute("oncommand","yass.scroll(1);");
				this.m_keys.push(k);

				k = keyset.appendChild(doc.createElement("key"));
				k.setAttribute("id","YASS - Scroll Up Smoothly");
				k.setAttribute("modifiers","");
				k.setAttribute("keycode","VK_UP");
				k.setAttribute("oncommand","yass.scroll(-1);");
				this.m_keys.push(k);

				//

				k = keyset.appendChild(doc.createElement("key"));
				k.setAttribute("id","YASS - Page Down Smoothly");
				k.setAttribute("modifiers","");
				k.setAttribute("keycode","VK_PAGE_DOWN");
				k.setAttribute("oncommand","yass.scroll(2);");
				this.m_keys.push(k);

				k = keyset.appendChild(doc.createElement("key"));
				k.setAttribute("id","YASS - Page Up Smoothly");
				k.setAttribute("modifiers","");
				k.setAttribute("keycode","VK_PAGE_UP");
				k.setAttribute("oncommand","yass.scroll(-2);");
				this.m_keys.push(k);

				k = keyset.appendChild(doc.createElement("key"));
				k.setAttribute("id","YASS - Spacebar Down Smoothly ");
				k.setAttribute("modifiers","");
				k.setAttribute("key"," ");
				k.setAttribute("oncommand","yass.scroll(2);");
				this.m_keys.push(k);

				k = keyset.appendChild(doc.createElement("key"));
				k.setAttribute("id","YASS - Spacebar Up Smoothly ");
				k.setAttribute("modifiers","shift");
				k.setAttribute("key"," ");
				k.setAttribute("oncommand","yass.scroll(-2);");
				this.m_keys.push(k);

				k = keyset.appendChild(doc.createElement("key"));
				k.setAttribute("id","YASS - Go Home Smoothly ");
				k.setAttribute("modifiers","");
				k.setAttribute("keycode","VK_HOME");
				k.setAttribute("oncommand","yass.scroll(-3);");
				this.m_keys.push(k);

				k = keyset.appendChild(doc.createElement("key"));
				k.setAttribute("id","YASS - Go End Smoothly ");
				k.setAttribute("modifiers","");
				k.setAttribute("keycode","VK_END");
				k.setAttribute("oncommand","yass.scroll(3);");
				this.m_keys.push(k);
			}
			this.toggleKeyHook(this.m_pref.enabled);
		} */
	},

	scroll: function(val)
	{
		var ev = { preventDefault: function(){}, stopPropagation: function(){}, detail: val, type: "shortcut" };
		this.handleEvent(ev);
	},

	change_preset: function(val)
	{
		this.m_prefservice.setCharPref("extensions.yass.selectedpreset",val);
		this.refresh_preferences(null);
	},

	toggle_enable: function(sw)
	{
		this.m_prefservice.setCharPref("extensions.yass.enabled",sw);
		this.refresh_preferences(null);
	},

	_e_:0
};


// window.addEventListener("load",function(){
(function(){
	var unload = function()
	{
		yass.refreshTarget(null,null);
		window.removeEventListener("DOMContentLoaded",yass,false);
		// getBrowser().tabContainer.removeEventListener("TabSelect",yass,false);
		window.removeEventListener("resize",yass,false);
	};

	try{unload();}catch(e){}

	window.addEventListener("DOMContentLoaded",yass,false);
	// getBrowser().tabContainer.addEventListener("TabSelect",yass,false);
	window.addEventListener("unload", unload,false);
	window.addEventListener("resize",yass,false);

	window.addEventListener("keydown",yass,true);
	// window.addEventListener("mousedown",yass,false);
	window.opera.addEventListener("BeforeEvent.mousedown",yass,false);

/* 	var ps = yass.m_prefservice;
	do{ // convert old preferences into new preference system
		var prefs = [];
		var v = ps.getCharPref("extensions.yass.prefversion") || "0";
		if(parseInt(v) >= 2)break;
		prefs.push(parseInt(ps.getCharPref("extensions.yass.wheelstep")));
		prefs.push(parseInt(ps.getCharPref("extensions.yass.wheeldumping")));
		prefs.push(parseInt(ps.getCharPref("extensions.yass.wheelbdumping")));
		prefs.push(parseInt(ps.getCharPref("extensions.yass.wheelaccel")));
		prefs.push(parseInt(ps.getCharPref("extensions.yass.kbdstep")));
		prefs.push(parseInt(ps.getCharPref("extensions.yass.kbddumping")));
		prefs.push(parseInt(ps.getCharPref("extensions.yass.kbdbdumping")));
		prefs.push(parseInt(ps.getCharPref("extensions.yass.kbdaccel")));
		ps.setCharPref("extensions.yass.preset.red",prefs.toString());
		ps.setCharPref("extensions.yass.prefversion","2");
		dump("yass: old parameters have been converted.\n");
	}while(0); */

	yass.oneshot(function(){yass.refresh_preferences();},10);
})();
// },false);
})();