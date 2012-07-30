// ==UserScript==
// @name noWhiteBackgroundColor-Opera
// @version 0.1(support Opera 11.50+)
// @date 2011-9-19
// @include http://118.67.120.134/*
// @include http://*engadget*
// @include http://bbs.*
// @include http://www.dgtle*
// @include http://www.iplaysoft.com/*
// @include http://slashdot.org/
// ==/UserScript==
(function()  {
    function noWhiteBackgroundColor() {
        function changeBackgroundColor(x)  {  // auto change colors too close to white
            var backgroundColorRGB=window.getComputedStyle(x,null).backgroundColor;  // get background-color(rgb)
            if(backgroundColorRGB!="transparent")  {  // convert hex color to rgb color to compare
                var RGBValuesArray = backgroundColorRGB.match(/\d+/g); //get rgb values
                var red = RGBValuesArray[0];
                var green = RGBValuesArray[1];
                var blue = RGBValuesArray[2];
                if (red>=240&&red<=255&&green>=240&&green<=255&&blue>=240&&blue<=255)  {  //pick the color range to change
                    x.style.backgroundColor="#cce8cf";}  // the background-color you want 
                }
            }
        var allElements=document.getElementsByTagName("*");  // get all elements on a page
        for(var i=0; i<allElements.length; i++)  {
            changeBackgroundColor(allElements[i]);}
    }

window.opera.addEventListener("AfterEvent.load",noWhiteBackgroundColor, false); 
})();
