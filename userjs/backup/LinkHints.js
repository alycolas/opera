// ==UserScript==
// @name LinkHints
// @author AVIKF<qjavikf@126.com>
// @description 给链接添加编号导航(support opera 11.01+).
// @date 2011-03-17
// @modifydate 2011-03-19
// @version 0.0.1.2
// @exclude http*://*.google.com/*
// @exclude http*://reader.youdao.com/*
// ==/UserScript==
// 使用大部分（超过90%）Phil Crosby, Ilya Sukhar 的代码--Chrome Vimium.

(function () {
  var opera = window.opera;
  if(!opera) return;

  var linkHintsKey = "e";                           // 按e键进入链接编号导航，使用小写
  var linkHintCharacters = "sadfgqwrtzxcvb";         // 编号项目,小写，注意，现在不能加入上面的导航键
  var linkHintsModeActived = false;
  var insertModeActived = false;
  var currentZoomLevel = 100;
  var hintMarkers = [];
  var hintMarkerContainingDiv = null;
  // The characters that were typed in while in "link hints" mode.
  var hintKeystrokeQueue = [];
  // Whether we have added to the page the CSS needed to display link hints.
  var linkHintsCssAdded = false;

  var keyCodes = { ESC: 27, backspace: 8, deleteKey: 46, shiftKey: 16};

  var linkHintCss =
    '.internalHintMarker {' +
      'position:absolute;' +
      'background-color:yellow;' +
      'color:black;' +
      'font-weight:bold;' +
      'font-size:10px;' +
      'padding:0 1px;' +
      'line-height:100%;' +
      'width:auto;' +
      'display:block;' +
      'border:1px solid #E3BE23;' +
      'z-index:99999999;' +
      'font-family:"Helvetica Neue", "Helvetica", "Arial", "Sans";' +
      'top:-1px;' +
      'left:-1px;' +
    '}' +
    '.internalHintMarker > .matchingCharacter {' +
      'color:#C79F0B;' +
    '}';

  document.addEventListener("keypress", whatKey, false);

  function whatKey (evt) {
    var eventReference = (typeof evt !== "undefined")? evt : event;
  if(isSelectable(whichElement(eventReference))){
    insertModeActived = true;
    return;
  }else{
    var keyCde = eventReference.keyCode;
    var keyChar = String.fromCharCode(keyCde);
    console.log("Key Press KeyCode: " + keyCde + " KeyChar: " + keyChar);
    if (isEscape(eventReference)){
      deactivateLinkHintsMode();
    }else if (keyChar == linkHintsKey){
      if (!linkHintsModeActived){
        linkHintsModeActived = true;
        activateLinkHintsMode();
      }else if (linkHintsModeActived){
        resetLinkHintsMode();
      }else if (!insertModeActived) {
      insertModeActived = true;
      }
    }
  }
  }

  function whichElement(e)
  {
    var targ
    if (!e) var e = window.event
    if (e.target) targ = e.target
    else if (e.srcElement) targ = e.srcElement
    if (targ.nodeType == 3) // defeat Safari bug
       targ = targ.parentNode
    return targ;
    //alert("You clicked on a " + tname + " element.")
  }
  
  var platform;
  if (navigator.userAgent.indexOf("Mac") != -1)
    platform = "Mac";
  else if (navigator.userAgent.indexOf("Linux") != -1)
    platform = "Linux";
  else
    platform = "Windows";

  function isEscape(event) {
    return event.keyCode == keyCodes.ESC
  }

  /* 
   * Generate an XPath describing what a clickable element is.
   * The final expression will be something like "//button | //xhtml:button | ..."
   */
  var clickableElementsXPath = (function() {
    var clickableElements = ["a", "textarea", "button", "select", "input[not(@type='hidden')]",
           "*[@onclick or @tabindex or @role='link' or @role='button']"];
    var xpath = [];
    for (var i in clickableElements)
      xpath.push("//" + clickableElements[i], "//xhtml:" + clickableElements[i]);
      return xpath.join(" | ")
    })();
  
  function activateLinkHintsMode () {
    if (!linkHintsModeActived) return;
    if (!linkHintsCssAdded) addCssToPage(linkHintCss); // linkHintCss is declared by vimiumFrontend.js
    buildLinkHints();
    document.addEventListener("keydown", onKeyDownInLinkHintsMode, false);
  }
  
  /*
   * Builds and displays link hints for every visible clickable item on the page.
   */
  function buildLinkHints() {
    var visibleElements = getVisibleClickableElements();
  
    // Initialize the number used to generate the character hints to be as many digits as we need to
    // highlight all the links on the page; we don't want some link hints to have more chars than others.
    var digitsNeeded = Math.ceil(logXOfBase(visibleElements.length, linkHintCharacters.length));
    var linkHintNumber = 0;
    for (var i = 0, count = visibleElements.length; i < count; i++) {
      hintMarkers.push(createMarkerFor(visibleElements[i], linkHintNumber, digitsNeeded));
      linkHintNumber++;
    }
    // Note(philc): Append these markers as top level children instead of as child nodes to the link itself,
    // because some clickable elements cannot contain children, e.g. submit buttons. This has the caveat
    // that if you scroll the page and the link has position=fixed, the marker will not stay fixed.
    // Also note that adding these nodes to document.body all at once is significantly faster than one-by-one.
    hintMarkerContainingDiv = document.createElement("div");
    hintMarkerContainingDiv.className = "internalHintMarker";
    for (var i = 0; i < hintMarkers.length; i++)
      hintMarkerContainingDiv.appendChild(hintMarkers[i]);
    document.documentElement.appendChild(hintMarkerContainingDiv);
  }
  
  function logXOfBase(x, base) { return Math.log(x) / Math.log(base); }
  
  /*
   * Adds the given CSS to the page.
   */
  function addCssToPage(css) {
    var head = document.getElementsByTagName("head")[0];
    if (!head) {
      head = document.createElement("head");
      document.documentElement.appendChild(head);
    }
    var style = document.createElement("style");
    style.type = "text/css";
    style.appendChild(document.createTextNode(css));
    head.appendChild(style);
    linkHintCssAdded = true;
  }
  
  /*
   * Returns all clickable elements that are not hidden and are in the current viewport.
   * We prune invisible elements partly for performance reasons, but moreso it's to decrease the number
   * of digits needed to enumerate all of the links on screen.
   */
  function getVisibleClickableElements() {
    var resultSet = document.evaluate(clickableElementsXPath, document.body,
      function (namespace) {
        return namespace == "xhtml" ? "http://www.w3.org/1999/xhtml" : null;
      }, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  
    var visibleElements = [];
  
    // Find all visible clickable elements.
    for (var i = 0, count = resultSet.snapshotLength; i < count; i++) {
      var element = resultSet.snapshotItem(i);
      var clientRect = element.getClientRects()[0];
  
      if (isVisible(element, clientRect))
        visibleElements.push({element: element, rect: clientRect});
  
      // If the link has zero dimensions, it may be wrapping visible
      // but floated elements. Check for this.
      if (clientRect && (clientRect.width == 0 || clientRect.height == 0)) {
        for (var j = 0, childrenCount = element.children.length; j < childrenCount; j++) {
          if (window.getComputedStyle(element.children[j], null).getPropertyValue('float') != 'none') {
            var childClientRect = element.children[j].getClientRects()[0];
            if (isVisible(element.children[j], childClientRect)) {
              visibleElements.push({element: element.children[j], rect: childClientRect});
              break;
            }
          }
        }
      }
    }
    return visibleElements;
  }
  
  /*
   * Returns true if element is visible.
   */
  function isVisible(element, clientRect) {
    // Exclude links which have just a few pixels on screen, because the link hints won't show for them anyway.
    var zoomFactor = currentZoomLevel / 100.0;
    if (!clientRect || clientRect.top < 0 || clientRect.top * zoomFactor >= window.innerHeight - 4 ||
      clientRect.left < 0 || clientRect.left * zoomFactor >= window.innerWidth - 4)
      return false;
  
    if (clientRect.width < 3 || clientRect.height < 3)
      return false;
  
    // eliminate invisible elements (see test_harnesses/visibility_test.html)
    var computedStyle = window.getComputedStyle(element, null);
    if (computedStyle.getPropertyValue('visibility') != 'visible' ||
      computedStyle.getPropertyValue('display') == 'none')
      return false;
  
    return true;
  }
  
  /*
   * Creates a link marker for the given link.
   */
  function createMarkerFor(link, linkHintNumber, linkHintDigits) {
    var hintString = numberToHintString(linkHintNumber, linkHintDigits);
    var marker = document.createElement("div");
    marker.className = "internalHintMarker HintMarker";
    var innerHTML = [];
    // Make each hint character a span, so that we can highlight the typed characters as you type them.
    for (var i = 0; i < hintString.length; i++)
      innerHTML.push("<span>" + hintString[i].toUpperCase() + "</span>");
    marker.innerHTML = innerHTML.join("");
    marker.setAttribute("hintString", hintString);
  
    // Note: this call will be expensive if we modify the DOM in between calls.
    var clientRect = link.rect;
    // The coordinates given by the window do not have the zoom factor included since the zoom is set only on
    // the document node.
    var zoomFactor = currentZoomLevel / 100.0;
    marker.style.left = clientRect.left + window.scrollX / zoomFactor + "px";
    marker.style.top = clientRect.top  + window.scrollY / zoomFactor + "px";
  
    marker.clickableItem = link.element;
    return marker;
  }
  
  /*
   * Converts a number like "8" into a hint string like "JK". This is used to sequentially generate all of
   * the hint text. The hint string will be "padded with zeroes" to ensure its length is equal to numHintDigits.
   */
  function numberToHintString(number, numHintDigits) {
    var base = linkHintCharacters.length;
    var hintString = [];
    var remainder = 0;
    do {
      remainder = number % base;
      hintString.unshift(linkHintCharacters[remainder]);
      number -= remainder;
      number /= Math.floor(base);
    } while (number > 0);
  
    // Pad the hint string we're returning so that it matches numHintDigits.
    for (var i = 0; i < numHintDigits - hintString.length; i++)
      hintString.unshift(linkHintCharacters[0]);
    return hintString.join("");
  }
  
  function onKeyDownInLinkHintsMode(event) {
  
    var keyChar = String.fromCharCode(event.keyCode).toLowerCase();
    if (!keyChar)
    return;
    console.log("Key Down KeyCode: " + event.keyCode + " KeyChar: " + keyChar);
  
    if (isEscape(event)) {
      deactivateLinkHintsMode();
    } else if (event.keyCode == keyCodes.backspace || event.keyCode == keyCodes.deleteKey) {
      if (hintKeystrokeQueue.length == 0) {
        deactivateLinkHintsMode();
      } else {
        hintKeystrokeQueue.pop();
        updateLinkHints();
      }
    }else if (keyChar == linkHintsKey) {
      if (hintKeystrokeQueue.length == 0) {
        resetLinkHintsMode();
      }
    } else if (linkHintCharacters.indexOf(keyChar) >= 0) {
      hintKeystrokeQueue.push(keyChar);
      updateLinkHints();
    }
    event.stopPropagation();
    event.preventDefault();
  }
  
  function deactivateLinkHintsMode() {
    if (hintMarkerContainingDiv)
      hintMarkerContainingDiv.parentNode.removeChild(hintMarkerContainingDiv);
    hintMarkerContainingDiv = null;
    hintMarkers = [];
    hintKeystrokeQueue = [];
    document.removeEventListener("keydown", onKeyDownInLinkHintsMode, false);
    linkHintsModeActived = false;
    insertModeActived = false;
  }
  
  /*
   * Updates the visibility of link hints on screen based on the keystrokes typed thus far. If only one
   * link hint remains, click on that link and exit link hints mode.
   */
  function updateLinkHints() {
    var matchString = hintKeystrokeQueue.join("");
    var linksMatched = highlightLinkMatches(matchString);
    if (linksMatched.length == 0)
      deactivateLinkHintsMode();
    else if (linksMatched.length == 1) {
      var matchedLink = linksMatched[0];
      if (isSelectable(matchedLink)) {
        insertModeActived = true;
        // When focusing a textbox, put the selection caret at the end of the textbox's contents.
        matchedLink.focus();
        matchedLink.select();
        deactivateLinkHintsMode();
      } else {
        // we want to give the user some feedback depicting which link they've selected by focusing it.
        setTimeout(function() { simulateClick(matchedLink); }, 400);
        matchedLink.focus();
        deactivateLinkHintsMode();
      }
    }
  }
  
  /*
   * Hides link hints which do not match the given search string. To allow the backspace key to work, this
   * will also show link hints which do match but were previously hidden.
   */
  function highlightLinkMatches(searchString) {
    var linksMatched = [];
    for (var i = 0; i < hintMarkers.length; i++) {
      var linkMarker = hintMarkers[i];
      if (linkMarker.getAttribute("hintString").indexOf(searchString) == 0) {
        if (linkMarker.style.display == "none")
          linkMarker.style.display = "";
          var childNodes = linkMarker.childNodes;
          for (var j = 0, childNodesCount = childNodes.length; j < childNodesCount; j++)
            childNodes[j].className = (j >= searchString.length) ? "" : "matchingCharacter";
          linksMatched.push(linkMarker.clickableItem);
        } else {
          linkMarker.style.display = "none";
        }
    }
    return linksMatched;
  }
  
    function resetLinkHintsMode() {
      deactivateLinkHintsMode();
        linkHintsModeActived = true;
      activateLinkHintsMode();
    }
  
  /*
   * Selectable means the element has a text caret; this is not the same as "focusable".
   */
  function isSelectable(element) {
    var selectableTypes = ["search", "text", "password"];
    return (element.tagName == "INPUT" && selectableTypes.indexOf(element.type) >= 0) ||
      element.tagName == "TEXTAREA";
  }
  
  function simulateClick(link) {
    var event = document.createEvent("MouseEvents");
    // When "clicking" on a link, dispatch the event with the appropriate meta key (CMD on Mac, CTRL on windows)
    // to open it in a new tab if necessary.
    var metaKey = (platform == "Mac");
    var ctrlKey = (platform != "Mac");
    event.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, ctrlKey, false, false, metaKey, 0, null);
  
    // Debugging note: Firefox will not execute the link's default action if we dispatch this click event,
    // but Webkit will. Dispatching a click on an input box does not seem to focus it; we do that separately
    link.dispatchEvent(event);
  }
})();
