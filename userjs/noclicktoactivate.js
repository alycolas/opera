// ==UserScript==
// @name noClickToActivate
// @author NLF
// @description 解除opera的插件需要点击一下激活才能用的问题.
// @create 2011-8-13
// @lastmodified 2011-8-13
// @version 1.0.0.1
// @namespace  http://userscripts.org/users/NLF
// @include http*
// @exclude http://www.alimama.com/*
// ==/UserScript==


(function(window,document){
	if(!window.opera)return;

	var srcFn=function(){
		window.addEventListener('message',function(e){
			var data=e.data;
			if(typeof data!='string' || data.indexOf('noClickToActivate')!=0)return;
			var random=data.slice(17);
			var elem=window[random];
			delete window[random];
			if(!elem)return;
			var nextSibling=elem.nextSibling;
			var parentNode=elem.parentNode;
			parentNode.removeChild(elem);
			if(nextSibling){
				parentNode.insertBefore(elem,nextSibling);
			}else{
				parentNode.appendChild(elem);
			};
		},false);
	};

	var script=document.createElement('script');
	script.src='data:text/javascript,'+encodeURIComponent('('+srcFn.toString()+')()');
	document.querySelector('head').appendChild(script);

	var done=[];
	window.opera.addEventListener('PluginInitialized',function(e){
		var target=e.element;
		if(done.indexOf(target)!=-1)return;
		done.push(target);
		var random=Math.random();
		window[random]=target;
		window.postMessage('noClickToActivate'+random,'*');
	},false);
})(window,window.document);