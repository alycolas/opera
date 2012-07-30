//==UserScript==
// @name noWhiteBackgroundColor-Opera
// @version 0.1(support Opera 11.50+)
// @date 2011-9-19
// @include http://*.baidu.com/
// @exclude http://*.youku.com/*
// @exclude http://www.google.com*
// @exclude http://*weibo.com*
// @exclude http:/*youtube.com*

//==/UserScript==

(function () {
    function noWhiteBackgroundColor() {
        function changeBackgroundColor(x)  {
            var backgroundColorRGB=window.getComputedStyle(x,null).backgroundColor;
            if(backgroundColorRGB!="transparent")  {
                var RGBValuesArray = backgroundColorRGB.match(/\d+/g);
                var red = RGBValuesArray[0];
                var green = RGBValuesArray[1];
                var blue = RGBValuesArray[2];
                if (red>=240&&red<=255&&green>=240&&green<=255&&blue>=240&&blue<=255)  {
                    x.style.backgroundColor="#cce8cf";}
                }
            }
        var allElements=document.getElementsByTagName("*");
        for(var i=0; i<allElements.length; i++)  {
            changeBackgroundColor(allElements[i]);}
    }
	window.addEventListener("DOMContentLoaded",noWhiteBackgroundColor, false);
})() ; 

/* javascript:(function(){
        for(var i=0; i<document.getElementsByTagName("*").length; i++)
            if(window.getComputedStyle(document.getElementsByTagName("*")[i],null).backgroundColor!="transparent")               
				if (window.getComputedStyle(document.getElementsByTagName("*")[i],null).backgroundColor.match(/\d+/g)[0]>=240&&window.getComputedStyle(document.getElementsByTagName("*")[i],null).backgroundColor.match(/\d+/g)[0]<=255&&window.getComputedStyle(document.getElementsByTagName("*")[i],null).backgroundColor.match(/\d+/g)[1]>=240&&window.getComputedStyle(document.getElementsByTagName("*")[i],null).backgroundColor.match(/\d+/g)[1]<=255&&window.getComputedStyle(document.getElementsByTagName("*")[i],null).backgroundColor.match(/\d+/g)[2]>=240&&window.getComputedStyle(document.getElementsByTagName("*")[i],null).backgroundColor.match(/\d+/g)[2]<=255)
                    document.getElementsByTagName("*")[i].style.backgroundColor="#cce8cf";
})(); */ 