// ==UserScript==
// @name images.google.com - Google Image frame bypasser
// @author GreyWyvern 
// @namespace http://www.greywyvern.com/ 
// @version 1.2
// @description  Improves Google Images result pages by linking the
//			image thumbnails directly to the images
//			themselves.  A "See Context" link is also added
//			which links directly to the page referring to
//			the image.
// @ujs:category site: enhancements
// @ujs:published 2006-01-07 23:08
// @ujs:modified 2006-01-07 22:09
// @ujs:documentation http://userjs.org/scripts/site/enhancements/googleimages-thumblink 
// @ujs:download http://userjs.org/scripts/download/site/enhancements/googleimages-thumblink.js
// ==/UserScript==

/* 
 * Copyright © 2006, GreyWyvern
 * All rights reserved.
 * 
 * * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 * * Neither the name of UserJS.org nor the names of its contributors
 * may be used to endorse or promote products derived from this
 * software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */


/* Google Images frame bypasser
 *  Copyright 2005 (c) GreyWyvern (AKA Orca)
 *
 *  Licenced under the BSD Licence
 *  http://www.greywyvern.com/code/bsd.txt
 */

if (window.location.hostname.match(/^images\.google/) && window.location.pathname == "/images") {
  document.addEventListener("load",
    function(ev) {
      var ilnk = new Array();
      var alnk = document.getElementsByTagName("a");
      for (var x = alnk.length - 1; x >= 0; x--) {
        if (alnk[x].href.match(/imgurl=/)) {
          ilnk[ilnk.length] = unescape(alnk[x].href.replace(/.*?imgrefurl=(.*?)&h.*/gi, "$1"));
          alnk[x].title = unescape(alnk[x].href.replace(/.*?\/([^/]*?)&imgrefurl.*/gi, "$1"));
          alnk[x].href = unescape(alnk[x].href.replace(/.*?imgurl=(.*?)&imgrefurl.*/gi, "$1"));
        }
      }

      var atds = document.getElementsByTagName("td");
      for (var x = atds.length - 1; x >= 0; x--) {
        if (atds[x].valign == "top" || atds[x].style.paddingBottom == "1px") {
          var tfnt = atds[x].getElementsByTagName("font");
          var tdom = tfnt[1].innerHTML;
          tfnt[1].outerHTML = "";
          var tsiz = tfnt[0].innerHTML;
          tfnt[0].outerHTML = "<small><a href='" + ilnk.shift() + "' style='color:#008000;' title='See Context'>" + tdom + "</a><br />" + tsiz + "</small>";
        }
      }
    }
  , false); 
}