// ==UserScript==
// @name picViewer
// @author NLF
// @description 围观图(Support Opera 10.1+ ,Fx3.6+(need GreaseMonkey or scriptish) , Chrome5.0+)
// @create 2011-6-15
// @lastmodified 2011-6-24
// @version 3.0.0.2
// @include http*
// ==/UserScript==


//opera执行会真实环境,包在匿名函数里面.
(function(topObject,window,document){

	//判断执行环境,opera,firefox(GM),firefox(scriptish),chrome;
	var envir=(function(){
		var envir={
			fxgm:false,
			fxstish:false,
			opera:false,
			chrome:false,
			unknown:false,
		};
		var toString=Object.prototype.toString;
		if(window.opera && toString.call(window.opera)=='[object Opera]'){
			envir.opera=true;
		}else if(typeof XPCNativeWrapper=='function'){
			if(topObject.GM_notification){//scriptish的新api
				envir.fxstish=true;
			}else{
				envir.fxgm=true;
			};
		}else if(typeof window.chrome=='object'){
			envir.chrome=true;
		}else{
			envir.unknown=true;
		};
		return envir;
	})();

	//未知环境,跳出.
	if(envir.unknown)return;

	function init(){
		//一些开关.
		var prefs={
			floatBarShowDelay:366,//浮动工具栏显示延时.单位(毫秒)
			floatBarHideDelay:333,//浮动工具栏隐藏延时.单位(毫秒)
			floatBarOffset:{//浮动工具栏偏移.单位(像素)
				x:1,//x轴偏移
				y:-11,//y轴偏移
			},
			overlayer:{//覆盖层.
				show:false,//显示
				dbcCloseAll:true,//双击覆盖层,关闭所有打开的窗口.
			},
			floatBarForceShow:{//在没有被缩放的图片上,但是大小超过下面设定的尺寸时,强制显示浮动框.(以便进行旋转,放大,翻转等等操作)..
				enabled:true,//启用强制显示.
				size:{//图片尺寸.单位(像素);
					w:166,
					h:166,
				},
			},
			wheelZoom:{//滚轮缩放
				zoomRange:[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1,1.2,1.3,1.5,1.7,1.9,2,2.5,3.0,4.0,6.0],//缩放比例.(不要出现负数,谢谢-_-!~)
			},
			firstOpenFTS:true,//当图片大于屏幕的时候,第一次打开,是否适应屏幕.
			magnifier:{//放大镜的设置.
				radius:77,//默认半径.单位(像素),PS,如果当原图太小的时候,会自动缩放半径.
				//双层边框设置.
				borderWidth:[2,8],//边框的宽度.
				borderColor:['rgba(255,255,255,0.9)','rgba(0,0,0,0.6)'],//边框的颜色.
				sizeLimit:{//限制当看到的图片大小,大于设定值的时候,才显示放大镜,实际上有被缩放的图片上,都可以显示放大镜,但是如果当前的图片太小,不够足够的距离移动,体验不好.
					width:60,
					height:60,
				},
			},
			minZoomSizeLimit:{//最小的允许缩放尺寸,当原图大于设定值的时候,缩放到设定值,如果原图没有设定值大,那么最小的缩放极限为原图大小.
				h:155,
				w:155,
			},
			mode:'auto',//取值:'css3' 或者 'canvas' 或者 'auto'(优先使用css3) ,,,表示渲染旋转,翻转,缩放的使用方式..如果你选择的方式不支持,那么会强制使用另外一种.
			debug:false,//输出debug信息(影响速度,我放的debug输出信息点挺多的,你最好关闭它..-_-!~)
		};

		//图标.
		prefs.icons={
			actualSize:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEoAAAAWCAYAAABnnAr9AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyBpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEz  NDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBXaW5kb3dzIiB4bXBNTTpJbnN0YW5jZUlE  PSJ4bXAuaWlkOkY1NzU5MkIxQjU4MDExREZBRDk3QThGQjYzNENBMTU5IiB4bXBNTTpEb2N1bWVu  dElEPSJ4bXAuZGlkOkY1NzU5MkIyQjU4MDExREZBRDk3QThGQjYzNENBMTU5Ij4gPHhtcE1NOkRl  cml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6RjU3NTkyQUZCNTgwMTFERkFEOTdB  OEZCNjM0Q0ExNTkiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6RjU3NTkyQjBCNTgwMTFERkFE  OTdBOEZCNjM0Q0ExNTkiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1l  dGE+IDw/eHBhY2tldCBlbmQ9InIiPz5NyVjzAAAGS0lEQVR42uxZXUxcRRQ+9+5ld9mlUKAiYClE  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  AElFTkSuQmCC',
			magnifier:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEoAAAAWCAYAAABnnAr9AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyBpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEz  NDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBXaW5kb3dzIiB4bXBNTTpJbnN0YW5jZUlE  PSJ4bXAuaWlkOjg5RjAyNUU3QjU4MDExREY4MDhGRDYxMzM4MUJCMDNEIiB4bXBNTTpEb2N1bWVu  dElEPSJ4bXAuZGlkOjg5RjAyNUU4QjU4MDExREY4MDhGRDYxMzM4MUJCMDNEIj4gPHhtcE1NOkRl  cml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6ODlGMDI1RTVCNTgwMTFERjgwOEZE  NjEzMzgxQkIwM0QiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6ODlGMDI1RTZCNTgwMTFERjgw  OEZENjEzMzgxQkIwM0QiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1l  dGE+IDw/eHBhY2tldCBlbmQ9InIiPz6P82IlAAAHZ0lEQVR42uyZe2xUVR7Hv/fOvfNoSwtTKJ1C  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  SUVORK5CYII=',
			noZoom:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEoAAAAWCAYAAABnnAr9AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ  bWFnZVJlYWR5ccllPAAAAyBpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp  bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6  eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEz  NDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo  dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw  dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv  IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS  ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD  cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBXaW5kb3dzIiB4bXBNTTpJbnN0YW5jZUlE  PSJ4bXAuaWlkOjZCOTNCM0NGQjU4MDExREY4Njg3QjAzMURERUQ0RjVEIiB4bXBNTTpEb2N1bWVu  dElEPSJ4bXAuZGlkOjZCOTNCM0QwQjU4MDExREY4Njg3QjAzMURERUQ0RjVEIj4gPHhtcE1NOkRl  cml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NkI5M0IzQ0RCNTgwMTFERjg2ODdC  MDMxRERFRDRGNUQiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6NkI5M0IzQ0VCNTgwMTFERjg2  ODdCMDMxRERFRDRGNUQiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1l  dGE+IDw/eHBhY2tldCBlbmQ9InIiPz6199zKAAAGVklEQVR42uxZXW8UVRh+zuzs7Ce7/ZaWFgkt  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  f2fF9hwxRGcAAAAASUVORK5CYII=',
			loading:'data:image/gif;base64,R0lGODlhGAAYAPYAAAAAAAQEBA4ODhgYGBkZGR0dHSAgICYmJisrKy8vLzMzMzQ0NEBAQExMTFVV  VVlZWWdnZ2xsbG9vb3R0dHV1dXx8fH19fYiIiJeXl52dnaCgoKmpqa+vr7W1tbm5ucPDw8nJydDQ  0NXV1dvb2+Xl5evr6+zs7O/v7/X19fv7+wsLCw8PDxcXFywsLDU1NTs7Oz4+PkZGRklJSU1NTVNT  U1xcXF1dXWFhYWlpaXp6eoeHh4uLi5ubm7e3t7+/v8DAwMfHx8jIyM3NzdLS0tjY2Nra2tzc3OLi  4unp6e3t7fLy8vb29gUFBQwMDBYWFhwcHCcnJykpKTY2NkJCQlRUVFdXV1tbW2hoaHh4eH5+fra2  tri4uLu7u+Tk5PT09Pf39/j4+AoKCg0NDS4uLjc3Nzo6OkVFRVFRUVpaWmpqanl5eYmJiZ6enqio  qMXFxczMzM/Pz9PT09nZ2ebm5u7u7vn5+cTExAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH/  C05FVFNDQVBFMi4wAwEAAAAh/i1NYWRlIGJ5IEtyYXNpbWlyYSBOZWpjaGV2YSAod3d3LmxvYWRp  bmZvLm5ldCkAIfkEAQoAKgAsAAAAABgAGAAABv9AlXA4THkkEk+KyGwOMwMAYKBxWoUkhFSKIF2H  n0nyI9gCBCBVCmX9JAiDw8VgLoxAFEvISSH4Bw8UAVIBFiYRDQ0XS0wSfn4OJRiJGCiHiRVsTB0H  AwMFGUIpjCodEBEfVhwPDhmaTSYmTiMdISivVyEdI0MgDQsMG19CGwwKDWkqFgvMD7JXJw8LCgoW  QhXUCg8nXybSzBVCvgrBwyrFCw2pQrQhpFa3urywz00oGQ4PHG0SEB1FjDIUgHPgHxMUFRJBMIFi  UgMMJRw8IiChSQoLiSSYsDAIQAAKDyZScCLCAgUQIwqYMXDhgJ8E6yyyAVFmi4APHSRMiHkli5kQ  LuaYaIgyJVRQIkaQePgSBAAh+QQBCgABACwAAAAAGAAYAAAH/4ABgoOES0NDS4SKi4RIEi0tEkiM  lIM7BCwEBDsBS0RFKZRLQkBJKTWamjZCNJk3R4tLOi8vE0k5mpk4MQC9ADehhEIwCi4uPUUymjM8  K74ABEaKQS8KxRwBJBwcSD8qzwRFikoTxjckikguzzSJikkdHOiLPy4qKjFDiilKwZVIPoAg6Tdo  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  AAA7',
			close:'data:image/gif;base64,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  VfufGEUAAQYABejinPr4dLEAAAAASUVORK5CYII=',
		};

			//各网站规则;
		var siteInfo=[
			{siteName:"google图片搜索",
				siteExample:"http://www.google.com.hk/search?q=opera&tbm=isch",					//网址例子..(方便测试.查看.之类的)
				enable:true,																														//是否启用..(是否启用这条规则)
				click:true,																															//接管鼠标左键点击..(是否点击 鼠标 左键直接用本JS打开图片)
				url:/https?:\/\/www.google(\.\w{1,3}){1,3}\/search\?.*&tbm=isch/,				//站点正则..
				getImage:function(img,a){																								//获取图片实际地址的处理函数,this 为当前鼠标悬浮图片的引用..另外传入的第一个参数为当前图片的引用,第二个参数为包裹当前图片的第一个a元素.
					return a.href.match(/imgurl=(.*?\.\w{1,5})&/i)[1];
				},
			},
			{sitename:"豆瓣",
				siteExample:"http://movie.douban.com/photos/photo/1000656155/",
				enable:true,
				click:false,
				url:/^https?:\/\/[^.]*\.douban\.com/i,
				getImage:function(){
					var oldsrc=this.src;
					var newsrc=oldsrc.replace(/\/view\/photo\/photo\/public\//i,'/view/photo/raw/public/');
					if(newsrc!=oldsrc)return newsrc;
				}
			},
			{sitename:"deviantart",
				enable:true,
				click:true,
				url:/^http:\/\/www\.deviantart\.com/i,
				siteExample:"http://www.deviantart.com",
				getImage:function(){
					var oldsrc=this.src;
					var newsrc=oldsrc.replace(/(http:\/\/[^\/]*\/fs\d*\/)150\/(.*)/i,'$1$2');
					return newsrc==oldsrc? '' : newsrc;
				},
			},
			{sitename:"opera官方论坛",
				enable:true,
				click:true,
				url:/^http:\/\/bbs\.operachina\.com/i,
				siteExample:"http://bbs.operachina.com",
				getImage:function(){
					return this.src.match(/(.*)&t=1$/i)[1]+'&mode=view';
				},
			},
			{sitename:"QQ微博",
				enable:true,
				click:false,
				url:/^http:\/\/t\.qq\.com\//i,
				siteExample:"http://t.qq.com/p/news",
				getImage:function(img,a){
						var pic=/(\.qpic\.cn\/mblogpic\/\w+)\/\d+/i;//图片
						var head=/(\.qlogo\.cn\/mbloghead\/\w+)\/\d+/i;//头像.
						var oldsrc=this.src;
						var newsrc;
						if(pic.test(oldsrc)){
							newsrc=oldsrc.replace(pic,'$1\2000');
							return newsrc==oldsrc? '' : newsrc;;
						}else if(head.test(oldsrc)){
							newsrc=oldsrc.replace(head,'$1\0');
							return newsrc==oldsrc? '' : newsrc;;
						};
				},
			},
			{sitename:"新浪微博",
				enable:true,
				click:false,
				url:/^http:\/\/weibo\.com/i,
				siteExample:"http://weibo.com/pub/?source=toptray",
				getImage:function(img,a){
						var oldsrc=this.src;
						var pic=/(\.sinaimg\.cn\/)(?:bmiddle|thumbnail)/i;//图片.
						var head=/(\.sinaimg\.cn\/\d+)\/50\//i;//头像.
						if(pic.test(oldsrc)){
							var newsrc=oldsrc.replace(pic,'$1large');
							return newsrc==oldsrc? '' : newsrc;
						}else if(head.test(oldsrc)){
							var newsrc=oldsrc.replace(head,'$1/180/');
							return newsrc==oldsrc? '' : newsrc;
						};
				},
			}
		];

		//通配型规则,无视站点.
		var tprules=[
			function(img,a){//解决新的dz论坛的原图获取方式.
				var reg=/(.+\/attachments?\/.+)\.thumb\.\w{2,5}$/i;
				var oldsrc=this.src;
				var newsrc=oldsrc.replace(reg,'$1');
				if(oldsrc!=newsrc)return newsrc;
			},
		];

		var nullFn=function(){};
		var C={
			log:nullFn,
			error:nullFn,
		};

		var G_window=topObject.unsafeWindow || window;

		if(prefs.debug){
			if(envir.opera && window.opera.version()<10.5){
				C.log=C.err=function(){
					opera.postError.apply(opera,arguments);
				};
			}else{
				var console=G_window.console;
				if(console){
					C.log=function(){
						console.log.apply(console,arguments);
					};
					C.err=console.error? function(){
						console.error.apply(console,arguments);;
					} : C.log;
				};
			};
		};

		var addCustomEvent={
			_contains:function(parent,child){
				if(parent && child)return !!(parent.compareDocumentPosition(child) & 16);
			},
			mouseenter:function(ele,fn){
				var self=this;
				ele.addEventListener('mouseover',function(e){
					//如果来自的元素是外面的.
					var relatedTarget=e.relatedTarget;
					if(relatedTarget!=this && !self._contains(this,relatedTarget)){
						fn.call(this,e);
					};
				},false);
			},
			mouseleave:function(ele,fn){
				var self=this;
				ele.addEventListener('mouseout',function(e){
					//如果去往的元素,不是自己的子元素,或者自己本身.
					var relatedTarget=e.relatedTarget;
					if(relatedTarget!=this && !self._contains(this,relatedTarget)){
						fn.call(this,e);
					};
				},false);
			},
		};

		var classOp={
			addClass:function(name,obj){
				if(obj.classList){
					obj.classList.add(name);
				}else{
					var cn=obj.className.split(/\s+/);
					cn.push(name);
					obj.className=cn.join(' ');
				};
			},
			removeClass:function(name,obj){
				if(obj.classList){
					obj.classList.remove(name);
				}else{
					var cn=obj.className.split(/\s+/);
					for(var i=0,ii=cn.length;i<ii;i++){
						if(cn[i]==name){
							cn.splice(i,1);
							obj.className=cn.join(' ');
							break;
						};
					};
				};
			},
		};


		//打开的图片对象.
		function PicObj(src,img,naturalSize){
			this.src=src;
			this.naturalSize=naturalSize;
			this.img=img;
			this.init();
		};
		PicObj.all={};
		PicObj.allLength=0;
		PicObj.currentFO=null;
		PicObj.style=null;
		PicObj.overlayer=null;
		PicObj.zIndex=PicObj.iniZIndex=110000;
		PicObj.zoomRange=null;
		PicObj.focusNext=function(){
			var all=PicObj.all;
			var max;
			var all_i;
			for(var i in all){
				if(all.hasOwnProperty(i)){
					all_i=all[i];
					if(!max){
						max=all_i.self;
					}else{
						if(all_i.self.zIndex > max.zIndex){
							max=all_i.self;
						}
					};
				};
			};
			if(max){
				max.focus();
			};
		};

		PicObj.prototype={
			remove:function(closeAll){
				delete PicObj.all[this.randomValue];
				PicObj.allLength-=1;
				if(PicObj.allLength==0){//没有对象的时候,移除覆盖层.
					PicObj.zIndex=PicObj.iniZIndex;
					if(PicObj.overlayer){
						PicObj.overlayer.style.display='none';
					};
				};
				if( !closeAll && this.isFront){//如果关闭的是最前面的图片,那么聚焦下一张图片.
					PicObj.focusNext();
				};
				this.closed=true;
				this.div.removeEventListener('click',this.clickHandler,false);
				this.div.parentNode.removeChild(this.div);
			},
			addClass:classOp.addClass,
			removeClass:classOp.removeClass,
			focus:function(){
				if(this.isFront){
					return;
				};
				var currentFO=PicObj.currentFO;
				if(currentFO){//移除focus样式.
					currentFO.isFront=false;
					if(!currentFO.closed){//如果对象没有被关闭.
						currentFO.div.title='点击激活';
						currentFO.addClass('pv_pic-container-blur',currentFO.div);
						currentFO.removeClass('pv_pic-container-focus',currentFO.div);
						currentFO.removeClass('pv_close-pic-focus',currentFO.close_pic);
						currentFO.removeClass('pv_pic-tools-containter-focus',currentFO.pic_tools_containter);
					};
				};
				PicObj.currentFO=this;
				this.div.removeAttribute('title');
				this.removeClass('pv_pic-container-blur',this.div);
				this.addClass('pv_pic-container-focus',this.div);
				this.addClass('pv_close-pic-focus',this.close_pic);
				this.addClass('pv_pic-tools-containter-focus',this.pic_tools_containter);
				this.isFront=true;
				PicObj.zIndex+=1;
				this.zIndex=PicObj.zIndex;
				this.div.style.zIndex=this.zIndex;
				C.log('所有对象:',PicObj.all);
			},
			overlayer:function(){
				if(!prefs.overlayer.show)return;
				var div=PicObj.overlayer;
				if(!div){
					div=document.createElement('div');
					PicObj.overlayer=div;
					div.id='pv_overlayer';
					div.style.cssText='\
						position:absolute;\
						top:0;\
						left:0;\
						opacity:0.7;\
						padding:0;\
						margin:0;\
						border:none;\
						z-index:109999;\
						background:none;\
						background-color:black;\
					';
					if(prefs.overlayer.dbcCloseAll){
						div.addEventListener('dblclick',function(e){
							e.preventDefault();
							e.stopPropagation();
							var all=PicObj.all;
							for(var i in all){
								if(all.hasOwnProperty(i)){
									all[i].self.remove(true);
								};
							};
						},false);
					};
					document.documentElement.appendChild(div);
				};
				var fullPS=this.getFullPageSize();
				div.style.width=fullPS.w+'px';
				div.style.height=fullPS.h+'px';
				div.style.display='block';
			},
			getCurImgSize:function(){
				var img=this.img;
				if(img.style.display=='none'){
					return this.canvasImgClientCache;
				};
				var ret={};
				if(envir.opera){
					ret.w=img.clientWidth;
					ret.h=img.clientHeight;
				}else{
					ret.w=img.width;
					ret.h=img.height;
				};
				return ret;
			},
			fitToScreen:function(){
				if(!prefs.firstOpenFTS)return;
				var divSize=this.getDivSize();
				var windowSize=this.getWindowSize();
				if(divSize.h >= windowSize.h){
					//alert(divSize.h - windowSize.h);
					var curImgSize=this.getCurImgSize();
					this.img.style.height =curImgSize.h-(divSize.h - windowSize.h) - 20 + 'px';
					this.img.style.width='auto';
					this.fitToScreen();
					return;
				};
				if(divSize.w >= windowSize.w){
					var curImgSize=this.getCurImgSize();
					this.img.style.width=curImgSize.w-(divSize.w-windowSize.w)-20 + 'px';
					this.img.style.height='auto';
					this.fitToScreen();
					return;
				};
			},
			getWindowSize:function(){
				var de=document.documentElement;
				//windo.innerHeight;window.innerWidth;
				return {
					h:document.compatMode=='BackCompat'? document.body.clientHeight : de.clientHeight,
					w:de.clientWidth,
				};
			},
			getFullPageSize:function(){
				return {
					h:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),
					w:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
				};
			},
			getDivSize:function(){
				var div=this.div;
				return {
					h:div.offsetHeight,
					w:div.offsetWidth,
				};
			},
			verticalCenter:function(){
				var div=this.div;
				var divSize=this.getDivSize();
				C.log('divSize',divSize);
				var windowSize=this.getWindowSize();
				C.log('可视窗口大小',windowSize);
				var floor=Math.floor;
				div.style.top=floor((windowSize.h-divSize.h)/2) + window.scrollY +'px';
				div.style.left=floor((windowSize.w-divSize.w)/2) + window.scrollX +'px';
			},
			borderFlash:function(){
				
			},
			setFront:function(){
				this.focus();
				this.verticalCenter();
			},
			getZoomSize:function(next){
				var range=PicObj.zoomRange;
				var cur=this.zoom;
				var i,ii,range_i;
				var ret;
				if(next){
					for(i=0,ii=range.length,range_i;i<ii;i++){
						range_i=range[i];
						if(range_i>cur){
							ret=range_i;
							break;
						}
					};
				}else{
					for(i=range.length-1;i>=0;i--){
						range_i=range[i];
						if(range_i<cur){
							ret=range_i;
							break;
						};
					};
				};
				return ret;
			},
			resetRotate:function(){
				var divs=this.div.style;
				var divSize_bef=this.getDivSize();
				var pInt=parseInt;
				var divOffset={
					top:pInt(divs.top),
					left:pInt(divs.left),
				};
				this.mRad=this.rotatedRad=this.preRad=0;//旋转重置为0;
				if(this.isCanvasMode()){//还原到普通模式,这样gif图片就会动了.
					if((this.flipVert || this.flipHori) && !support.transform){//是否退出canvas 模式, 如果有翻转,并且不支持 tranform 那么不退出.
						//alert('不能退出canvas模式');
						var imgCasCtx=this.imgCasCtx;
						var imgCanvas=this.imgCanvas;
						var rotatedSize=this.getRotatedImgS();//旋转后图片大小
						imgCanvas.width=rotatedSize.w;
						imgCanvas.height=rotatedSize.h;
						imgCasCtx.save();
						imgCasCtx.translate(imgCanvas.width/2,imgCanvas.height/2);
						imgCasCtx.scale(-this.zoom , this.flipVert? -this.zoom : this.zoom);
						imgCasCtx.drawImage(this.img,-this.naturalSize.w/2,-this.naturalSize.h/2);
						imgCasCtx.restore();
					}else{
						this.imgCanvas.style.display='none';
						this.img.style.display='block';
						if(this.lastImgZoom!=this.zoom){
							this.zoomIO(this.zoom>this.lastImgZoom,this.zoom);
						};
						this.img.style[support.transform]='';
						this.flip();
					};
				}else{
					this.img.style.top=0;
					this.img.style.left=0;
					var transform=this.img.style[support.transform];
					this.img.style[support.transform]=transform.replace(/rotate\s*\([^)]+\)\s*/i,'');
					divs.width='auto';
					divs.height='auto';
				};
				var divSize_aft=this.getDivSize();
				divs.top=divOffset.top - (divSize_aft.h - divSize_bef.h)/2 +'px';
				divs.left=divOffset.left - (divSize_aft.w - divSize_bef.w)/2 +'px';
			},
			zoomIO:function(In,zoom){
				zoom = zoom || this.getZoomSize(In);
				if(!zoom || zoom<=0){
					return;
				};

				var minSizeL=this.minSizeL;
				if(!minSizeL){
					minSizeL=prefs.minZoomSizeLimit;
					if(this.naturalSize.w <= minSizeL.w || this.naturalSize.h <= minSizeL.h){
						minSizeL=this.naturalSize;
					};
				};

				var curImgSize=this.getCurImgSize();
				if((curImgSize.w<=minSizeL.w || curImgSize.h<=minSizeL.h) && !In){//到达最小限度,不允许缩放.
					return;
				};

				var floor=Math.floor;
				var nextSize={
					w:floor(this.naturalSize.w * zoom),
					h:floor(this.naturalSize.h * zoom),
				};

				if(!In){//缩小.
					var scale=nextSize.w/nextSize.h;
					while(nextSize.w < minSizeL.w || nextSize.h < minSizeL.h){
						if(nextSize.w < minSizeL.w){
							nextSize.w=minSizeL.w;
							nextSize.h=floor(nextSize.w/scale);
						};
						if(nextSize.h < minSizeL.h){
							nextSize.h=minSizeL.h;
							nextSize.w=floor(nextSize.h * scale);
						};
					};
				};

				this.zoom=zoom;

				var divSize_bef=this.getDivSize();//变换之前div大小..

				var divs=this.div.style;

				if(this.isCanvasMode()){
					//alert(this.zoom);
					this.canvasImgClientCache.h=nextSize.h;
					this.canvasImgClientCache.w=nextSize.w;
					var rotatedSize=this.getRotatedImgS();//变换之后图片矩形的大小
					divs.width='auto';
					divs.height='auto';
					var imgCanvas=this.imgCanvas;
					imgCanvas.width=rotatedSize.w;
					imgCanvas.height=rotatedSize.h;
					var imgCasCtx=this.imgCasCtx;
					imgCasCtx.save();
					imgCasCtx.translate(imgCanvas.width/2,imgCanvas.height/2);
					imgCasCtx.rotate(this.rotatedRad);
					imgCasCtx.scale(this.flipHori? -zoom : zoom , this.flipVert? -zoom : zoom);
					imgCasCtx.drawImage(this.img,-this.naturalSize.w/2,-this.naturalSize.h/2);
					imgCasCtx.restore();
				}else{
					var imgs=this.img.style;
					if(zoom==1){
						imgs.height='auto';
						imgs.width='auto';
					}else{
						imgs.height=nextSize.h + 'px';
						imgs.width=nextSize.w + 'px';
					};
					var rotatedSize=this.getRotatedImgS();//变换之后图片矩形的大小
					var rotatedCliSize=this.getCurImgSize();//图片的client
					imgs.top=(rotatedSize.h - rotatedCliSize.h)/2 + 'px';
					imgs.left=(rotatedSize.w - rotatedCliSize.w)/2 + 'px';
					divs.width=rotatedSize.w + 'px';
					divs.height=rotatedSize.h + 'px';
				};


				var divSize_aft=this.getDivSize();//变换之后div大小..

				var pInt=parseInt;
				var divOffset={
					top:pInt(divs.top),
					left:pInt(divs.left),
				};


				divs.top=floor(divOffset.top - (divSize_aft.h - divSize_bef.h)/2) +'px';
				divs.left=floor(divOffset.left - (divSize_aft.w - divSize_bef.w)/2) +'px';

			},
			getRotatedImgS:function(){
				var mRad=this.mRad;
				var imgSize=this.getCurImgSize();
				if(!mRad)return imgSize;
				return {
					h:imgSize.h* Math.cos(mRad) + imgSize.w * Math.sin(mRad),
					w:imgSize.h* Math.cos(Math.PI/180 * 90 - mRad) + imgSize.w * Math.sin(Math.PI/180 * 90 - mRad),
				};
			},
			addStyle:function(){
				if(PicObj.style)return;
				var style=document.createElement('style');
				PicObj.style=style;
				style.type='text/css';
				style.textContent='\
					.pv_pic-container{\
						position:absolute;\
						width:auto;\
						height:auto;\
						margin:0;\
						padding:6px;\
						border:1px solid transparent;\
						background:none;\
						background-color:rgba(0,0,0,0.7);\
						display:block;\
						opacity:1;\
						-moz-border-radius:5px;\
						-webkit-border-radius:5px;\
						border-radius:5px;\
					}\
					.pv_pic,\
					.pv_pic_canvas{\
						margin:0;\
						padding:0;\
						border:none;\
					}\
					.pv_pic{\
						width:auto;\
						height:auto;\
						position:relative;\
						top:0;\
						left:0;\
					}\
					.pv_close-pic{\
						cursor:pointer;\
						position:absolute;\
						right:-15px;\
						top:-15px;\
						width:30px;\
						height:30px;\
						margin:0;\
						border:none;\
						padding:0;\
						background:transparent url("'+prefs.icons.close+'") no-repeat scroll center center;\
						opacity:0;\
						-o-transition:opacity 0.2s ease-in-out;\
						-moz-transition:opacity 0.2s ease-in-out;\
						-webkit-transition:opacity 0.2s ease-in-out;\
						transition:opacity 0.2s ease-in-out;\
					}\
					.pv_close-pic-focus{\
						opacity:0.7;\
					}\
					.pv_pic-container-blur:hover .pv_close-pic{\
						opacity:0.8;\
					}\
					.pv_pic-container-focus{\
						-moz-box-shadow:0 0 8px 0px rgba(0,0,0,0.9);\
						-webkit-box-shadow:0 0 8px 0px rgba(0,0,0,0.9);\
						box-shadow:0 0 8px 0px rgba(0,0,0,0.8);\
						border:1px solid rgba(250,250,250,0.9);\
					}\
					.pv_close-pic:hover{\
						opacity:0.98!important;\
					}\
					.pv_pic-tools-containter{\
						position:absolute;\
						border:1px solid white;\
						background:none;\
						background-color:rgba(0,0,0,0.8);\
						margin:0;\
						padding:3px;\
						-moz-border-radius:6px;\
						-webkit-border-radius:6px;\
						border-radius:6px;\
						opacity:0;\
						-moz-box-shadow:0 0 8px 0px rgba(0,0,0,0.9);\
						-webkit-box-shadow:0 0 8px 0px rgba(0,0,0,0.9);\
						box-shadow:0 0 8px 0px rgba(0,0,0,0.8);\
						-o-transition:opacity 0.2s ease-in-out;\
						-moz-transition:opacity 0.2s ease-in-out;\
						-webkit-transition:opacity 0.2s ease-in-out;\
						transition:opacity 0.2s ease-in-out;\
					}\
					.pv_pic-tools-containter-focus{\
						opacity:0.7;\
					}\
					.pv_pic-container-blur:hover .pv_pic-tools-containter{\
						opacity:0.8;\
					}\
					.pv_pic-tools-containter:hover{\
						opacity:0.96!important;\
					}\
					.pv_pic-tool{\
						display:block;\
						margin:0 2px 3px;\
						cursor:pointer;\
						color:white;\
						font-size:12px;\
						border:1px solid transparent;\
					}\
					.pv_pic-tool:hover{\
						background-color:#5D0300;\
					}\
					.pv_pic-tool:active{\
						border-top-width:2px;\
						border-left-width:2px;\
						border-right-width:0;\
						border-bottom-width:0;\
					}\
					.pv_pic-tool-selected{\
						background-color:red;\
					}\
					.pv_pic-tools-separator{\
						display:block;\
						width:100%\
						height:0;\
						border:none;\
						padding:0;\
						margin:3px 0;\
						border-top:1px solid white;\
					}\
				';
				document.documentElement.appendChild(style);
			},
			isCanvasMode:function(){
				return this.img.style.display=='none';
			},
			loadImgByCanvas:function(){
				var cas=this.imgCanvas;
				var ctx=this.imgCasCtx;
				if(!cas){
					cas=document.createElement('canvas');
					this.imgCanvas=cas;
					cas.className='pv_pic_canvas';
					ctx=cas.getContext('2d');
					this.imgCasCtx=ctx;
				};
				var img=this.img;
				cas.style.display='block';
				if(img.style.display!='none'){
					var imgSize=this.getCurImgSize();
					cas.width=imgSize.w;
					cas.height=imgSize.h;
					this.canvasImgClientCache=imgSize;//放在canvas里面的图片,我们无法得到图片的 clientWH,所以必须缓存他.
					img.parentNode.insertBefore(cas,img);
					ctx.save();
					ctx.translate(cas.width/2,cas.height/2);
					ctx.scale(this.flipHori? -this.zoom : this.zoom,this.flipVert? -this.zoom : this.zoom);
					ctx.drawImage(img,-this.naturalSize.w/2,-this.naturalSize.h/2);
					ctx.restore();
					this.lastImgZoom=self.zoom;//隐藏时,图片的缩放比例.
					img.style.display='none';
				};
			},
			flip:function(hori){
				if(hori){//水平翻转.
					if(this.flipHori){//翻转
						if(this.isCanvasMode()){
							var imgCasCtx=this.imgCasCtx;
							var imgCanvas=this.imgCanvas;
							imgCasCtx.save();
							imgCasCtx.translate(imgCanvas.width/2,imgCanvas.height/2);
							imgCasCtx.rotate(this.rotatedRad);
							imgCasCtx.scale(-this.zoom , this.flipVert? -this.zoom : this.zoom);
							imgCasCtx.drawImage(this.img,-this.naturalSize.w/2,-this.naturalSize.h/2);
							imgCasCtx.restore();
						}else{
							if(!support.transform){
								this.loadImgByCanvas();
								return;
							};
							this.img.style[support.transform]+=' scaleX(-1)';
						};
					}else{//取消
						if(this.isCanvasMode()){
							var imgCasCtx=this.imgCasCtx;
							var imgCanvas=this.imgCanvas;
							imgCasCtx.save();
							imgCasCtx.translate(imgCanvas.width/2,imgCanvas.height/2);
							imgCasCtx.rotate(this.rotatedRad);
							imgCasCtx.scale(this.zoom,this.flipVert? -this.zoom : this.zoom);
							imgCasCtx.drawImage(this.img,-this.naturalSize.w/2,-this.naturalSize.h/2);
							imgCasCtx.restore();
						}else{
							var transform=this.img.style[support.transform];
							this.img.style[support.transform]=transform.replace(/scaleX\s*\([^)]+\)\s*/i,'');
						};
					};
				}else{//垂直翻转
					if(this.flipVert){//翻转
						if(this.isCanvasMode()){
							var imgCasCtx=this.imgCasCtx;
							var imgCanvas=this.imgCanvas;
							imgCasCtx.save();
							imgCasCtx.translate(imgCanvas.width/2,imgCanvas.height/2);
							imgCasCtx.rotate(this.rotatedRad);
							imgCasCtx.scale(this.flipHori? -this.zoom : this.zoom,-this.zoom);
							imgCasCtx.drawImage(this.img,-this.naturalSize.w/2,-this.naturalSize.h/2);
							imgCasCtx.restore();
						}else{
							this.img.style[support.transform]+=' scaleY(-1)';
						};
					}else{//取消
						if(this.isCanvasMode()){
							var imgCasCtx=this.imgCasCtx;
							var imgCanvas=this.imgCanvas;
							imgCasCtx.save();
							imgCasCtx.translate(imgCanvas.width/2,imgCanvas.height/2);
							imgCasCtx.rotate(this.rotatedRad);
							imgCasCtx.scale(this.flipHori? -this.zoom : this.zoom,this.zoom);
							imgCasCtx.drawImage(this.img,-this.naturalSize.w/2,-this.naturalSize.h/2);
							imgCasCtx.restore();
						}else{
							if(!support.transform){
								this.loadImgByCanvas();
								return;
							};
							var transform=this.img.style[support.transform];
							this.img.style[support.transform]=transform.replace(/scaleY\s*\([^)]+\)\s*/i,'');
						};
					};
				};
			},
			init:function(){
				this.addStyle();
				var self=this;

				var div=document.createElement('div');
				div.className='pv_pic-container';
				div.style.cssText='\
					top:-99999px;\
					left:-99999px;\
				';
				this.div=div;

				this.clickHandler=function(e){
					if(e.button!=0)return;//左键点击.
					e.preventDefault();
					e.stopPropagation();
					var target=e.target;
					if(target==close_pic){//点击关闭按钮
						self.remove();
					}else{
						
					};
				};
				div.addEventListener('click',this.clickHandler,false);



				var img=this.img;

				this.wheelZ=function(e){
					if(!self.isFront)return;
					e.preventDefault();
					var delta;
					if(e.wheelDelta){//w3c 
						delta = e.wheelDelta/120; 
					}else if(e.detail){
						delta = -e.detail/3;
					};
					if(delta>0){//向上滚.放大.
						//alert('上');
						self.zoomIO(true);
					}else{//向下滚.缩小
						//alert('下');
						self.zoomIO();
					};
				};
				if(!PicObj.zoomRange){//排列下数组,从小到大.
					PicObj.zoomRange=prefs.wheelZoom.zoomRange.sort(function(a,b){
						return a-b;
					});
				};
				div.addEventListener(support.wheelEvent,this.wheelZ,false)


				var pInt=parseInt;

				function boxMove(e){
					var mouseCoor={
						x:e.pageX,
						y:e.pageY,
					};
					var divs=div.style;
					divs.top=mouseCoor.y-oriMouseCoor.y + oriOffset.top +'px';
					divs.left=mouseCoor.x-oriMouseCoor.x + oriOffset.left +'px';
				};

				var oriOffset;
				var oriMouseCoor;

				function moveOver(){
					document.removeEventListener('mousemove',boxMove,false);
					document.removeEventListener('mouseup',moveOver,false);
				};



				var iniBoxSize;
				var iniBoxOffset;
				this.rotatedRad=this.preRad=0;
				function boxRotate(e){
					var mouseCoor={
						x:e.pageX,
						y:e.pageY,
					};
					var rad=Math.atan2(mouseCoor.y - oriMouseCoor.y,mouseCoor.x - oriMouseCoor.x);
					rad+=self.preRad;//加上 上一回旋转时的旋转角度


					/////////////
					var PI=Math.PI;
					var mRad;

					if(rad>0){// 减去360度的重复.
						while(rad>=2*PI){
							rad-=2*PI;
						};
					}else if(rad<0){
						while(rad<=-2*PI){
							rad+=2*PI;
						};
					};

//////////////////////
					mRad=rad;
					if(mRad<0){
						mRad+=2*PI;
					};
					if(mRad>PI){
						mRad=2*PI-mRad;
					};
					if(mRad>1/2*PI){
						mRad=PI-mRad;
					};

					self.mRad=mRad;//保存,用来计算图片旋转上,所等同的矩形大小.

					var rotatedSize=self.getRotatedImgS();//旋转后图片大小
					var rotatedCliSize=self.getCurImgSize();//旋转后的图片clent size


					var divs=div.style;

					if(self.isCanvasMode()){
						divs.width='auto';
						divs.height='auto';
						var imgCanvas=self.imgCanvas;
						imgCanvas.width=rotatedSize.w;
						imgCanvas.height=rotatedSize.h;
						var imgCasCtx=self.imgCasCtx;
						imgCasCtx.save();
						imgCasCtx.translate(imgCanvas.width/2,imgCanvas.height/2);
						imgCasCtx.rotate(rad);
						imgCasCtx.scale(self.flipHori? -self.zoom : self.zoom,self.flipVert? -self.zoom : self.zoom);
						imgCasCtx.drawImage(self.img,-self.naturalSize.w/2,-self.naturalSize.h/2);
						imgCasCtx.restore();
					}else{
						divs.width=rotatedSize.w+'px';
						divs.height=rotatedSize.h+'px';
						var hd=(rotatedSize.h-rotatedCliSize.h)/2;
						var wd=(rotatedSize.w-rotatedCliSize.w)/2;
						var imgs=self.img.style;
						imgs.top= hd + 'px';
						imgs.left= wd + 'px';
						var transform=imgs[support.transform];
						transform=transform.replace(/rotate\s*\([^)]+\)\s*/i,'');
						imgs[support.transform]=' rotate('+rad+'rad) '+transform;
					};

					var divSize=self.getDivSize();

					var nOffset={
						top:iniBoxOffset.top-(divSize.h-iniBoxSize.h)/2,
						left:iniBoxOffset.left-(divSize.w-iniBoxSize.w)/2,
					};

					divs.top=nOffset.top+ 'px';
					divs.left=nOffset.left+ 'px';

					self.rotatedRad=rad;//保存已经旋转的角度
				};

				function rotateOver(){
					self.preRad=self.rotatedRad;
					document.removeEventListener('mousemove',boxRotate,false);
					document.removeEventListener('mouseup',rotateOver,false);
				};


				var mode=PicObj.mode;
				if(mode===undefined){
					if(support.transform && support.canvas){
						if(prefs.mode=='auto' || prefs.mode=='css3'){
							mode='css3';
						}else{
							mode='canvas'
						};
					}else{
						if(support.transform){
							mode='css3';
						}else if(support.canvas){
							mode='canvas';
						}else{
							mode=false;
						};
					};
				};

				div.addEventListener('mousedown',function(e){
					if(e.button!=0)return;//左键点击.
					e.preventDefault();
					e.stopPropagation();
					var target=e.target;
					//if(target==close_pic){return;}
					if(target!=div && target!=self.img && target!=self.imgCanvas)return;
					if(!self.isFront)self.focus();
					oriMouseCoor={
						x:e.pageX,
						y:e.pageY,
					};
					if(self.selectedTool=='move'){
						oriOffset={
							top:pInt(div.style.top),
							left:pInt(div.style.left),
						};
						document.addEventListener('mousemove',boxMove,false);
						document.addEventListener('mouseup',moveOver,false);
					}else if(self.selectedTool=='rotate'){
						if(!mode)return;//不支持旋转
						if(mode=='canvas'){//第一次旋转的时候,为不支持css3 transform的浏览器 启动canvas,canvas旋转gif不会动.
							self.loadImgByCanvas();
						};
						iniBoxSize=self.getDivSize();
						iniBoxOffset={
							top:parseInt(div.style.top),
							left:parseInt(div.style.left),
						};
						document.addEventListener('mousemove',boxRotate,false);
						document.addEventListener('mouseup',rotateOver,false);
					};
				},false);

				var close_pic=document.createElement('span');
				this.close_pic=close_pic;
				close_pic.title='关闭';
				close_pic.className='pv_close-pic';


				img.className='pv_pic';
				div.appendChild(img);
				div.appendChild(close_pic);


				//工具栏部分操作.
				var pic_tools_containter=document.createElement('div');
				this.pic_tools_containter=pic_tools_containter;
				pic_tools_containter.style.cssText='\
					top:0;\
					left:-38px;\
				';
				pic_tools_containter.className='pv_pic-tools-containter';

				this.flipHori=this.flipVert=false;
				pic_tools_containter.addEventListener('click',function(e){
					if(e.button!=0)return;//左键点击.
					e.preventDefault();
					e.stopPropagation();
					var target=e.target;
					if(target==tool_move){
						if(self.selectedTool=='move')return;
						self.addClass('pv_pic-tool-selected',tool_move);
						self.removeClass('pv_pic-tool-selected',tool_rotate);
						self.selectedTool='move';
					}else if(target==tool_rotate){
						if(self.selectedTool=='rotate')return;
						self.selectedTool='rotate';
						self.addClass('pv_pic-tool-selected',tool_rotate);
						self.removeClass('pv_pic-tool-selected',tool_move);
					}else if(target==tool_flipHori){
						self.flipHori=!self.flipHori;
						if(self.flipHori){
							self.addClass('pv_pic-tool-selected',tool_flipHori);
						}else{
							self.removeClass('pv_pic-tool-selected',tool_flipHori);
						};
						self.flip(true);
					}else if(target==tool_flipVert){
						self.flipVert=!self.flipVert;
						if(self.flipVert){
							self.addClass('pv_pic-tool-selected',tool_flipVert);
						}else{
							self.removeClass('pv_pic-tool-selected',tool_flipVert);
						};
						self.flip(false);
					};
				},false);

				pic_tools_containter.addEventListener('dblclick',function(e){
					if(e.button!=0)return;//左键点击.
					e.preventDefault();
					e.stopPropagation();
					var target=e.target;
					if(target==tool_move){
						self.verticalCenter();
					}else if(target==tool_rotate){
						self.resetRotate();
					};
				},false);


				var tool_move=document.createElement('span');
				tool_move.className='pv_pic-tool pv_pic-tools-move';
				tool_move.title='移动,双击居中';
				tool_move.textContent='移动';

				this.selectedTool='move';
				this.addClass('pv_pic-tool-selected',tool_move);

				var tool_rotate=document.createElement('span');
				tool_rotate.className='pv_pic-tool pv_pic-tools-rotate';
				tool_rotate.title='旋转,双击还原';
				tool_rotate.textContent='旋转';

				var tool_flipHori=document.createElement('span');
				tool_flipHori.className='pv_pic-tool pv_pic-tools-flip-hori';
				tool_flipHori.title='水平翻转';
				tool_flipHori.textContent='水翻';

				var tool_flipVert=document.createElement('span');
				tool_flipVert.className='pv_pic-tool pv_pic-tools-flip-vert';
				tool_flipVert.title='垂直翻转';
				tool_flipVert.textContent='垂翻';

				var tool_separator=document.createElement('span');
				tool_separator.className='pv_pic-tools-separator';

				pic_tools_containter.appendChild(tool_move);
				pic_tools_containter.appendChild(tool_rotate);
				pic_tools_containter.appendChild(tool_separator);
				pic_tools_containter.appendChild(tool_flipHori);
				pic_tools_containter.appendChild(tool_flipVert);


				div.appendChild(pic_tools_containter);
				document.documentElement.appendChild(div);

				var randomValue=Math.random();
				this.randomValue=randomValue;

				PicObj.all[randomValue]={
					self:this,
				};
				PicObj.allLength+=1;

				setTimeout(function(){
					self.fitToScreen();
					self.setFront();
					self.overlayer();
					self.zoom=img.width/self.naturalSize.w;//当前的缩放大小.
				},0);
			},
		};


		//放大镜对象.
		function MagnifierObj(img,naturalSize,target){
			this.img=img;
			this.naturalSize=naturalSize;
			this.target=target;
			this.init();
		};
		MagnifierObj.all={};
		MagnifierObj.allLength=0;
		MagnifierObj.moveHandler=function(e){//放大镜的move事件处理函数.
			var target=e.target;
			var all=MagnifierObj.all;
			for(var i in all){
				if(!all.hasOwnProperty(i))return;
				var value=all[i];
				var range=value.range;
				var pageXY={
					x:e.pageX,
					y:e.pageY,
				};
				if(pageXY.x >= range.a.x && pageXY.x <= range.b.x && pageXY.y >= range.a.y && pageXY.y <= range.b.y){
					value.self.move(pageXY);
					break;
				};
			};
		};

		MagnifierObj.prototype={
			remove:function(){
				delete MagnifierObj.all[this.randomValue];//从全局数组删除自己的存在.
				MagnifierObj.allLength -= 1;//长度 -1.
				if(MagnifierObj.allLength == 0){//如果没有被放大镜监视的图片了,那么移除全局move监听.
					document.removeEventListener('mousemove',MagnifierObj.moveHandler,true);
				};
				this.canvas.parentNode.removeChild(this.canvas);//移除dom
			},
			move:function(coor){
				var canvas=this.canvas;
				coor=coor || this.range.a;
				var canvasRadius=this.canvasRadius;
				var cstyle=canvas.style;
				cstyle.left=coor.x - canvasRadius + 'px';
				cstyle.top=coor.y - canvasRadius + 'px';
				var range=this.range;
				var diameter=this.diameter;
				this.draw(
					{
						x:-Math.ceil(((coor.x-range.a.x)/range.size.w * (this.naturalSize.w - diameter))),
						y:-Math.ceil(((coor.y-range.a.y)/range.size.h * (this.naturalSize.h - diameter))),
					}
				);
			},
			addStyle:function(){
				if(!MagnifierObj.style){
					var style=document.createElement('style');
					MagnifierObj.style=style;
					style.type='text/css';
					style.textContent='\
						.pv_magnifier-mask{\
							position:absolute;\
							margin:0;\
							padding:0;\
							border:none;\
							display:block;\
							background:none;\
							z-index:99999;\
						}\
					';
					document.documentElement.appendChild(style);
				};
			},
			draw:function(offset){
				offset=offset || {x:0,y:0};
				var context=this.context;
				context.save();
				var radius=this.radius;
				var diameter=this.diameter;
				var coorCenter=this.coorCenter;
				var canvasDia=this.canvasDia;
				var expand=this.expand;

				context.clearRect(0,0,canvasDia,canvasDia);

				context.beginPath()
				context.arc(coorCenter.x, coorCenter.y , radius , 0 , 2*Math.PI, true);//绘制一个圆,作为遮罩.
				context.fill();

				context.globalCompositeOperation='source-in';
				context.drawImage(this.img, offset.x + expand/2, offset.y + expand/2);

				context.beginPath();//第一层边框.
				context.arc(coorCenter.x, coorCenter.y , radius + prefs.magnifier.borderWidth[0], 0 , 2*Math.PI, true);
				context.globalCompositeOperation='destination-over';
				context.fillStyle =prefs.magnifier.borderColor[0];
				context.fill();

				context.beginPath();//第2层边框.
				context.arc(coorCenter.x, coorCenter.y , this.canvasRadius, 0 , 2*Math.PI, false);
				context.fillStyle =prefs.magnifier.borderColor[1];
				context.fill();

				context.restore();
			},
			init:function(){
				this.addStyle();

				var self=this;
				var target=this.target;
				var tOffset=getTargetPosition(target);
				var size=getDisIS(target);
				var range={//根据显示图片的创建,创建一个相应move事件的坐标范围. a 为左上角, b为右下角.
					a:{//左上角坐标.
						x:tOffset.left,
						y:tOffset.top,
					},
					b:{//右下角坐标
						x:tOffset.left + size.w,
						y:tOffset.top + size.h,
					},
					size:{//图片大小
						w:size.w,
						h:size.h,
					},
				};
				this.range=range;
				C.log('图片范围',range);


				var randomValue=Math.random();
				this.randomValue=randomValue;
				MagnifierObj.all[randomValue]={
					self:this,
					target:target,
					range:range,
				};
				MagnifierObj.allLength +=1;

				if(MagnifierObj.allLength==1){//当加载第一个放大镜的时候,挂在全局监听,以后的不能挂.
					document.addEventListener('mousemove',MagnifierObj.moveHandler,true);
				};

				var naturalSize=this.naturalSize;

				var preDiameter=prefs.magnifier.radius * 2;
				var defaultDia={
					w:preDiameter,
					h:preDiameter,
				};
				var diameter={
					w:defaultDia.w > naturalSize.w ? naturalSize.w : defaultDia.w,
					h:defaultDia.h > naturalSize.h ? naturalSize.h : defaultDia.h,
				};
				diameter=Math.min(diameter.w,diameter.h);

				if(diameter % 2 !=0)diameter-=1;//直径,应该弄成个偶数,等下绘制圆的时候,中点不会再1/2像素处.
				this.diameter=diameter;
				var radius=diameter/2;
				this.radius=radius;

				C.log('mask的直径大小:',diameter);

				var expand= (prefs.magnifier.borderWidth[0] + prefs.magnifier.borderWidth[1])* 2;//画布弄大点,其他的地方用来画边框.
				this.expand=expand;

				var canvasDia=diameter + expand;
				this.canvasDia=canvasDia;

				var canvasRadius=canvasDia/2;
				this.canvasRadius=canvasRadius;

				var coorCenter={//画布中心点.
					x:canvasRadius,
					y:canvasRadius,
				};
				this.coorCenter=coorCenter;

				var canvas=document.createElement('canvas');
				this.canvas=canvas;
				document.documentElement.appendChild(canvas);
				canvas.width=canvas.height=canvasDia;
				canvas.className='pv_magnifier-mask';
				canvas.style.cssText='\
					top:100px;\
					left:100px;\
				';

				canvas.addEventListener('click',function(e){
					self.remove();
				},false);

				var context=canvas.getContext('2d');
				this.context=context;
				this.draw();
				this.move();
			},
		};

		

		//载入时,显示的gif图标对象.
		function LoadingIObj(src,target,type,tSrc){
			this.src=src;
			this.tSrc=tSrc;
			this.target=target;
			this.type=type;
			this.init();
		};

		LoadingIObj.all={};
		LoadingIObj.style=null;

		LoadingIObj.prototype={
			remove:function(){
				//从所有对象集合里面移除当前对象.
				delete LoadingIObj.all[this.randomValue];
				//卸载监听
				window.removeEventListener('resize',this.resizeHandler,false);
				this.stop_a.addEventListener('click',this.clickHandler,false);
				this.img.addEventListener('load',this.loadHandler,false);
				this.img.addEventListener('error',this.errorHandler,false);
				//删除dom
				this.div.parentNode.removeChild(this.div);
			},
			load:function(){
				this.remove();
				C.log(this.src,'载入成功.');
				//window.open(this.src);
				var img=this.img;
				if(this.type=='original' || this.type=='current'){
					new PicObj(this.src,img,{w:img.width,h:img.height});
				}else if(this.type=='magnifier'){
					new MagnifierObj(img,{w:img.width,h:img.height},this.target);
				};
			},
			errorMessage:function(){
				var span=document.createElement('span');
				span.textContent='<load error>';
				span.style.cssText='\
					border:1px solid red;\
					background:none;\
					background-color: rgba(0, 0, 0, 0.8);\
					color:white;\
					position:absolute;\
					font-size:12px;\
					-moz-border-radius:3px;\
					-webkit-border-radius:3px;\
					border-radius:3px;\
					padding:3px;\
					font-style:italic;\
					font-weight:bold;\
					opacity:1;\
				';
				document.documentElement.appendChild(span);

				var rect=getTargetPosition(this.target);
				span.style.top=rect.top + 3 +'px';
				span.style.left=rect.left + 3 +'px';
				setTimeout(function(){
					document.documentElement.removeChild(span);
				},999);
			},
			error:function(){
				this.remove();
				this.errorMessage();
				C.log(this.src,'载入错误.');
			},
			stop:function(e){
				e.preventDefault();
				this.img.src='';
				this.remove();
				C.log(this.src,'载入中止');
			},
			setPosition:function(){
				var position=getTargetPosition(this.target);
				var divs=this.div.style;
				divs.top=position.top +1 + 'px';
				divs.left=position.left +1 + 'px';
			},
			addStyle:function(){
				if(LoadingIObj.style)return;
				var style=document.createElement('style');
				LoadingIObj.style=style;
				style.type='text/css';
				style.textContent='\
					.pv_loading-gif-div{\
						width:auto;\
						height:auto;\
						border:none;\
						margin:0;\
						padding:0;\
						position:absolute;\
						z-index:100001;\
						opacity:0.8;\
						-o-transition:opacity 0.2s ease-in-out;\
						-moz-transition:opacity 0.2s ease-in-out;\
						-webkit-transition:opacity 0.2s ease-in-out;\
						transition:opacity 0.2s ease-in-out;\
					}\
					.pv_loading-gif-div:hover{\
						opacity:1;\
					}\
					.pv_loading-gif-div > .pv_loading-gif{\
						float:left;\
						height:24px;\
						width:24px;\
						margin:0;\
						border:2px solid black;\
						padding:2px;\
						background-color:white;\
						background-position:center center;\
						background-repeat:no-repeat;\
						background-image:url("'+prefs.icons.loading+'");\
						-webkit-border-radius:20px;\
						-moz-border-radius:20px;\
						border-radius:20px;\
						-moz-box-shadow:1px 2px 3px #ccc;\
						-webkit-box-shadow:1px 2px 3px #ccc;\
						box-shadow:1px 2px 3px #ccc;\
					}\
					.pv_loading-gif-div > .pv_stop-loading{\
						position:absolute;\
						right:-3px;\
						top:-3px;\
						height:8px;\
						width:8px;\
						line-height:8px;\
						margin:0;\
						cursor:pointer;\
						border:2px solid black;\
						padding:2px;\
						-webkit-border-radius:20px;\
						-moz-border-radius:20px;\
						border-radius:20px;\
						background:none;\
						background-color:white;\
						visibility:hidden;\
						color:black;\
					}\
					.pv_loading-gif-div:hover .pv_stop-loading{\
						visibility:visible;\
					}\
				';
				document.documentElement.appendChild(style);
			},
			init:function(){
				this.addStyle();
				var div=document.createElement('div');
				div.className='pv_loading-gif-div';
				div.style.cssText='\
					top:0;\
					left:0;\
				';

				var loading_a=document.createElement('span');
				loading_a.className='pv_loading-gif';
				loading_a.title='正在加载...稍等..';

				var stop_a=document.createElement('span');
				stop_a.title='取消加载';
				stop_a.textContent='x';
				stop_a.className='pv_stop-loading';

				div.appendChild(loading_a);
				div.appendChild(stop_a);

				this.div=div;
				this.loading_a=loading_a;
				this.stop_a=stop_a;

				document.documentElement.appendChild(div);

				//尝试载入图片.
				var img=new Image();
				this.img=img;

				var self=this;

				this.setPosition();


				var rstoHandler=function(){
					self.setPosition();
				};

				var resizeTimer;
				this.resizeHandler=function(){
					clearTimeout(resizeTimer);
					resizeTimer=setTimeout(rstoHandler,299);
				};

				window.addEventListener('resize',this.resizeHandler,false);

				//保存当前对象的部分属性到 对象集合里面.
				this.randomValue=Math.random();
				LoadingIObj.all[this.randomValue]={
					self:this,
				};



				//停止加载.
				this.clickHandler=function(e){
					self.stop(e);
				};
				stop_a.addEventListener('click',this.clickHandler,false);

				//成功载入
				this.loadHandler=function(e){
					self.load(e);
				};
				img.addEventListener('load',this.loadHandler,false);

				//载入失败.
				this.errorHandler=function(e){
					self.error(e);
				};
				img.addEventListener('error',this.errorHandler,false);

				img.src=this.type=='current'? this.tSrc : this.src;
			},
		};


		function FloatBarObj(){
			this.init();
		};


		FloatBarObj.prototype={
			buttonSwitch:function(){
				if(this.noZoom){//如果没有缩放的图片上
					this.floatBar_viewOri.style.display='none';
					this.floatBar_magnifier.style.display='none';
					this.floatBar_viewCur.style.display='block';
				}else{
					this.floatBar_viewOri.style.display='block';
					var size=getDisIS(this.target);
					if(size.h < prefs.magnifier.sizeLimit.height || size.w < prefs.magnifier.sizeLimit.width){//如果显示的图片太小,就不显示放大镜图标,因为那啥,没有足够的空间移动.
						C.log(this.target,'目标太小,不显示放大镜')
						this.floatBar_magnifier.style.display='none';
					}else{
						this.floatBar_magnifier.style.display='block';
					};
					this.floatBar_viewCur.style.display='block';
				};
			},
			show:function(){
				C.log('显示',this.target);
				clearTimeout(this.hideTimer);
				//this.target.style.outline='1px solid red';
				var position=getTargetPosition(this.target);
				var top=position.top;
				var offsetY=prefs.floatBarOffset.y;

				if(position.t<=0){//图片被遮住.
					top-=position.t;
					offsetY=0;
				};

				var left=position.left;
				var offsetX=prefs.floatBarOffset.x;

				if(position.l<=0){
					left-=position.l;
					offsetX=0;
				};

				var fb=this.floatBar;
				var fbs=this.floatBar.style;
				fbs.top=top + offsetY + 'px';
				fbs.left=left + offsetX + 'px';
				fbs.visibility='visible';
				this.preTarget=this.target;//保存一下这个成功显示浮动栏的对象.
			},
			showDelay:function(){
				var self=this;
				clearTimeout(this.showTimer);
				this.showTimer=setTimeout(function(){
					self.show();
				},prefs.floatBarShowDelay);
			},
			over:function(target,e,src,noZoom){
				var self=this;
				this.src=src;
				this.noZoom=noZoom;
				this.target=target;
				this.tSrc=target.src;

				var loadingImgs=LoadingIObj.all;
				for(var i in loadingImgs){//读取中的图片,不显示浮动栏,调整读取图标的位置.
					if(loadingImgs.hasOwnProperty(i)){
						var value=loadingImgs[i].self;
						if(value.target==target){
							C.log(target,'正在被读取,不显示浮动操作栏');
							value.setPosition();
							return;
						};
					};
				};

					var allMagFiles=MagnifierObj.all;//被放大镜盯上的图片,不要显示浮动栏.
					for(var i in allMagFiles){
						if(allMagFiles.hasOwnProperty(i)){
							var value=allMagFiles[i];
							if(value.target==target){
								C.log(target,'目标被放大镜盯上了')
								return;
							};
						};
					};

				this.out(target);
				this.buttonSwitch();

				//返回上一个显示的图片上面,并且返回之前工具栏依然显示,那么保持显示.
				if(target==this.preTarget && this.floatBar.style.visibility=='visible'){
					C.log('返回上一次显示的对象:',target);
					this.show();
				}else{
					this.showDelay();
				};
			},
			out:function(target){
				var self=this;
				function imgOut(e){
					this.removeEventListener('mouseout',imgOut,false);
					C.log('out:',target);
					if(self.floatBar.style.visibility=='hidden'){
						clearTimeout(self.showTimer);
						return;
					}
					self.hideDelay();
				};
				target.addEventListener('mouseout',imgOut,false);
			},
			hide:function(){
				C.log('隐藏',this.target);
				this.floatBar.style.visibility='hidden';
			},
			hideDelay:function(){
				var self=this;
				clearTimeout(this.hideTimer);
				this.hideTimer=setTimeout(function(){
					self.hide();
				},prefs.floatBarHideDelay);
			},
			load:function(type){
				this.hide();
				new LoadingIObj(this.src,this.target,type,this.tSrc);
			},
			isOpened:function(src){
				var all=PicObj.all;
				src=src || this.src;
				var othis;
				for(var i in all){//看看是否已经是打开的图片,检测src是否一样,如果是打开的话,直接带到最前面.
					if(all.hasOwnProperty(i)){
						othis=all[i].self;
						if(src==othis.src){
							C.log('已经打开了的图片',src);
							othis.setFront();
							othis.borderFlash();
							return true;
						};
					};
				};
			},
			addStyle:function(){
				var style=document.createElement('style');
				style.type='text/css';
				style.textContent='\
					#pv_float-bar{\
						width:auto;\
						height:auto;\
						border:none;\
						margin:0;\
						padding:2px;\
						position:absolute;\
						z-index:99999;\
						opacity:0.8;\
						-o-transition:opacity 0.2s ease-in-out;\
						-moz-transition:opacity 0.2s ease-in-out;\
						-webkit-transition:opacity 0.2s ease-in-out;\
						transition:opacity 0.2s ease-in-out;\
					}\
					#pv_float-bar:hover{\
						opacity:1;\
					}\
					#pv_float-bar-viewori{\
						background-image:url("'+prefs.icons.actualSize+'");\
					}\
					#pv_float-bar-magnifier{\
						background-image:url("'+prefs.icons.magnifier+'");\
					}\
					#pv_float-bar-viewcur{\
						background-image:url("'+prefs.icons.noZoom+'");\
					}\
					#pv_float-bar span{\
						cursor:pointer;\
						float:left;\
						height:22px;\
						width:24px;\
						margin:0 5px 0 0;\
						border:none;\
						padding:0;\
						background-position:0 0;\
						background-repeat:no-repeat;\
						-o-transition:background-position 0.2s ease-in-out;\
						-moz-transition:background-position 0.2s ease-in-out;\
						-webkit-transition:background-position 0.2s ease-in-out;\
						transition:background-position 0.2s ease-in-out;\
					}\
					#pv_float-bar span:hover{\
						background-position:-25px 0;\
					}\
					#pv_float-bar span:active{\
						background-position:-50px 0;\
					}\
				';
				document.documentElement.appendChild(style);
			},
			init:function(){
				this.addStyle();
				var floatBar=document.createElement('div');
				floatBar.id='pv_float-bar';
				floatBar.style.cssText='\
					visibility:hidden;\
					top:0;\
					left:0;\
				';

				var floatBar_viewOri=document.createElement('span');
				floatBar_viewOri.id='pv_float-bar-viewori';
				floatBar_viewOri.title='查看原始图片';


				var floatBar_magnifier=document.createElement('span');
				floatBar_magnifier.id='pv_float-bar-magnifier';
				floatBar_magnifier.title='放大镜';
				floatBar.appendChild(floatBar_magnifier);

				var floatBar_viewCur=document.createElement('span');
				floatBar_viewCur.id='pv_float-bar-viewcur';
				floatBar_viewCur.title='当前图片弹出查看';

				floatBar.appendChild(floatBar_viewOri);
				floatBar.appendChild(floatBar_viewCur);
				floatBar.appendChild(floatBar_magnifier);


				this.floatBar=floatBar;
				var self=this;

				if(support.mouseenter){
					floatBar.addEventListener('mouseenter',function(){
						clearTimeout(self.hideTimer);
					},false);
				}else{
					addCustomEvent.mouseenter(floatBar,function(){
						clearTimeout(self.hideTimer);
					});
				};


				if(support.mouseleave){
					floatBar.addEventListener('mouseleave',function(){
						self.hideDelay();
					},false);
				}else{
					addCustomEvent.mouseleave(floatBar,function(){
						self.hideDelay();
					});
				};

				this.floatBar_viewOri=floatBar_viewOri;
				this.floatBar_magnifier=floatBar_magnifier;
				this.floatBar_viewCur=floatBar_viewCur;

				floatBar_viewOri.addEventListener('click',function(e){//查看原图
					e.preventDefault();
					if(self.isOpened())return;
					self.load('original');//载入图片.
				},false);

				floatBar_magnifier.addEventListener('click',function(e){//放大镜
					e.preventDefault();
					self.load('magnifier');//载入图片.
				},false);

				floatBar_viewCur.addEventListener('click',function(e){//弹出当前图片.
					e.preventDefault();
					if(self.isOpened(self.tSrc))return;
					self.load('current');//载入图片.
				},false);


				var rstoHandler=function(){
					if(floatBar.style.visibility!='hidden'){
						self.show();
					};
				};

				var resizeTimer;
				window.addEventListener('resize',function(){
					clearTimeout(resizeTimer);
					resizeTimer=setTimeout(rstoHandler,299);
				},false);


/*
				var scrollTimer;
				window.addEventListener('scroll',function(e){
					clearTimeout(scrollTimer);
					scrollTimer=setTimeout(rstoHandler,299);
				},false);
*/
				document.documentElement.appendChild(floatBar);
			},
		};


		//事件支持检测.
		function eventSupported( eventName,el ){
			el = el || document.createElement("div");
			eventName = "on" + eventName;
			var isSupported = (eventName in el);
			if (el.setAttribute && !isSupported ) {
				el.setAttribute(eventName, "return;");
				isSupported = typeof el[eventName] === "function";
			};
			el = null;
			return isSupported;
		};

		//属性支持.
		function proSupported(proName,el){
			el = el || document.createElement("div");
			var isSupported = (proName in el);
			el=null;
			return isSupported;
		};

		//css属性支持
		function cssProSupported(proName,el){
			el = el || document.createElement("div");
			el=el.style;
			var isSupported = (proName in el);
			el=null;
			return isSupported;
		};

		//xpath 获取单个元素
		function getElementByXpath(xpath,contextNode,doc){
			doc=doc || document;
			contextNode=contextNode || doc;
			return doc.evaluate(xpath,contextNode,null,9,null).singleNodeValue;
		};

		//xpath 获取多个元素.
		function getAllElementsByXpath(xpath,contextNode,doc){
			doc=doc || document;
			contextNode=contextNode || doc;
			return doc.evaluate(xpath,contextNode,null,7,null);
		};


		//获取位置
		function getTargetPosition(target){
			var target=target;
			var rect=target.getBoundingClientRect();
			var compStyle=getComputedStyle(target,'');
			var pInt=parseInt;
			var t=rect.top + pInt(compStyle.paddingTop) + pInt(compStyle.borderTopWidth);
			var l=rect.left + pInt(compStyle.paddingLeft) + pInt(compStyle.borderLeftWidth);
			return {
				t:t,
				l:l,
				top: t + window.scrollY,
				left: l + window.scrollX,
			};
		};

		//bind fn
		var fnBind=(function(){
			var slice = Array.prototype.slice;
			return {
				bind: function( fun, thisp ) {
					var args = slice.call(arguments, 2);
					return function() {
						return fun.apply(thisp, args.concat(slice.call(arguments)));
					}
				},
				bindAsEventListener: function( fun, thisp ) {
					var args = slice.call(arguments, 2);
					return function(event) {
						return fun.apply(thisp, [event].concat(args));
					}
				}
			};
		})();


		var matchedRule;
		var URL=location.href;

		var floatBar;

		//支持情况.
		var support={
			mouseenter:eventSupported('mouseenter'),
			mouseleave:eventSupported('mouseleave'),
			naturalWHS:proSupported('naturalWidth',new Image()),
			wheelEvent:eventSupported('mousewheel')? 'mousewheel' : 'DOMMouseScroll',
			transform:(function(){
				var t=['MozTransform','OTransform','WebkitTransform','transform'];
				for(var i=t.length-1,t_i;i>=0;i--){
					t_i=t[i];
					if(cssProSupported(t_i)){
						return t_i;
					};
				};
			})(),
			canvas:(function(){
				try{
					if(document.createElement("canvas").getContext("2d"))return true;
				}catch(e){};
			})(),
		};
		C.log('support:',support);

		function getDisIS(target){//获取页面上显示的图片的宽 高.
			var iCS=getComputedStyle(target,'');
			var pInt=parseInt;
			return {
				h:pInt(iCS.height),
				w:pInt(iCS.width),
			};
		};

		function getIAS(img){//获取显示图片的实际尺寸.
			var ret={};
			if(support.naturalWHS){
				ret.h=img.naturalHeight;
				ret.w=img.naturalWidth;
			}else{
				var cloneImg=new Image();
				cloneImg.src=img.src;
				ret.h=cloneImg.height;
				ret.w=cloneImg.width;
			};
			return ret;
		};

		function moverhandler(e){
			var target=e.target;
			if(target.nodeName!='IMG')return;
			if(target.className=='pv_pic'){//已经打开的图片.
				return;
			};
			var imgPA=getElementByXpath('./ancestor::a[1]',target);//img的第一个父A元素,也就是连接,其实第一个只是针对opera来说的,因为只有在opera上才能有两个以上的a元素,其他浏览器会被当做错误被纠正.-_-!!~

			if(matchedRule===undefined){//找到符合站点的高级规则,并缓存.
				matchedRule=false;
				for(var i=0,ii=siteInfo.length,siteInfo_x;i<ii;i++){
					siteInfo_x=siteInfo[i];
					//C.log('规则',i,siteInfo_x);
					if(siteInfo_x.url && siteInfo_x.url.test(URL)){
						matchedRule=siteInfo_x;
						C.log('站点规则:',matchedRule);
						break;
					};
				};
			};

			var src;
			var noZoom;

			if(matchedRule){//通过高级规则获取.
				try{
					src=matchedRule.getImage.call(target,target,imgPA);
					if(src){
						C.log('高级规则匹配成功:',matchedRule);
					};
				}catch(e){
				};
			};
			if(!src){//遍历统配规则.
				for(var i=0,ii=tprules.length;i<ii;i++){
					try{
						src=tprules[i].call(target,target,imgPA);
					if(src){
						C.log('统配规则匹配:',tprules[i]);
						break;
					};
					}catch(e){
					};
				};
				
			};
			if(!src){//链接可能是一张图片...
				if(imgPA){
					var iPASrc=imgPA.href;
					if(/\.(?:jpg|jpeg|png|gif|bmp)$/i.test(iPASrc)){
						src=iPASrc;
					};
				};
			};
			if(!src){//本图片是否被缩放.
				var imgAS=getIAS(target);//实际尺寸
				C.log('图片实际尺寸:',imgAS);
				var imgCS=getDisIS(target);
				C.log('显示尺寸:',imgCS);
				if(!(imgAS.w==imgCS.w && imgAS.h==imgCS.h)){//如果不是两者完全相等,那么被缩放了.
					C.log('当前图片被缩放了');
					src=target.src;
				}else{
					C.log('图片没有被缩放的说');
					if(prefs.floatBarForceShow.enabled && (imgCS.w>=prefs.floatBarForceShow.size.w && imgCS.h>=prefs.floatBarForceShow.size.h)){
						C.log('强制显示浮动栏.');
						noZoom=true;
						src=target.src;
					};
				};
			};
			C.log('图片地址:',src);
			C.log('over:',target);
			if(src){//如果存在src那么现实浮动栏.
				if(!floatBar){
					floatBar=new FloatBarObj();
				};
				floatBar.over(target,e,src,noZoom);
			};
		};


		//监听 mouseover
		document.addEventListener('mouseover',moverhandler,true);
	};

	if(envir.opera){
		document.addEventListener('DOMContentLoaded',init,false);
	}else{
		init();
	};


})(this,window,window.document);