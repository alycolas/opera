// ==UserScript==
// @name        Google 网页快照修复
// @include     http://www.google.*/search?*
// ==/UserScript==

document.addEventListener('mouseover', function (oEvent) {
   var oLink = oEvent.target.selectSingleNode('ancestor-or-self::a[@href]');
   if (oLink) {
      if (/return rwt\(/.test(oLink.getAttribute('onmousedown'))) {
         oLink.removeAttribute('onmousedown');
      }

      if (oLink.href.indexOf('http://webcache.googleusercontent.com/search?') === 0) {
         oLink.protocol = 'https:';
      }
   }
}, false);