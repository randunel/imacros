/**
 * Copyright (c)2005-2009 Matt Kruse (javascripttoolbox.com)
 * 
 * Dual licensed under the MIT and GPL licenses. 
 * This basically means you can use this code however you want for
 * free, but don't claim to have written it yourself!
 * Donations always accepted: http://www.JavascriptToolbox.com/donate/
 * 
 * Please do not link to the .js files on javascripttoolbox.com from
 * your site. Copy the files locally to your server instead.
 * 
 */
/*
This code is inspired by and extended from Stuart Langridge's aqlist code:
		http://www.kryogenix.org/code/browser/aqlists/
		Stuart Langridge, November 2002
		sil@kryogenix.org
		Inspired by Aaron's labels.js (http://youngpup.net/demos/labels/) 
		and Dave Lindquist's menuDropDown.js (http://www.gazingus.org/dhtml/?id=109)
*/
/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/


// Full expands a tree with a given ID
function expandTree(treeId) {
    var ul = document.getElementById(treeId);
    if (ul == null) { return false; }
    expandCollapseList(ul,nodeOpenClass);
}

// Fully collapses a tree with a given ID
function collapseTree(treeId) {
    var ul = document.getElementById(treeId);
    if (ul == null) { return false; }
    expandCollapseList(ul,nodeClosedClass);
}

// Expands enough nodes to expose an LI with a given ID
function expandToItem(treeId,itemId) {
    var ul = document.getElementById(treeId);
    if (ul == null) { return false; }
    var ret = expandCollapseList(ul,nodeOpenClass,itemId);
    if (ret) {
	var o = document.getElementById(itemId);
	if (o.scrollIntoView) {
	    o.scrollIntoView(false);
	}
    }
}

// Performs 3 functions:
// a) Expand all nodes
// b) Collapse all nodes
// c) Expand all nodes to reach a certain ID
function expandCollapseList(ul,cName,itemId) {
    if (!ul.childNodes || ul.childNodes.length==0) { return false; }
    // Iterate LIs
    for (var itemi=0;itemi<ul.childNodes.length;itemi++) {
	var item = ul.childNodes[itemi];
	if (itemId!=null && item.id==itemId) { return true; }
	if (item.nodeName == "LI") {
	    // Iterate things in this LI
	    var subLists = false;
	    for (var sitemi=0;sitemi<item.childNodes.length;sitemi++) {
		var sitem = item.childNodes[sitemi];
		if (sitem.nodeName=="UL") {
		    subLists = true;
		    var ret = expandCollapseList(sitem,cName,itemId);
		    if (itemId!=null && ret) {
			item.className=cName;
			return true;
		    }
		}
	    }
	    if (subLists && itemId==null) {
		item.className = cName;
	    }
	}
    }
}
