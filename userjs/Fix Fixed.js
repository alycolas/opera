// ==UserScript==
// @description    使网页元素不再固定在浏览器窗口的某个位置上
// @exclude http://*youtube*
// @include http://*
// @include *
// ==/UserScript==

document.addEventListener('DOMContentLoaded', function () {
    var oAll = document.all,
        oElement,
		i = 0,
        oCurrentStyle,
		oStyle;

    for (i = oAll.length - 1; i >= 0; --i) {
		oElement = oAll[i];
		oCurrentStyle = oElement.currentStyle;
		oStyle = oElement.style;
		if (oCurrentStyle.position === 'fixed') {
			oStyle.setProperty('position', 'absolute', 'important');
		} else if (oCurrentStyle.backgroundAttachment === 'fixed') {
			oStyle.setProperty('background-attachment', 'scroll', 'important');
		}
	}
}, false);
