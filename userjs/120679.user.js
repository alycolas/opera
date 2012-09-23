// ==UserScript==
// @name           OpenGG.Clean.Player
// @namespace      http://OpenGG.me
// @description    OpenGG.Clean.Player
// @version        1.24
// @updateURL      https://userscripts.org/scripts/source/120679.meta.js
// @downloadURL    https://userscripts.org/scripts/source/120679.user.js
// @match          http://*/*
// @match          https://*/*
// @exclude        http://www.kuaipan.cn/*
// ==/UserScript==
(function () {
	//Goddamn sina weibo.
	//'use strict';
	function run(callback) {
		var script = document.createElement('script');
		script.textContent = '(' + callback.toString() + ')(window);';
		document.body.appendChild(script);
	}
	function main(Global) {
		var CONSTANTS = {
			PLAYER_DOM:	'object[data],embed[src],iframe[src]',
			PLAYERS: [
				{
					find: /^http:\/\/static\.youku\.com\/.*?q?(player|loader)(_[^.]+)?\.swf/,
					replace: 'http://player.opengg.me/loader.swf'
				},
				{
					find: /^http:\/\/js\.tudouui\.com\/.*?\/TudouVideoPlayer_Homer_[^.]*?.swf/,
					replace: 'http://player.opengg.me/TudouVideoPlayer_Homer_238.swf'
				},
				{
					find: /^http:\/\/player\.youku\.com\/player\.php\//,
					replace: 'http://player.opengg.me/player.php/'
				},
				{
					find: /^http:\/\/dp\.tudou\.com\/nplayer[^.]*?\.swf|http:\/\/js\.tudouui\.com\/doupao\/nplayer[^.]*?\.swf/,
					replace: 'http://player.opengg.me/nplayer.swf'
				},
				{
					find: /^http:\/\/www.tudou.com\/(([a-z]|programs)\/.*)/,
					replace: 'http://player.opengg.me/td.php/$1'
				}
			],
			SHARE_DOM: '#panel_share input,input#copyInput.txt',
			SHARES: [
				{
					find: /http:\/\/player\.youku\.com\/player\.php\//,
					replace: 'http://player.opengg.me/player.php/'
				},
				{
					find: /http:\/\/www.tudou.com\/(.*v\.swf)/,
					replace: 'http://player.opengg.me/td.php/$1'
				}
			],
			TIPS_HOLDER: '#miniheader,#gTop',
			TIPS: '<div class="tips_container">OpenGG.Clean.Player \u5DF2\u542F\u7528&emsp;<span class="tips_toggleWide">\u5bbd\u5c4f/\u7a84\u5c4f&emsp;</span><a href="http://opengg.me/781/opengg-clean-player/" style="color:blue" target="_blank">\u53CD\u9988</a>&emsp;<a href="http://opengg.me/donation/" style="color:red" title="\u6211\u8981\u6350\u52A9\u6B64\u9879\u76EE" target="_blank">\u6350\u52A9</a></div>',
			STYLE: '.playBox_thx #player.player,.playBox_thx #player.player object{min-height:' + Math.max(Global.innerHeight * 0.6, 580) + 'px !important}.tips_container{position:absolute;top:3em;padding:1em 2em;right:50px;color:green;opacity:0.4;background:#ddd;z-index:999999}.tips_container:hover{opacity:0.8}.tips_container .tips_toggleWide{color:red;cursor:pointer;display:none}',
			NODEINSERTED_HACK: '@-moz-keyframes nodeInserted{from{opacity:0.99;}to{opacity:1;}}@-webkit-keyframes nodeInserted{from{opacity:0.99;}to{opacity:1;}}@-o-keyframes nodeInserted{from{opacity:0.99;}to{opacity:1;}}@keyframes nodeInserted{from{opacity:0.99;}to{opacity:1;}}embed,object{animation-duration:.001s;-ms-animation-duration:.001s;-moz-animation-duration:.001s;-webkit-animation-duration:.001s;-o-animation-duration:.001s;animation-name:nodeInserted;-ms-animation-name:nodeInserted;-moz-animation-name:nodeInserted;-webkit-animation-name:nodeInserted;-o-animation-name:nodeInserted;}',
			TOGGLE_BTN: '.tips_container .tips_toggleWide'
		};
		var DONE = [];
		var UTIL = {
			addCss: function (str) {
				var style = document.createElement('style');
				style.textContent = str;
				document.head.appendChild(style);
			},
			procFlash: function (elem) {
				if (DONE.indexOf(elem) !== -1) {
					return;
				}
				if (this.reloadFlash(elem)) {
					DONE.push(elem);
				}
			},
			reloadFlash: function (elem) {
				var attrs = ['data', 'src'];
				var players = CONSTANTS.PLAYERS;
				var reloaded = false;
				UTIL.forEach(attrs, function (attr) {
					UTIL.forEach(players, function (player) {
						var find = player.find;
						var replace = player.replace;
						var value = elem[attr];
						if (value && find.test(value)) {
							var nextSibling = elem.nextSibling;
							var parentNode = elem.parentNode;
							var clone = elem.cloneNode(true);
							clone[attr] = value.replace(find, replace);
							parentNode.removeChild(elem);
							parentNode.insertBefore(clone, nextSibling);
							//Baidu tieba shit.
							if(getComputedStyle(clone).display==='none'){
								clone.style.display='block';
							}
							reloaded = true;
						}
					});
				});
				return reloaded;
			},
			forEach: function (arr, callback) {
				if (this.isArrayLike(arr)) {
					if (Array.prototype.forEach) {
						Array.prototype.forEach.call(arr, callback);
					} else {
						var i = 0;
						for (i = 0; i < arr.length; ++i) {
							callback.call(arr[i], arr[i]);
						}
					}
				}
			},
			isArrayLike: function (obj) {
				if (typeof obj !== 'object') {
					return false;
				}
				var types = ['Array', 'NodeList', 'HTMLCollection'];
				var i = 0;
				for (i = 0; i < types.length; ++i) {
					if (Object.prototype.toString.call(obj).indexOf(types[i]) !== -1) {
						return true;
					}
				}
				return false;
			}
		};
		var STORE;
		(function(){
			var isStorage = true;
			if(!Global.localStorage){
				isStorage = false;
			}else{
				try{
					var key = String(Math.random());
					localStorage.setItem(key,'test');
					if(localStorage.getItem(key)!=='test'){
						throw 'not equal';
					}
					localStorage.removeItem(key);
				}catch(e){
					isStorage=false;
				}
			}
			STORE = {
				getItem: function(key){
					if(isStorage){
						return localStorage.getItem(key);
					}
				},
				setItem: function(key, value){
					if(isStorage){
						localStorage.setItem(key, value);
					}
				}
			};
		})();
		function init() {
			function onDOMNodeInsertedHandler(e) {
				var target = e.target;
				if (target.nodeType === 1 && /OBJECT|EMBED|IFRAME/ig.test(target.nodeName)) {
					UTIL.procFlash(target);
				}
			}
			function onAnimationStartHandler(e) {
				if (e.animationName === 'nodeInserted') {
					var target = e.target;
					if (target.nodeType === 1 && /OBJECT|EMBED|IFRAME/ig.test(target.nodeName)) {
						UTIL.procFlash(target);
					}
				}
			}
			function animationNotSupported(){
				var style = document.createElement('div').style;
				var arr = ['animation', 'MozAnimation', 'webkitAnimation', 'OAnimation'];
				for(var i =0;i<arr.length;++i){
					if( arr[i] in style){
						return false;
					}
				}
				return true;
			}
			/* animationstart not invoked in background tabs of chrome 21 */
			var all = document.querySelectorAll('OBJECT,EMBED,IFRAME');
			for(var i=0;i<all.length;++i){
				UTIL.procFlash(all[i]);
			}
			UTIL.addCss(CONSTANTS.NODEINSERTED_HACK);
			/*Firefox*/
			document.body.addEventListener('animationstart', onAnimationStartHandler, false);
			/*/Firefox*/
			/*Chrome*/
			document.body.addEventListener('webkitAnimationEnd', onAnimationStartHandler, false);
			/*/Chrome*/
			/*Opera 12+*/
			document.body.addEventListener('oAnimationStart', onAnimationStartHandler, false);
			/*/Opera 12+*/
			/*IE, but I never tested this*/
			document.body.addEventListener('msAnimationStart', onAnimationStartHandler, false);
			/*/IE, but I never tested this*/
			if (animationNotSupported()) {
				/*Old fashion, slower maybe*/
				document.body.addEventListener('DOMNodeInserted', onDOMNodeInsertedHandler, false);
				var matches = document.body.querySelectorAll(CONSTANTS.PLAYER_DOM);
				UTIL.forEach(matches, function (elem) {
					UTIL.procFlash(elem);
				});
			}
		}
		function tips() {
			var holder = document.body.querySelector(CONSTANTS.TIPS_HOLDER);
			if (holder) {
				var div = document.createElement('div');
				if (document.defaultView.getComputedStyle(holder, null).getPropertyValue('position') !== 'relative') {
					div.style.position = 'relative';
				}
				div.innerHTML = CONSTANTS.TIPS;
				holder.appendChild(div);
				UTIL.addCss(CONSTANTS.STYLE);
			}
		}
		function share(elem) {
			var pairs = CONSTANTS.SHARES;
			UTIL.forEach(pairs, function (item) {
				elem.value = elem.value.replace(item.find, item.replace);
			});
		}
		function setTHX(opt){
			var player = document.querySelector('object#movie_player');
			var parent = document.body.querySelector('.playBox');
			var wide = document.body.querySelector('.playBox_thx');
			if(opt&&player){
				try{
					player.setTHX(opt);
				}catch(e){}
				switch(opt){
					case 'on':
						if (parent && !wide) {
							parent.className += ' playBox_thx';
						}
						break;
					case 'off':
						if (parent && wide) {
							parent.className = 'playBox';
						}
						break;
				}
			}
		}
		var CONTROLLER = [
			{
				host: '.',
				fn: function () {
					init();
				}
			},
			{
				host: 'youku.com',
				fn: function () {
					var matches = document.body.querySelectorAll(CONSTANTS.SHARE_DOM);
					UTIL.forEach(matches, share);

					tips();

					if(STORE.getItem('THX')==='on'){
						setTHX(STORE.getItem('THX'));
					}

					var toggle = document.body.querySelector(CONSTANTS.TOGGLE_BTN);
					toggle.style.display='inline';
					toggle.addEventListener('click',function(){
						STORE.setItem('THX',STORE.getItem('THX')==='on'?'off':'on');
						setTHX(STORE.getItem('THX'));
					},false);
				}
			},
			{
				host: 'tudou.com',
				fn: function () {
					function hack(){
						var TUI_copyToClip = Global.TUI&&Global.TUI.copyToClip;
						if(TUI_copyToClip&&TUI_copyToClip.toString().indexOf('arguments')===-1){
							Global.TUI.copyToClip = function () {
								var matches = document.body.querySelectorAll(CONSTANTS.SHARE_DOM);
								UTIL.forEach(matches, share);
								TUI_copyToClip.apply(Global.TUI, arguments);
							};
							clearInterval(inter);
						}
					}
					tips();
					var tudouPlayer = document.body.querySelector('#playerObject');
					var normalDom = document.querySelector('.normal');
					if (tudouPlayer && normalDom) {
						normalDom.className = normalDom.className.replace('normal','widescreen');
					}
					var inter = setInterval(hack,100);
					try{
						Global.playerEx.event.fire('scale',[true]);
					}catch(e){}
				}
			}
		];
		var host = location.host;
		function PROC(item) {
			if (host.indexOf(item.host) !== -1) {
				item.fn();
				return;
			}
		}
		UTIL.forEach(CONTROLLER, PROC);
	}
	var isFirefox = (typeof unsafeWindow !== 'undefined')&&(navigator.userAgent.indexOf('Firefox')!==-1);
	if (isFirefox) {
		main(unsafeWindow);
	} else {
		run(main);
	}
})();