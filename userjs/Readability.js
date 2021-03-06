/*
 * Readability. An Arc90 Lab Experiment. 
 * Website: http://lab.arc90.com/experiments/readability
 * Source:  http://code.google.com/p/arc90labs-readability
 *
 * Copyright (c) 2009 Arc90 Inc
 * Readability is licensed under the Apache License, Version 2.0.
**/

(function(){

	//在这个数组里面的网站将..将自动加载本JS..
	//['网站名',启用,网站正则]
	var AUTOSI=[
		['奇克的资讯,重要的东西',true,/https?:\/\/.+\.solidot\.org\/.+/i],
	];

	///setting///
	var readConvertLinksToFootnotes=false;
	var readStyle='style-ebook'; // style-newspaper ,style-Novel ,style-ebook ,style-apertura ,style-athelas
	var readSize='size-small'; // size-x-small ,size-small, size-large ,size-x-large
	var readMargin='margin-x-narrow'; //  margin-x-narrow, margin-narrow, margin-medium , margin-wide , margin-x-wide
	///setting///


	var dbg = function(s) {
			if(typeof console !== 'undefined') {
					console.log("Readability: " + s);
			}
	};

	var readability = {
			version:                '1.6.1',
			emailSrc:               'http://lab.arc90.com/experiments/readability/email.php',
			iframeLoads:             0,
			convertLinksToFootnotes: false,
			frameHack:               false, /**
																				* The frame hack is to workaround a firefox bug where if you
																				* pull content out of a frame and stick it into the parent element, the scrollbar won't appear.
																				* So we fake a scrollbar in the wrapping div.
																			 **/
			biggestFrame:            false,
			bodyCache:               null,   /* Cache the body HTML in case we need to re-use it later */
			flags:                   0x1 | 0x2 | 0x4,   /* Start with both flags set. */
			
			/* constants */
			FLAG_STRIP_UNLIKELYS: 0x1,
			FLAG_WEIGHT_CLASSES:  0x2,
		FLAG_CLEAN_CONDITIONALLY: 0x4,
			
			/**
			 * All of the regular expressions in use within readability.
			 * Defined up here so we don't instantiate them repeatedly in loops.
			 **/
			regexps: {
					unlikelyCandidatesRe:   /combx|comment|disqus|foot|header|menu|rss|shoutbox|sidebar|sponsor|ad-break/i,
					okMaybeItsACandidateRe: /and|article|body|column|main/i,
					positiveRe:             /article|body|content|entry|hentry|page|pagination|post|text|blog/i,
					negativeRe:             /combx|comment|contact|foot|footer|footnote|link|masthead|media|meta|promo|related|scroll|shoutbox|sponsor|tags|widget/i,
					divToPElementsRe:       /<(a|blockquote|dl|div|img|ol|p|pre|table|ul)/i,
					replaceBrsRe:           /(<br[^>]*>[ \n\r\t]*){2,}/gi,
					replaceFontsRe:         /<(\/?)font[^>]*>/gi,
					trimRe:                 /^\s+|\s+$/g,
					normalizeRe:            /\s{2,}/g,
					killBreaksRe:           /(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,
					videoRe:                /http:\/\/(www\.)?(youtube|vimeo)\.com/i,
					skipFootnoteLinkRe:     /^\s*(\[?[a-z0-9]{1,2}\]?|^|edit|citation needed)\s*$/i
			},

			/**
			 * Runs readability.
			 * 
			 * Workflow:
			 *  1. Prep the document by removing script tags, css, etc.
			 *  2. Build readability's DOM tree.
			 *  3. Grab the article content from the current dom tree.
			 *  4. Replace the current DOM tree with the new one.
			 *  5. Read peacefully.
			 *
			 * @return void
			 **/
			init: function() {
					if(document.body && !readability.bodyCache) {
							readability.bodyCache = document.body.innerHTML; }
					
					readability.prepDocument();

					/* Build readability's DOM tree */
					var overlay        = document.createElement("DIV");
					var innerDiv       = document.createElement("DIV");
					var articleTools   = readability.getArticleTools();
					var articleTitle   = readability.getArticleTitle();
					var articleContent = readability.grabArticle();
					var articleFooter  = readability.getArticleFooter();

					/**
					 * If we attempted to strip unlikely candidates on the first run through, and we ended up with no content,
					 * that may mean we stripped out the actual content so we couldn't parse it. So re-run init while preserving
					 * unlikely candidates to have a better shot at getting our content out properly.
					**/
					if(readability.getInnerText(articleContent, false).length < 250)
					{
							if (readability.flagIsActive(readability.FLAG_STRIP_UNLIKELYS)) {
									readability.removeFlag(readability.FLAG_STRIP_UNLIKELYS);
									document.body.innerHTML = readability.bodyCache;
									return readability.init();
							}
							else if (readability.flagIsActive(readability.FLAG_WEIGHT_CLASSES)) {
									readability.removeFlag(readability.FLAG_WEIGHT_CLASSES);
									document.body.innerHTML = readability.bodyCache;
									return readability.init();              
							}
				else if (readability.flagIsActive(readability.FLAG_CLEAN_CONDITIONALLY)) {
					readability.removeFlag(readability.FLAG_CLEAN_CONDITIONALLY);
					document.body.innerHTML = readability.bodyCache;
					return readability.init();
				}
							else {
									articleContent.innerHTML = [
											"<p>Sorry, readability was unable to parse this page for content. If you feel like it should have been able to, please <a href='http://code.google.com/p/arc90labs-readability/issues/entry'>let us know by submitting an issue.</a></p>",
											(readability.frameHack ? "<p><strong>It appears this page uses frames.</strong> Unfortunately, browser security properties often cause Readability to fail on pages that include frames. You may want to try running readability itself on this source page: <a href='" + readability.biggestFrame.src + "'>" + readability.biggestFrame.src + "</a></p>" : ""),
											"<p>Also, please note that Readability does not play very nicely with front pages. Readability is intended to work on articles with a sizable chunk of text that you'd like to read comfortably. If you're using Readability on a landing page (like nytimes.com for example), please click into an article first before using Readability.</p>"
									].join('');
							}
					}

					overlay.id              = "readOverlay";
					innerDiv.id             = "readInner";

					/* Apply user-selected styling */
					document.body.className = readStyle;
					if (readStyle == "style-athelas" || readStyle == "style-apertura"){
							overlay.className = readStyle + " rdbTypekit";
					}
					else {
							overlay.className = readStyle;
					}
					innerDiv.className    = readMargin + " " + readSize;

					if(typeof(readConvertLinksToFootnotes) !== 'undefined' && readConvertLinksToFootnotes == true) {
							readability.convertLinksToFootnotes = true;
					}

					/* Glue the structure of our document together. */
					// articleContent.appendChild( articleFooter  );
								innerDiv.appendChild( articleTitle   );
								innerDiv.appendChild( articleContent );
								innerDiv.appendChild( articleFooter  );
								 overlay.appendChild( articleTools   );
								 overlay.appendChild( innerDiv       );

					/* Clear the old HTML, insert the new content. */
					document.body.innerHTML = "";
					document.body.insertBefore(overlay, document.body.firstChild);

					if(readability.frameHack)
					{
							var readOverlay = document.getElementById('readOverlay');
							readOverlay.style.height = '100%';
							readOverlay.style.overflow = 'auto';
					}

					/**
					 * If someone tries to use Readability on a site's root page, give them a warning about usage.
					**/
					if((window.location.protocol + "//" + window.location.host + "/") == window.location.href)
					{
							articleContent.style.display = "none";
							var rootWarning = document.createElement('p');
									rootWarning.id = "readability-warning";
									rootWarning.innerHTML = "<em>Readability</em> was intended for use on individual articles and not home pages. " +
											"If you'd like to try rendering this page anyways, <a onClick='javascript:document.getElementById(\"readability-warning\").style.display=\"none\";document.getElementById(\"readability-content\").style.display=\"block\";'>click here</a> to continue.";

							innerDiv.insertBefore( rootWarning, articleContent );
					}
	//        document.body.style.display = "block";

					if(readability.convertLinksToFootnotes && !window.location.href.match(/wikipedia\.org/g)) {
							readability.addFootnotes(articleContent);
					}

					window.scrollTo(0, 0);

					/* If we're using the Typekit library, select the font */
					if (readStyle == "style-athelas" || readStyle == "style-apertura") {
							readability.useRdbTypekit();
					}
			},

			/**
			 * Get the article tools Element that has buttons like reload, print, email.
			 *
			 * @return void
			 **/
			getArticleTools: function () {
					var articleTools = document.createElement("DIV");

					articleTools.id        = "readTools";
					articleTools.innerHTML = 
							"<a href='#' onclick='return window.location.reload()' title='Reload original page' id='reload-page'>Reload Original Page</a>" +
							"<a href='#' onclick='javascript:window.print();' title='Print page' id='print-page'>Print Page</a>" +
							"<a href='#' onclick='readability.emailBox(); return false;' title='Email page' id='email-page'>Email Page</a>";

					return articleTools;
			},
			
			/**
			 * Get the article title as an H1.
			 *
			 * @return void
			 **/
			getArticleTitle: function () {
					var curTitle = "",
							origTitle = "";

					try {
							curTitle = origTitle = document.title;
							
							if(typeof curTitle != "string") { /* If they had an element with id "title" in their HTML */
									curTitle = origTitle = readability.getInnerText(document.getElementsByTagName('title')[0]);             
							}
					}
					catch(e) {}
					
					if(curTitle.match(/ [\|\-] /))
					{
							curTitle = origTitle.replace(/(.*)[\|\-] .*/gi,'$1');
							
							if(curTitle.split(' ').length < 3) {
									curTitle = origTitle.replace(/[^\|\-]*[\|\-](.*)/gi,'$1');
							}
					}
					else if(curTitle.indexOf(': ') !== -1)
					{
							curTitle = origTitle.replace(/.*:(.*)/gi, '$1');

							if(curTitle.split(' ').length < 3) {
									curTitle = origTitle.replace(/[^:]*[:](.*)/gi,'$1');
							}
					}
					else if(curTitle.length > 150 || curTitle.length < 15)
					{
							var hOnes = document.getElementsByTagName('h1');
							if(hOnes.length == 1)
							{
									curTitle = readability.getInnerText(hOnes[0]);
							}
					}

					curTitle = curTitle.replace( readability.regexps.trimRe, "" );

					if(curTitle.split(' ').length <= 4) {
							curTitle = origTitle;
					}
					
					var articleTitle = document.createElement("H1");
					articleTitle.innerHTML = curTitle;
					
					return articleTitle;
			},

			/**
			 * Get the footer with the readability mark etc.
			 *
			 * @return void
			 **/
			getArticleFooter: function () {
					var articleFooter = document.createElement("DIV");

					/**
					 * For research purposes, generate an img src that contains the chosen readstyle etc,
					 * so we can generate aggregate stats and change styles based on them in the future
					 **/
					// var statsQueryParams = "?readStyle=" + encodeURIComponent(readStyle) + "&readMargin=" + encodeURIComponent(readMargin) + "&readSize=" + encodeURIComponent(readSize);
					/* TODO: attach this to an image */

					var twitterLink = document.createElement('a');
							twitterLink.setAttribute('href','http://lab.arc90.com/experiments/readability');
							twitterLink.setAttribute('id','footer-twitterLink');
							twitterLink.setAttribute('title','Follow Arc90 on Twitter');
							twitterLink.innerHTML = "Follow us on Twitter &raquo;";

					articleFooter.id = "readFooter";
					articleFooter.innerHTML = 
							"<div id='rdb-footer-left'>" +
									"<a href='http://lab.arc90.com/experiments/readability' id='readability-logo'>Readability &mdash; </a>" +
									"<a href='http://www.arc90.com/' id='arc90-logo'>An Arc90 Laboratory Experiment</a>" +
									"<span id='readability-url'> &mdash; http://lab.arc90.com/experiments/readability</span>" +
									"<a href='http://www.twitter.com/arc90' class='footer-twitterLink'>Follow us on Twitter &raquo;</a>" +
							"</div>" +
							"<div id='rdb-footer-right'>" +
									"<a href='http://www.twitter.com/arc90' class='footer-twitterLink'>Follow us on Twitter &raquo;</a>" +
									"<span class='version'>Readability version " + readability.version + "</span>" +
							"</div>";

					return articleFooter;
			},
			
			/**
			 * Prepare the HTML document for readability to scrape it.
			 * This includes things like stripping javascript, CSS, and handling terrible markup.
			 * 
			 * @return void
			 **/
			prepDocument: function () {
					/**
					 * In some cases a body element can't be found (if the HTML is totally hosed for example)
					 * so we create a new body node and append it to the document.
					 */
					if(document.body === null)
					{
							var body = document.createElement("body");
							try {
									document.body = body;       
							}
							catch(e) {
									document.documentElement.appendChild(body);
									dbg(e);
							}
					}

					var frames = document.getElementsByTagName('frame');
					if(frames.length > 0)
					{
							var bestFrame = null;
							var bestFrameSize = 0;    /* The frame to try to run readability upon. Must be on same domain. */
				var biggestFrameSize = 0; /* Used for the error message. Can be on any domain. */
							for(var frameIndex = 0; frameIndex < frames.length; frameIndex++)
							{
									var frameSize = frames[frameIndex].offsetWidth + frames[frameIndex].offsetHeight;
									var canAccessFrame = false;
									try {
											frames[frameIndex].contentWindow.document.body;
											canAccessFrame = true;
									}
									catch(eFrames) {
											dbg(eFrames);
									}

					if(frameSize > biggestFrameSize) {
						biggestFrameSize         = frameSize;
						readability.biggestFrame = frames[frameIndex];
					}
									
									if(canAccessFrame && frameSize > bestFrameSize)
									{
											readability.frameHack = true;
			
											bestFrame = frames[frameIndex];
											bestFrameSize = frameSize;
									}
							}

							if(bestFrame)
							{
									var newBody = document.createElement('body');
									newBody.innerHTML = bestFrame.contentWindow.document.body.innerHTML;
									newBody.style.overflow = 'scroll';
									document.body = newBody;
									
									var frameset = document.getElementsByTagName('frameset')[0];
									if(frameset) {
											frameset.parentNode.removeChild(frameset); }
							}
					}

					/* remove all scripts that are not readability */
					var scripts = document.getElementsByTagName('script');
					for(var i = scripts.length-1; i >= 0; i--)
					{
							if(typeof(scripts[i].src) == "undefined" || (scripts[i].src.indexOf('readability') == -1 && scripts[i].src.indexOf('typekit') == -1))
							{
									scripts[i].parentNode.removeChild(scripts[i]);          
							}
					}

					/* remove all stylesheets */
					for (var k=0;k < document.styleSheets.length; k++) {
							if (document.styleSheets[k].href !== null && document.styleSheets[k].href.lastIndexOf("readability") == -1) {
									document.styleSheets[k].disabled = true;
							}
					}

					/* Remove all style tags in head (not doing this on IE) - TODO: Why not? */
					var styleTags = document.getElementsByTagName("style");
					for (var st=0;st < styleTags.length; st++) {
							if (navigator.appName != "Microsoft Internet Explorer") {
									styleTags[st].textContent = ""; }
					}

					/* Turn all double br's into p's */
					/* Note, this is pretty costly as far as processing goes. Maybe optimize later. */
					document.body.innerHTML = document.body.innerHTML.replace(readability.regexps.replaceBrsRe, '</p><p>').replace(readability.regexps.replaceFontsRe, '<$1span>');
			},

			/**
			 * For easier reading, convert this document to have footnotes at the bottom rather than inline links.
			 * @see http://www.roughtype.com/archives/2010/05/experiments_in.php
			 *
			 * @return void
			**/
			addFootnotes: function(articleContent) {
					var footnotesWrapper = document.createElement('div');
					footnotesWrapper.innerHTML = "<h3>References</h3>";
					
					var articleFootnotes = document.createElement('ol');
					footnotesWrapper.appendChild(articleFootnotes);
					
					var articleLinks = articleContent.getElementsByTagName('a');
					
					var linkCount = 0;
					for (var i = 0; i < articleLinks.length; i++)
					{
							var articleLink  = articleLinks[i],
									footnoteLink = articleLink.cloneNode(true),
									refLink      = document.createElement('a'),
									footnote     = document.createElement('li'),
									linkDomain   = footnoteLink.host ? footnoteLink.host : document.location.host,
									linkText     = readability.getInnerText(articleLink);
							
							if(articleLink.className && articleLink.className.indexOf('readability-DoNotFootnote') !== -1 || linkText.match(readability.regexps.skipFootnoteLinkRe)) {
									continue;
							}
							
							linkCount++;

							/** Add a superscript reference after the article link */
							refLink.href      = '#readabilityFootnoteLink-' + linkCount;
							refLink.innerHTML = '<small><sup>[' + linkCount + ']</sup></small>'
							refLink.className = 'readability-DoNotFootnote';
							refLink.style.color = 'inherit';
							
							if(articleLink.parentNode.lastChild == articleLink) {
									articleLink.parentNode.appendChild(refLink);
							} else {
									articleLink.parentNode.insertBefore(refLink, articleLink.nextSibling);
							}

							articleLink.style.color = 'inherit';
							articleLink.name        = 'readabilityLink-' + linkCount;

							footnote.innerHTML      = "<small><sup><a href='#readabilityLink-" + linkCount + "' title='Jump to Link in Article'>^</a></sup></small> ";

							footnoteLink.innerHTML  = (footnoteLink.title ? footnoteLink.title : linkText);
							footnoteLink.name       = 'readabilityFootnoteLink-' + linkCount;
							
							footnote.appendChild(footnoteLink);
							footnote.innerHTML = footnote.innerHTML + "<small> (" + linkDomain + ")</small>";
							
							articleFootnotes.appendChild(footnote);
					}

					if(linkCount > 0) {
							articleContent.appendChild(footnotesWrapper);           
					}
			},

			useRdbTypekit: function () {
					var rdbHead      = document.getElementsByTagName('head')[0];
					var rdbTKScript  = document.createElement('script');
					var rdbTKCode    = null;

					var rdbTKLink    = document.createElement('a');
							rdbTKLink.setAttribute('class','rdbTK-powered');
							rdbTKLink.setAttribute('title','Fonts by Typekit');
							rdbTKLink.innerHTML = "Fonts by <span class='rdbTK'>Typekit</span>";

					if (readStyle == "style-athelas") {
							rdbTKCode = "sxt6vzy";
							dbg("Using Athelas Theme");

							rdbTKLink.setAttribute('href','http://typekit.com/?utm_source=readability&utm_medium=affiliate&utm_campaign=athelas');
							rdbTKLink.setAttribute('id','rdb-athelas');
							document.getElementById("rdb-footer-right").appendChild(rdbTKLink);
					}
					if (readStyle == "style-apertura") {
							rdbTKCode = "bae8ybu";
							dbg("Using Inverse Theme");

							rdbTKLink.setAttribute('href','http://typekit.com/?utm_source=readability&utm_medium=affiliate&utm_campaign=inverse');
							rdbTKLink.setAttribute('id','rdb-inverse');
							document.getElementById("rdb-footer-right").appendChild(rdbTKLink);
					}

					/**
					 * Setting new script tag attributes to pull Typekits libraries
					**/
					rdbTKScript.setAttribute('type','text/javascript');
					rdbTKScript.setAttribute('src',"http://use.typekit.com/" + rdbTKCode + ".js");
					rdbTKScript.setAttribute('charset','UTF-8');
					rdbHead.appendChild(rdbTKScript);

					/**
					 * In the future, maybe try using the following experimental Callback function?:
					 * http://gist.github.com/192350
					 * &
					 * http://getsatisfaction.com/typekit/topics/support_a_pre_and_post_load_callback_function
					**/
					var typekitLoader = function() {
							dbg("Looking for Typekit.");
							if(typeof Typekit != "undefined") {
									try {
											dbg("Caught typekit");
											Typekit.load();
											clearInterval(window.typekitInterval);
									} catch(e) {
											dbg("Typekit error: " + e);
									}
							}
					};

					window.typekitInterval = window.setInterval(typekitLoader, 100);
			},

			/**
			 * Prepare the article node for display. Clean out any inline styles,
			 * iframes, forms, strip extraneous <p> tags, etc.
			 *
			 * @param Element
			 * @return void
			 **/
			prepArticle: function (articleContent) {
					readability.cleanStyles(articleContent);
					readability.killBreaks(articleContent);

					/* Clean out junk from the article content */
					readability.cleanConditionally(articleContent, "form");
					readability.clean(articleContent, "object");
					readability.clean(articleContent, "h1");

					/**
					 * If there is only one h2, they are probably using it
					 * as a header and not a subheader, so remove it since we already have a header.
					***/
					if(articleContent.getElementsByTagName('h2').length == 1) {
							readability.clean(articleContent, "h2"); }
					readability.clean(articleContent, "iframe");

					readability.cleanHeaders(articleContent);

					/* Do these last as the previous stuff may have removed junk that will affect these */
					readability.cleanConditionally(articleContent, "table");
					readability.cleanConditionally(articleContent, "ul");
					readability.cleanConditionally(articleContent, "div");

					/* Remove extra paragraphs */
					var articleParagraphs = articleContent.getElementsByTagName('p');
					for(var i = articleParagraphs.length-1; i >= 0; i--)
					{
							var imgCount    = articleParagraphs[i].getElementsByTagName('img').length;
							var embedCount  = articleParagraphs[i].getElementsByTagName('embed').length;
							var objectCount = articleParagraphs[i].getElementsByTagName('object').length;
							
							if(imgCount === 0 && embedCount === 0 && objectCount === 0 && readability.getInnerText(articleParagraphs[i], false) == '')
							{
									articleParagraphs[i].parentNode.removeChild(articleParagraphs[i]);
							}
					}

					try {
							articleContent.innerHTML = articleContent.innerHTML.replace(/<br[^>]*>\s*<p/gi, '<p');      
					}
					catch (e) {
							dbg("Cleaning innerHTML of breaks failed. This is an IE strict-block-elements bug. Ignoring.: " + e);
					}
			},
			
			/**
			 * Initialize a node with the readability object. Also checks the
			 * className/id for special names to add to its score.
			 *
			 * @param Element
			 * @return void
			**/
			initializeNode: function (node) {
					node.readability = {"contentScore": 0};         

					switch(node.tagName) {
							case 'DIV':
									node.readability.contentScore += 5;
									break;

							case 'PRE':
							case 'TD':
							case 'BLOCKQUOTE':
									node.readability.contentScore += 3;
									break;
									
							case 'ADDRESS':
							case 'OL':
							case 'UL':
							case 'DL':
							case 'DD':
							case 'DT':
							case 'LI':
							case 'FORM':
									node.readability.contentScore -= 3;
									break;

							case 'H1':
							case 'H2':
							case 'H3':
							case 'H4':
							case 'H5':
							case 'H6':
							case 'TH':
									node.readability.contentScore -= 5;
									break;
					}
				 
					node.readability.contentScore += readability.getClassWeight(node);
			},
			
			/***
			 * grabArticle - Using a variety of metrics (content score, classname, element types), find the content that is
			 *               most likely to be the stuff a user wants to read. Then return it wrapped up in a div.
			 *
			 * @return Element
			**/
			grabArticle: function () {
					var stripUnlikelyCandidates = readability.flagIsActive(readability.FLAG_STRIP_UNLIKELYS);

					/**
					 * First, node prepping. Trash nodes that look cruddy (like ones with the class name "comment", etc), and turn divs
					 * into P tags where they have been used inappropriately (as in, where they contain no other block level elements.)
					 *
					 * Note: Assignment from index for performance. See http://www.peachpit.com/articles/article.aspx?p=31567&seqNum=5
					 * TODO: Shouldn't this be a reverse traversal?
					**/
					var node = null;
					var nodesToScore = [];
					for(var nodeIndex = 0; (node = document.getElementsByTagName('*')[nodeIndex]); nodeIndex++)
					{
							/* Remove unlikely candidates */
							if (stripUnlikelyCandidates) {
									var unlikelyMatchString = node.className + node.id;
									if (
						unlikelyMatchString.search(readability.regexps.unlikelyCandidatesRe) !== -1 &&
											unlikelyMatchString.search(readability.regexps.okMaybeItsACandidateRe) == -1 &&
											node.tagName !== "BODY"
					)
									{
											dbg("Removing unlikely candidate - " + unlikelyMatchString);
											node.parentNode.removeChild(node);
											nodeIndex--;
											continue;
									}               
							}

							if (node.tagName === "P" || node.tagName === "TD" || node.tagName === "PRE") {
									nodesToScore[nodesToScore.length] = node;
							}

							/* Turn all divs that don't have children block level elements into p's */
							if (node.tagName === "DIV") {
									if (node.innerHTML.search(readability.regexps.divToPElementsRe) === -1) {
											dbg("Altering div to p");
											var newNode = document.createElement('p');
											try {
													newNode.innerHTML = node.innerHTML;             
													node.parentNode.replaceChild(newNode, node);
													nodeIndex--;

													nodesToScore[nodesToScore.length] = node;
											}
											catch(e) {
													dbg("Could not alter div to p, probably an IE restriction, reverting back to div.: " + e);
											}
									}
									else
									{
											/* EXPERIMENTAL */
											for(var i = 0, il = node.childNodes.length; i < il; i++) {
													var childNode = node.childNodes[i];
													if(childNode.nodeType == 3) { // Node.TEXT_NODE
															dbg("replacing text node with a p tag with the same content.");
															var p = document.createElement('p');
															p.innerHTML = childNode.nodeValue;
															p.style.display = 'inline';
															p.className = 'readability-styled';
															childNode.parentNode.replaceChild(p, childNode);
													}
											}
									}
							} 
					}

					/**
					 * Loop through all paragraphs, and assign a score to them based on how content-y they look.
					 * Then add their score to their parent node.
					 *
					 * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
					**/
					var candidates = [];
					for (var pt=0; pt < nodesToScore.length; pt++) {
							var parentNode      = nodesToScore[pt].parentNode;
							var grandParentNode = parentNode ? parentNode.parentNode : null;
							var innerText       = readability.getInnerText(nodesToScore[pt]);

							if(!parentNode) {
									continue;
							}

							/* If this paragraph is less than 25 characters, don't even count it. */
							if(innerText.length < 25) {
									continue; }

							/* Initialize readability data for the parent. */
							if(typeof parentNode.readability == 'undefined')
							{
									readability.initializeNode(parentNode);
									candidates.push(parentNode);
							}

							/* Initialize readability data for the grandparent. */
							if(grandParentNode && typeof grandParentNode.readability == 'undefined')
							{
									readability.initializeNode(grandParentNode);
									candidates.push(grandParentNode);
							}

							var contentScore = 0;

							/* Add a point for the paragraph itself as a base. */
							contentScore++;

							/* Add points for any commas within this paragraph */
							contentScore += innerText.split(',').length;
							
							/* For every 100 characters in this paragraph, add another point. Up to 3 points. */
							contentScore += Math.min(Math.floor(innerText.length / 100), 3);
							
							/* Add the score to the parent. The grandparent gets half. */
							parentNode.readability.contentScore += contentScore;

							if(grandParentNode) {
									grandParentNode.readability.contentScore += contentScore/2;             
							}
					}

					/**
					 * After we've calculated scores, loop through all of the possible candidate nodes we found
					 * and find the one with the highest score.
					**/
					var topCandidate = null;
					for(var c=0, cl=candidates.length; c < cl; c++)
					{
							/**
							 * Scale the final candidates score based on link density. Good content should have a
							 * relatively small link density (5% or less) and be mostly unaffected by this operation.
							**/
							candidates[c].readability.contentScore = candidates[c].readability.contentScore * (1-readability.getLinkDensity(candidates[c]));

							dbg('Candidate: ' + candidates[c] + " (" + candidates[c].className + ":" + candidates[c].id + ") with score " + candidates[c].readability.contentScore);

							if(!topCandidate || candidates[c].readability.contentScore > topCandidate.readability.contentScore) {
									topCandidate = candidates[c]; }
					}

					/**
					 * If we still have no top candidate, just use the body as a last resort.
					 * We also have to copy the body node so it is something we can modify.
					 **/
					if (topCandidate === null || topCandidate.tagName == "BODY")
					{
							topCandidate = document.createElement("DIV");
							topCandidate.innerHTML = document.body.innerHTML;
							document.body.innerHTML = "";
							document.body.appendChild(topCandidate);
							readability.initializeNode(topCandidate);
					}


					/**
					 * Now that we have the top candidate, look through its siblings for content that might also be related.
					 * Things like preambles, content split by ads that we removed, etc.
					**/
					var articleContent        = document.createElement("DIV");
							articleContent.id     = "readability-content";
					var siblingScoreThreshold = Math.max(10, topCandidate.readability.contentScore * 0.2);
					var siblingNodes          = topCandidate.parentNode.childNodes;
					for(var s=0, sl=siblingNodes.length; s < sl; s++)
					{
							var siblingNode = siblingNodes[s];
							var append      = false;

							dbg("Looking at sibling node: " + siblingNode + " (" + siblingNode.className + ":" + siblingNode.id + ")" + ((typeof siblingNode.readability != 'undefined') ? (" with score " + siblingNode.readability.contentScore) : ''));
							dbg("Sibling has score " + (siblingNode.readability ? siblingNode.readability.contentScore : 'Unknown'));

							if(siblingNode === topCandidate)
							{
									append = true;
							}

							var contentBonus = 0;
							/* Give a bonus if sibling nodes and top candidates have the example same classname */
							if(siblingNode.className == topCandidate.className && topCandidate.className != "") {
									contentBonus += topCandidate.readability.contentScore * 0.2;
							}

							if(typeof siblingNode.readability != 'undefined' && (siblingNode.readability.contentScore+contentBonus) >= siblingScoreThreshold)
							{
									append = true;
							}
							
							if(siblingNode.nodeName == "P") {
									var linkDensity = readability.getLinkDensity(siblingNode);
									var nodeContent = readability.getInnerText(siblingNode);
									var nodeLength  = nodeContent.length;
									
									if(nodeLength > 80 && linkDensity < 0.25)
									{
											append = true;
									}
									else if(nodeLength < 80 && linkDensity === 0 && nodeContent.search(/\.( |$)/) !== -1)
									{
											append = true;
									}
							}

							if(append)
							{
									dbg("Appending node: " + siblingNode);

									var nodeToAppend = null;
									if(siblingNode.nodeName != "DIV" && siblingNode.nodeName != "P") {
											/* We have a node that isn't a common block level element, like a form or td tag. Turn it into a div so it doesn't get filtered out later by accident. */
											
											dbg("Altering siblingNode of " + siblingNode.nodeName + ' to div.');
											nodeToAppend = document.createElement('div');
											try {
													nodeToAppend.id = siblingNode.id;
													nodeToAppend.innerHTML = siblingNode.innerHTML;
											}
											catch(e)
											{
													dbg("Could not alter siblingNode to div, probably an IE restriction, reverting back to original.");
													nodeToAppend = siblingNode;
													s--;
													sl--;
											}
									} else {
											nodeToAppend = siblingNode;
											s--;
											sl--;
									}
									
									/* To ensure a node does not interfere with readability styles, remove its classnames */
									nodeToAppend.className = "";

									/* Append sibling and subtract from our list because it removes the node when you append to another node */
									articleContent.appendChild(nodeToAppend);
							}
					}

					/**
					 * So we have all of the content that we need. Now we clean it up for presentation.
					**/
					readability.prepArticle(articleContent);
					
					return articleContent;
			},
			
			/**
			 * Get the inner text of a node - cross browser compatibly.
			 * This also strips out any excess whitespace to be found.
			 *
			 * @param Element
			 * @return string
			**/
			getInnerText: function (e, normalizeSpaces) {
					var textContent    = "";

					normalizeSpaces = (typeof normalizeSpaces == 'undefined') ? true : normalizeSpaces;

					if (navigator.appName == "Microsoft Internet Explorer") {
							textContent = e.innerText.replace( readability.regexps.trimRe, "" ); }
					else {
							textContent = e.textContent.replace( readability.regexps.trimRe, "" ); }

					if(normalizeSpaces) {
							return textContent.replace( readability.regexps.normalizeRe, " "); }
					else {
							return textContent; }
			},

			/**
			 * Get the number of times a string s appears in the node e.
			 *
			 * @param Element
			 * @param string - what to split on. Default is ","
			 * @return number (integer)
			**/
			getCharCount: function (e,s) {
					s = s || ",";
					return readability.getInnerText(e).split(s).length-1;
			},

			/**
			 * Remove the style attribute on every e and under.
			 * TODO: Test if getElementsByTagName(*) is faster.
			 *
			 * @param Element
			 * @return void
			**/
			cleanStyles: function (e) {
					e = e || document;
					var cur = e.firstChild;

					if(!e) {
							return; }

					// Remove any root styles, if we're able.
					if(typeof e.removeAttribute == 'function' && e.className != 'readability-styled') {
							e.removeAttribute('style'); }

					// Go until there are no more child nodes
					while ( cur !== null ) {
							if ( cur.nodeType == 1 ) {
									// Remove style attribute(s) :
									if(cur.className != "readability-styled") {
											cur.removeAttribute("style");                   
									}
									readability.cleanStyles( cur );
							}
							cur = cur.nextSibling;
					}           
			},
			
			/**
			 * Get the density of links as a percentage of the content
			 * This is the amount of text that is inside a link divided by the total text in the node.
			 * 
			 * @param Element
			 * @return number (float)
			**/
			getLinkDensity: function (e) {
					var links      = e.getElementsByTagName("a");
					var textLength = readability.getInnerText(e).length;
					var linkLength = 0;
					for(var i=0, il=links.length; i<il;i++)
					{
							linkLength += readability.getInnerText(links[i]).length;
					}       

					return linkLength / textLength;
			},
			
			/**
			 * Get an elements class/id weight. Uses regular expressions to tell if this 
			 * element looks good or bad.
			 *
			 * @param Element
			 * @return number (Integer)
			**/
			getClassWeight: function (e) {
					if(!readability.flagIsActive(readability.FLAG_WEIGHT_CLASSES)) {
							return 0;
					}

					var weight = 0;

					/* Look for a special classname */
					if (e.className != "")
					{
							if(e.className.search(readability.regexps.negativeRe) !== -1) {
									weight -= 25; }

							if(e.className.search(readability.regexps.positiveRe) !== -1) {
									weight += 25; }
					}

					/* Look for a special ID */
					if (typeof(e.id) == 'string' && e.id != "")
					{
							if(e.id.search(readability.regexps.negativeRe) !== -1) {
									weight -= 25; }

							if(e.id.search(readability.regexps.positiveRe) !== -1) {
									weight += 25; }
					}

					return weight;
			},

		nodeIsVisible: function (node) {
			return (node.offsetWidth !== 0 || node.offsetHeight !== 0) && node.style.display.toLowerCase() !== 'none';
		},

			/**
			 * Remove extraneous break tags from a node.
			 *
			 * @param Element
			 * @return void
			 **/
			killBreaks: function (e) {
					try {
							e.innerHTML = e.innerHTML.replace(readability.regexps.killBreaksRe,'<br />');       
					}
					catch (eBreaks) {
							dbg("KillBreaks failed - this is an IE bug. Ignoring.: " + eBreaks);
					}
			},

			/**
			 * Clean a node of all elements of type "tag".
			 * (Unless it's a youtube/vimeo video. People love movies.)
			 *
			 * @param Element
			 * @param string tag to clean
			 * @return void
			 **/
			clean: function (e, tag) {
					var targetList = e.getElementsByTagName( tag );
					var isEmbed    = (tag == 'object' || tag == 'embed');
					
					for (var y=targetList.length-1; y >= 0; y--) {
							/* Allow youtube and vimeo videos through as people usually want to see those. */
							if(isEmbed) {
									var attributeValues = "";
									for (var i=0, il=targetList[y].attributes.length; i < il; i++) {
											attributeValues += targetList[y].attributes[i].value + '|';
									}
									
									/* First, check the elements attributes to see if any of them contain youtube or vimeo */
									if (attributeValues.search(readability.regexps.videoRe) !== -1) {
											continue;
									}

									/* Then check the elements inside this element for the same. */
									if (targetList[y].innerHTML.search(readability.regexps.videoRe) !== -1) {
											continue;
									}
									
							}

							targetList[y].parentNode.removeChild(targetList[y]);
					}
			},
			
			/**
			 * Clean an element of all tags of type "tag" if they look fishy.
			 * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
			 *
			 * @return void
			 **/
			cleanConditionally: function (e, tag) {

			if(!readability.flagIsActive(readability.FLAG_CLEAN_CONDITIONALLY)) {
				return;
			}

					var tagsList      = e.getElementsByTagName(tag);
					var curTagsLength = tagsList.length;

					/**
					 * Gather counts for other typical elements embedded within.
					 * Traverse backwards so we can remove nodes at the same time without effecting the traversal.
					 *
					 * TODO: Consider taking into account original contentScore here.
					**/
					for (var i=curTagsLength-1; i >= 0; i--) {
							var weight = readability.getClassWeight(tagsList[i]);
							var contentScore = (typeof tagsList[i].readability != 'undefined') ? tagsList[i].readability.contentScore : 0;
							
							dbg("Cleaning Conditionally " + tagsList[i] + " (" + tagsList[i].className + ":" + tagsList[i].id + ")" + ((typeof tagsList[i].readability != 'undefined') ? (" with score " + tagsList[i].readability.contentScore) : ''));

							if(weight+contentScore < 0)
							{
									tagsList[i].parentNode.removeChild(tagsList[i]);
							}
							else if ( readability.getCharCount(tagsList[i],',') < 10) {
									/**
									 * If there are not very many commas, and the number of
									 * non-paragraph elements is more than paragraphs or other ominous signs, remove the element.
									**/
									var p      = tagsList[i].getElementsByTagName("p").length;
									var img    = tagsList[i].getElementsByTagName("img").length;
									var li     = tagsList[i].getElementsByTagName("li").length-100;
									var input  = tagsList[i].getElementsByTagName("input").length;

									var embedCount = 0;
									var embeds     = tagsList[i].getElementsByTagName("embed");
									for(var ei=0,il=embeds.length; ei < il; ei++) {
											if (embeds[ei].src.search(readability.regexps.videoRe) == -1) {
												embedCount++; 
											}
									}

									var linkDensity   = readability.getLinkDensity(tagsList[i]);
									var contentLength = readability.getInnerText(tagsList[i]).length;
									var toRemove      = false;

									if ( img > p ) {
											toRemove = true;
									} else if(li > p && tag != "ul" && tag != "ol") {
											toRemove = true;
									} else if( input > Math.floor(p/3) ) {
											toRemove = true; 
									} else if(contentLength < 25 && (img === 0 || img > 2) ) {
											toRemove = true;
									} else if(weight < 25 && linkDensity > 0.2) {
											toRemove = true;
									} else if(weight >= 25 && linkDensity > 0.5) {
											toRemove = true;
									} else if((embedCount == 1 && contentLength < 75) || embedCount > 1) {
											toRemove = true;
									}

									if(toRemove) {
											tagsList[i].parentNode.removeChild(tagsList[i]);
									}
							}
					}
			},

			/**
			 * Clean out spurious headers from an Element. Checks things like classnames and link density.
			 *
			 * @param Element
			 * @return void
			**/
			cleanHeaders: function (e) {
					for (var headerIndex = 1; headerIndex < 3; headerIndex++) {
							var headers = e.getElementsByTagName('h' + headerIndex);
							for (var i=headers.length-1; i >=0; i--) {
									if (readability.getClassWeight(headers[i]) < 0 || readability.getLinkDensity(headers[i]) > 0.33) {
											headers[i].parentNode.removeChild(headers[i]);
									}
							}
					}
			},
			
			/**
			 * Show the email popup.
			 *
			 * @return void
			 **/
			emailBox: function () {
					var emailContainerExists = document.getElementById('email-container');
					if(null !== emailContainerExists)
					{
							return;
					}

					var emailContainer = document.createElement('div');
					emailContainer.setAttribute('id', 'email-container');
					emailContainer.innerHTML = '<iframe src="'+readability.emailSrc + '?pageUrl='+escape(window.location)+'&pageTitle='+escape(document.title)+'" scrolling="no" onload="readability.removeFrame()" style="width:500px; height: 490px; border: 0;"></iframe>';

					document.body.appendChild(emailContainer);          
			},
			
			/**
			 * Close the email popup. This is a hacktackular way to check if we're in a "close loop".
			 * Since we don't have crossdomain access to the frame, we can only know when it has
			 * loaded again. If it's loaded over 3 times, we know to close the frame.
			 *
			 * @return void
			 **/
			removeFrame: function () {
					readability.iframeLoads++;
					if (readability.iframeLoads > 3)
					{
							var emailContainer = document.getElementById('email-container');
							if (null !== emailContainer) {
									emailContainer.parentNode.removeChild(emailContainer);
							}

							readability.iframeLoads = 0;
					}           
			},
			
			htmlspecialchars: function (s) {
					if (typeof(s) == "string") {
							s = s.replace(/&/g, "&amp;");
							s = s.replace(/"/g, "&quot;");
							s = s.replace(/'/g, "&#039;");
							s = s.replace(/</g, "&lt;");
							s = s.replace(/>/g, "&gt;");
					}
			
					return s;
			},

			flagIsActive: function(flag) {
					return (readability.flags & flag) > 0;
			},
			
			addFlag: function(flag) {
					readability.flags = readability.flags | flag;
			},
			
			removeFlag: function(flag) {
					readability.flags = readability.flags & ~flag;
			}
			
	};

	window.X_readability=function(){
		readability.init();
		_readability_css=document.createElement('style');
		_readability_css.type='text/css';
		_readability_css.textContent='\
			#readability-logo,#arc90-logo,.footer-twitterLink,#readTools a,a.rdbTK-powered span{background-color:transparent!important;background-image:url("data:image/png;base64,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")!important;background-repeat:no-repeat!important;}\
			#readOverlay {display:block;position:absolute;top:0;left:0;width:100%;}\
			#readInner {line-height:1.4em;max-width:800px;margin:1em auto;}\
			#readInner a {color:#039;text-decoration:none;}\
			#readInner a:hover {text-decoration:underline;}\
			#readInner img {float:left;clear:both;margin: 0 12px 12px 0;}\
			#readInner h1 {display:block;width:100%;border-bottom:1px solid #333;font-size:1.2em;padding-bottom:.5em;margin-bottom:.75em;}\
			.style-apertura #readInner h1 {border-bottom-color:#ededed;}\
			#readInner blockquote {margin-left:3em;margin-right:3em;}\
			#readability-inner * {margin-bottom:16px;border:none;background:none;}\
			/* Footer */\
			#readFooter {display:block;border-top:1px solid #333;text-align:center;clear:both;overflow:hidden;}\
			.style-apertura #readFooter {border-top-color:#ededed;}\
			#rdb-footer-left {display:inline;float:left;margin-top:15px;width:285px;background-position:0 -36px;}\
			.rdbTypekit #rdb-footer-left {width:475px;}\
			#rdb-footer-left a,#rdb-footer-left a:link {float:left;}\
			#readability-logo {display:inline;background-position:0 -36px;height:29px;width:189px;text-indent:-9000px;}\
			#arc90-logo {display:inline;background-position:right -36px;height:29px;width:96px;text-indent:-9000px;}\
			#readability-url {display:none;}\
			.style-apertura #readability-logo {background-position:0 -67px;}\
			.style-apertura #arc90-logo {background-position:right -67px;}\
			#rdb-footer-right {display:inline;float:right;text-align:right;font-size:.75em;margin-top:18px;}\
			#rdb-footer-right a {display:inline-block;float:left;overflow:visible;line-height:16px;vertical-align:baseline;}\
			.footer-twitterLink {height:20px;margin-left:20px;padding:4px 0 0 28px;background-position:0 -123px;font-size:12px;}\
			#rdb-footer-left .footer-twitterLink {display:none;margin-top:1px;padding-top:2px;}\
			.rdbTypekit #rdb-footer-right .footer-twitterLink {display:none;}\
			.rdbTypekit #rdb-footer-left .footer-twitterLink {display:inline-block!important;}\
			a.rdbTK-powered,a.rdbTK-powered:link,a.rdbTK-powered:hover {font-size:16px;color:#858789!important;text-decoration:none!important;}\
			a.rdbTK-powered span {display:inline-block;height:22px;margin-left:2px;padding:4px 0 0 26px;background-position:0 -146px!important;}\
			.style-apertura #rdb-inverse,.style-athelas #rdb-athelas {display:block;}\
			span.version {display:none;}\
			/* Tools */\
			#readTools {width:34px;height:150px;position:fixed;z-index:100;top:10px;left:10px;}\
			#readTools a {overflow:hidden;margin-bottom:8px;display:block;opacity:.4;text-indent:-99999px;height:34px;width:34px;text-decoration:none;filter:alpha(opacity=40);}\
			#reload-page {background-position:0 0;}\
			#print-page {background-position:-36px 0;}\
			#email-page {background-position:-72px 0;}\
			#kindle-page {background-position:-108px 0;}\
			#readTools a:hover {opacity:1;filter:alpha(opacity=100);}\
			/* -- USER-CONFIGURABLE STYLING -- */\
			/* Size */\
			.size-x-small {font-size:12px;}\
			.size-small {font-size:15px;}\
			.size-medium {font-size:18px;}\
			.size-large {font-size:22px;}\
			.size-x-large {font-size:28px;}\
			/* Style */\
			.style-newspaper {font-family:"Times New Roman", Times, serif;background:#fbfbfb;color:#080000;}\
			.style-newspaper h1 {text-transform:capitalize;font-family:Georgia, "Times New Roman", Times, serif;}\
			.style-newspaper #readInner a {color:#0924e1;}\
			.style-novel {font-family:"Palatino Linotype", "Book Antiqua", Palatino, serif;background:#f4eed9;color:#1d1916;}\
			.style-novel #readInner a {color:#1856ba;}\
			.style-ebook {font-family:Arial, Helvetica, sans-serif;background:#cce8cf/*#edebe8*/;color:#2c2d32;}\
			.style-ebook #readInner a {color:#187dc9;}\
			.style-ebook h1 {font-family:"Arial Black", Gadget, sans-serif;font-weight:400;}\
			.style-terminal {font-family:"Lucida Console", Monaco, monospace;background:#1d4e2c;color:#c6ffc6;}\
			.style-terminal #readInner a {color:#093;}\
			/* Typekit */\
			.style-apertura {font-family:"apertura-1", "apertura-2", sans-serif;background-color:#2d2828;color:#eae8e9;}\
			.style-apertura #readInner a {color:#58b0ff;}\
			.style-athelas {font-family:"athelas-1", "athelas-2", "Palatino Linotype", "Book Antiqua", Palatino, serif;background-color:#f7f7f7;color:#2b373d;}\
			.style-athelas #readInner a {color:#1e83cb;}\
			/* Margin */\
			.margin-x-narrow {width:95%;}\
			.margin-narrow {width:85%;}\
			.margin-medium {width:75%;}\
			.margin-wide {width:55%;}\
			.margin-x-wide {width:35%;}\
			/* -- USER-CONFIGURABLE STYLING -- */\
			/* -- DEBUG -- */\
			.bug-green {background:#bbf9b0;border:4px solid green;}\
			.bug-red {background:red;}\
			.bug-yellow {background:#ffff8e;}\
			.bug-blue {background:#bfdfff;}\
			/* -- EMAIL / KINDLE POP UP -- */\
			#kindle-container, #email-container {position:fixed;top:60px;left:50%;width:500px;height:490px;border:solid 3px #666;background-color:#fff;z-index:100!important;overflow:hidden;margin:0 0 0 -240px;padding:0;}\
			/* Override html styling attributes */\
			table, tr, td { background-color: transparent !important; }';
		_readability_css.media='all';
		_readHead=document.getElementsByTagName('head')[0];
		_readHead.appendChild(_readability_css);
		_readability_print_css=document.createElement('style');
		_readability_print_css.textContent='\
				body, #readOverlay {\
				background-color: white !important;\
			}\
			embed, object {\
				display: none !important;\
			}\
			#readInner {\
				width: 100% !important;\
			/*	font-size: 12pt; */\
			}\
			#readTools {\
				display: none !important;\
			}\
			#readFooter {\
				font-size: 10pt;\
			}\
			#readability-url {\
				display: inline !important;\
			}\
			#readability-footer-logo {\
				color: #333 !important;\
				font-family: "Adobe Caslon Pro", "Hoefler Text", Georgia, Garamond, serif;\
				width: auto;\
				margin-top: 15px;\
				text-align: left;\
				text-indent: 0 !important;\
			}\
			#readability-footer-logo a {\
				display: inline !important;\
				float: none !important;\
				width: auto !important;\
				text-indent: 0 !important;\
				border-bottom-width: 0 !important;\
			}\
			span.version {\
				display: none;\
			}\
			a {\
				color: #333 !important;\
				border-bottom: 1px solid #CCC !important;\
			}\
			div.footer-right {\
				display: none;\
			}';
		_readability_print_css.media='print';
		_readability_print_css.type='text/css';
		_readHead.appendChild(_readability_print_css);
	};


	//自动加载
	document.addEventListener('DOMContentLoaded',function(){
		//处理正则的函数..
		function toRegExp(obj){
			if(obj instanceof RegExp){
				return obj;
			}else{
				return (obj instanceof Array)? new RegExp(obj[0],obj[1]) : new RegExp(obj);
			};
		};
		var i,
					ii,
					AUTOSI_x;
		for(i=0,ii=AUTOSI.length;i<ii;i++){
			AUTOSI_x=AUTOSI[i];
			if(AUTOSI_x[1] && toRegExp(AUTOSI_x[2]).test(location.href)){
				X_readability();
				break;
			};
		};
	},false);

})();

//readability.init();