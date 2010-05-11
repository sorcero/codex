/* -*- Mode: Javascript; -*- */

var sbooks_pagination_id=
  "$Id$";
var sbooks_pagination_version=parseInt("$Revision$".slice(10,-1));

/* Copyright (C) 2009 beingmeta, inc.
   This file implements a Javascript/DHTML UI for reading
    large structured documents (sBooks).

   For more information on sbooks, visit www.sbooks.net
   For more information on knowlets, visit www.knowlets.net
   For more information about beingmeta, visit www.beingmeta.com

   This library uses the FDJT (www.fdjt.org) toolkit.

   This program comes with absolutely NO WARRANTY, including implied
   warranties of merchantability or fitness for any particular
   purpose.

    Use and redistribution (especially embedding in other
      CC licensed content) is permitted under the terms of the
      Creative Commons "Attribution-NonCommercial" license:

          http://creativecommons.org/licenses/by-nc/3.0/ 

    Other uses may be allowed based on prior agreement with
      beingmeta, inc.  Inquiries can be addressed to:

       licensing@beingmeta.com

   Enjoy!

*/

var sbook_curpage=-1;
var sbook_curoff=0;
var sbook_curinfo=-1;
var sbook_curbottom=sbook_bottom_px;
var sbook_pagesize=-1;
var sbook_pages=[];
var sbook_pageinfo=[];
var sbook_pagemaxoff=-1;
var sbook_pagescroll=false;
var sbook_fudge_bottom=false;

var sbook_paginated=false;

var sbook_top_px=40;
var sbook_bottom_px=40;
var sbook_left_px=40;
var sbook_right_px=40;
var sbook_widow_limit=3;
var sbook_orphan_limit=3;

var sbook_debug_pagination=false;
var sbook_trace_pagination=0;

var sbookPageHead=false;
var sbookPageFoot=false;

/* Pagination predicates */

function sbookIsPageHead(elt)
{
  return ((sbook_tocmajor)&&(elt.id)&&
	  ((sbook_info[elt.id]).toclevel)&&
	  (((sbook_info[elt.id]).toclevel)<=sbook_tocmajor))||
    (fdjtDOM.getStyle(elt).pageBreakBefore==='always');
}

function sbookIsPageFoot(elt)
{ 
  return (fdjtDOM.getStyle(elt).pageBreakAfter==='always');
}

function sbookIsPageBlock(elt)
{
  return ((elt)&&(fdjtDOM.getStyle(elt).pageBreakInside==='avoid'));
}

function sbookAvoidPageHead(elt)
{
  return ((elt)&&(fdjtDOM.getStyle(elt).pageBreakBefore==='avoid'));
}

function sbookAvoidPageFoot(elt)
{
  return ((elt.id)&&(sbook_info[elt.id])&&((sbook_info[elt.id]).toclevel))||
    (fdjtDOM.getStyle(elt).pageBreakAfter==='avoid');
}

/* Pagination loop */

function sbookPaginate(pagesize,start)
{
  if (!(start)) start=_sbookScanContent(sbook_root||document.body);
  var result={}; var pages=[]; var pageinfo=[];
  result.pages=pages; result.info=pageinfo;
  var scan=start; var info=sbookNodeInfo(scan);
  var pagetop=info.top; var pagelim=pagetop+pagesize;
  var fudge=sbook_bottom_px/4;
  var start=fdjtET();
  var curpage={}; var newtop=false; var nodecount=1;
  curpage.pagenum=pages.length;
  curpage.top=pagetop; curpage.limit=pagelim;
  curpage.first=start; curpage.last=start;
  pages.push(pagetop); pageinfo.push(curpage);
  while (scan) {
    var oversize=false;
    var next=_sbookScanContent(scan);
    var nextinfo=(next)&&sbookNodeInfo(next);
    var splitblock=false; var forcebottom=false;
    var widowthresh=((info.fontsize)*sbook_widow_limit);
    var orphanthresh=((info.fontsize)*sbook_orphan_limit);
    // If the top of the current node is above the page,
    //  make scantop be the page top
    var scantop=((info.top<pagetop)?(pagetop):(info.top));
    var dbginfo=((sbook_debug_pagination)&&
		 ("P#"+curpage.pagenum+
		  "["+pagetop+","+pagelim+
		  "/"+pagesize+"/"+widowthresh+","+orphanthresh+"] "));
    // We track a 'focus' for every page, which is the first sbook
    // focusable element on the page.
    if (!(curpage.focus))
      if ((scan.toclevel)||
	  ((sbook_focus_rules)&&(sbook_focus_rules.match(scan))))
	curpage.focus=scan;
    if (dbginfo) dbginfo=dbginfo+(_sbookPageNodeInfo(scan,info,curpage));
    if ((dbginfo)&&(next))
      dbginfo=dbginfo+" ... N#"+next.id+
	_sbookPageNodeInfo(next,nextinfo,curpage);
    if (sbook_trace_pagination>1) _sbookTracePagination("SCAN",scan,info);
    if ((dbginfo)&&(scan.getAttribute("sbookpagedbg")))
      dbginfo=scan.getAttribute("sbookpagedbg")+" // "+dbginfo;
    if (sbookIsPageHead(scan)) {
      // Unless we're already at the top, just break
      if (scantop>pagetop) newtop=scan;
      else {}}
    // WE'RE COMPLETELY OFF THE PAGE
    else if (scantop>pagelim) {
      // Issue a warning (if neccessary) and break on this element
      if (sbookAvoidPageHead(scan)) 
	fdjtLog.warn("[%f] Pagination got stuck with non page head %o",
		     fdjtET(),scan);
      else if (sbookIsPageFoot(scan))
	fdjtLog.warn("[%f] Pagination got stuck with page foot at head %o",
		     fdjtET(),scan);
      else {}
      newtop=scan;}
    else if ((info.bottom>pagelim)&&(sbookIsPageBlock(scan)))
      if (info.top>pagetop)  // If we're not at the top, break now
	newtop=scan;
      else {
	// Otherwise, declare an oversized page
	curpage.bottom=info.bottom;
	curpage.oversize=oversize=true;}
    // WE'RE COMPLETELY ON THE PAGE
    // including the case where we have children which are on the page.
    else if ((info.bottom<pagelim)||((nextinfo)&&(nextinfo.top<pagelim))) {
      if (sbookAvoidPageHead(scan)) {} // don't think about breaking here
      // if we want to be a foot, force a break at the next node
      else if (sbookIsPageFoot(scan)) {
	curpage.bottom=info.bottom;
	newtop=_sbookScanContent(scan);}
      // if we're a bad foot close to the bottom, break
      else if (((scan.toclevel)||(sbookAvoidPageFoot(scan)))&&
	       ((pagelim-info.bottom)<widowthresh))
	newtop=scan;
      // Look ahead to see if we should page break anyway
      else if (next) {
	// Only record next in debug info if we look at it
	if (dbginfo)
	  dbginfo=dbginfo+" ... N#"+next.id+
	    _sbookPageNodeInfo(next,nextinfo,curpage);
	// If we're trying to avoid putting this item at the foot
	if ((scan.toclevel)||(sbookAvoidPageFoot(scan))) {
	  // Break here if the next item 
	  if ((nextinfo.top>=pagelim) // is off the page
	      ||(sbookIsPageHead(next)) // is a forced head
	      // is a straddling no-break block
	      ||((nextinfo.top<pagelim)&&(nextinfo.bottom>pagelim)&&
		 (sbookIsPageBlock(next)))
	      // is a bad foot close to the bottom
	      ||(((next.toclevel)||(sbookAvoidPageFoot(next)))&&
		 ((pagelim-nextinfo.bottom)<widowthresh*2))
	      // is likely to be pushed off the bottom
	      ||((pagelim-nextinfo.top)<widowthresh)
	      // is small and straddling
	      ||((nextinfo.bottom>=pagelim)&&
		 ((nextinfo.height)<(widowthresh+orphanthresh))))
	    newtop=scan;
	  else {}} ///// End of foot avoiding logic
	else if (sbookAvoidPageHead(next)) {
	  // If the next node is a bad head, break or split
	  if (nextinfo.bottom<pagelim) {} // if there isn't enough space for it
	  else { // Either break or split
	    var newbreak=info.bottom-orphanthresh;
	    if (newbreak<scantop) newtop=scan; // just break
	    else { // split
	      curpage.bottom=newbreak;
	      newtop=splitblock=scan;}}}
	// No problem, leave this block on the page
	else {}}
      // We're on the page and at the end
      else {}
      /* End of 'on the page' cases */}
    // If we've gotten here,
    // WE'RE STRADDLING THE BOTTOM OF THE PAGE
    else if (sbookIsPageBlock(scan))
      if (curpage.top<scantop)
	// Break if we're not at the top already
	newtop=scan;
      else {
	// If we're already at the top, this is a huge block
	// and we will make an oversize page
	curpage.bottom=info.bottom;
	curpage.oversize=oversize=true;
	curpage.last=scan;}
    else if ((scan.toclevel)||(sbookAvoidPageFoot(scan)))
      // If we're avoiding the foot, we start a new page
      newtop=scan;
    else if (sbookAvoidPageHead(scan))
      // If we're avoiding the head, we split this block.
      newtop=splitblock=scan;
    else if ((sbook_fudge_bottom)&&
	     (sbookIsPageFoot(scan))&&
	     (info.bottom<(pagelim+sbook_fudge_bottom)))
      // If we want to be a foot and we're close enough,
      // just fudge the bottom, pushing it down.  This may be 
      // a bad idea (adjust sbook_fudge_bottom accordingly)
      curpage.bottom=info.bottom;
    // If we're too small to split, just start a new page
    else if (info.height<(widowthresh+orphanthresh))
      newtop=scan;
    // If splitting would create a widow, just break
    else if ((pagelim-scantop)<widowthresh)
      newtop=scan;
    // If we might create orphans, adjust the page bottom
    // to ensure that doesn't happen
    else if ((info.bottom-pagelim)<orphanthresh)
      if ((sbook_fudge_bottom)&&
	  (info.bottom<(pagelim+sbook_fudge_bottom))) {
	// possibly move the bottom down
	curpage.bottom=pagelim=info.bottom;}
      else {
	// Or making this page shorter to keep orphans from being
	// too isolated on the next page
	// move the pagelim up to make sure the orphans aren't isolated
	curpage.bottom=pagelim=info.bottom-orphanthresh;
	newtop=splitblock=scan;}
    //  If the next node is inside the current one, just break
    else if (fdjtDOM.hasParent(next,scan))
      newtop=scan;
    else {
      // Just break at (around) the pagelim
      newtop=splitblock=scan;
      curpage.bottom=pagelim;}
    // Okay, we've figured out what to do with this element
    if (!(newtop)) {
      // When we're not starting a new page, just extend the bottom
      //  of this one
      curpage.bottom=info.bottom;
      curpage.last=scan;}
    else {
      // If we starting a new page, clean up the page break
      var newinfo=((newtop==scan)?(info):sbookNodeInfo(newtop));
      var prevpage=curpage;
      if (dbginfo)
	dbginfo=dbginfo+" np"+((splitblock)?"/split":"")+"/"+curpage.bottom;
      // Adjust the page bottom information
      if (splitblock) {
	curpage.bottom=pagelim;
	curpage.last=splitblock;
	var newbottom=
	  sbookAdjustPageBreak(splitblock,curpage.top,curpage.bottom);
	if ((newbottom>pagetop)&&(newbottom>info.top)&&
	    (newbottom>(pagetop+(pagesize/2)))) {
	  // Check that we were able to find a good page break
	  curpage.bottom=newbottom;
	  curpage.bottomedge=splitblock;
	  if (dbginfo) dbginfo=dbginfo+"~"+curpage.bottom;
	  // If we're splitting, force the next node to be the split block
	  next=splitblock; nextinfo=info;}
	else {
	  // We weren't able to find a good page break,
	  // so we break entirely (no split), and declare this
	  // page oversize
	  curpage.bottom=info.bottom; curpage.oversize=oversize=true;
	  if (dbginfo) dbginfo=dbginfo+"~oversize/"+curpage.bottom;}}
      // If it's a clean break, make sure that the page bottom is good
      else if (!(curpage.bottom)) curpage.bottom=newinfo.top;
      else if (newinfo.top<curpage.bottom) curpage.bottom=newinfo.top;
      else {}
      if (sbook_trace_pagination) 
	fdjtLog("[%f] New %spage break P%d[%d,%d]#%s %o, closed P%d[%d,%d] %o",
		fdjtET(),((splitblock)?("split "):("")),
		pages.length,newinfo.top,newinfo.bottom,newtop.id,newtop,
		curpage.pagenum,curpage.top,curpage.bottom,curpage);
      // Make a new page
      curpage={}; curpage.pagenum=pages.length;
      if (splitblock) curpage.top=prevpage.bottom;
      else curpage.top=newinfo.top;
      // If the item at the top of the new page is larger than a page,
      // declare the page oversize
      // (Left out for now)
      // Initialize the first and last elements on the page
      curpage.first=newtop; curpage.last=newtop;
      // Indicate the straddling top element, if we're split
      if (splitblock) curpage.topedge=splitblock;
      // Initialize the scan variables of the page top and bottom
      pagetop=curpage.top;
      pagelim=curpage.limit=pagetop+pagesize;
      scan=newtop; splitblock=false; newtop=false;
      // Update the tables
      pages.push(pagetop); pageinfo.push(curpage);}
    if (dbginfo) scan.setAttribute("sbookpagedbg",dbginfo);
    // Advance around the loop.  If we have an explicit next page,
    //  we use it (usually the case if we're splitting a block).
    if (oversize) {
      scan=_sbookScanContent(scan,true);
      if (scan) info=sbookNodeInfo(scan);}
    else if (next) {scan=next; info=nextinfo;}
    else {
      // Otherwise, advance through the DOM
      scan=_sbookScanContent(scan);
      if (scan) info=sbookNodeInfo(scan);}
    if (!(splitblock)) nodecount++;}
  var done=fdjtET();
  fdjtLog("[%f] Paginated %d nodes into %d pages with pagesize=%d in %s",
	  fdjtET(),nodecount,pages.length,pagesize,
	  fdjtTime.secs2short(done-start));
  return result;
}

function sbookNodeInfo(node)
{
  var info=fdjtDOM.getGeometry(node);
  var fontsize=fdjtDOM.getStyle(node).fontSize;
  if ((fontsize)&&(typeof fontsize === 'string'))
    fontsize=parseInt(fontsize.slice(0,fontsize.length-2));
  info.fontsize=(fontsize||12);
  return info;
}

var sbook_content_nodes=['IMG','BR','HR'];

function _sbookScanContent(scan,skipchildren)
{
  var info=fdjtDOM.getGeometry(scan);
  var next=((skipchildren)?
	    (fdjtDOM.next(scan,_sbookIsContentBlock)):
	    (fdjtDOM.forward(scan,_sbookIsContentBlock)));
  var nextinfo=((next)&&(fdjtDOM.getGeometry(next)));
  if (!(next)) {}
  else if ((nextinfo.height===0)||(nextinfo.top<info.top)) 
    // Skip over weird nodes
    return _sbookScanContent(next,skipchildren);
  else if ((sbookIsPageHead(next))||(sbookIsPageBlock(next))) {}
  else if ((next.childNodes)&&(next.childNodes.length>0)) {
    var children=next.childNodes;
    if ((children[0].nodeType===1)&&(_sbookIsContentBlock(children[0])))
      next=children[0];
    else if ((children[0].nodeType===3)&&
	     (fdjtString.isEmpty(children[0].nodeValue))&&
	     (children.length>1)&&(children[1].nodeType===1)&&
	     (_sbookIsContentBlock(children[1])))
      next=children[1];}
  if ((next)&&(sbook_debug_pagination)) {
    if (next.id) scan.setAttribute("sbooknextnode",next.id);
    if (scan.id) next.setAttribute("sbookprevnode",scan.id);}
  return next;
}

var sbook_block_tags=
  {"IMG": true, "HR": true, "P": true, "DIV": true,"UL": true,"BLOCKQUOTE":true};

function _sbookIsContentBlock(node)
{
  var styleinfo;
  if (node.nodeType===1)
    if (node.sbookui) return false;
    else if (sbook_block_tags[node.tagName]) return true;
    else if (styleinfo=fdjtDOM.getStyle(node)) {
      if (styleinfo.position!=='static') return false;
      else if ((styleinfo.display==='block')||
	       (styleinfo.display==='list-item'))
	return true;
      else return false;}
    else if (fdjtDOM.getDisplay(node)==="inline") return false;
    else return true;
  else return false;
}

function _sbookIsJustContainer(node)
{
  var children=node.childNodes;
  var i=0; var len=children.length;
  while (i<len) {
    var child=children[i++];
    if ((child.nodeType===3)&&
	(!(fdjtString.isEmpty(child.nodeValue))))
      return false;
    else if (child.sbookui) {}
    else if (sbook_block_tags[node.tagName]) {}
    else if (styleinfo=fdjtDOM.getStyle(node)) {
      if (styleinfo.position!=='static') {}
      else if ((styleinfo.display==='block')||
	       (styleinfo.display==='list-item'))
	{}
      else return false;}
    else {}}
  return true;
}

function _sbookIsContainer(node)
{
  var next=_sbookScanContent(node);
  if (fdjtDOM.hasParent(next,node)) return next;
  else return false;
}


function _sbookTracePagination(name,elt,info)
{
  if (elt)
    fdjtLog("[%f] %s '%s' [%d,%d] %d%s%s%s%s%s %o",
	    fdjtET(),name,elt.id,info.top,info.bottom,
	    elt.toclevel||0,
	    ((sbookIsPageHead(elt))?"/ph":""),
	    ((sbookIsPageBlock(elt))?"/pb":""),
	    ((sbookAvoidPageHead(elt))?"/ah":""),
	    ((sbookAvoidPageFoot(elt))?"/af":""),
	    ((fdjtHasText(elt))?"/ht":""),
	    elt);
  else fdjtLog("[%f] %s none",fdjtET(),name);
}

function _sbookPaginationInfo(elt,info,newpage,splitblock)
{
  return ((splitblock)?"s":(newpage)?"h":"p")+(elt.toclevel||0)+
    ((sbookIsPageHead(elt))?"/ph":"")+
    ((sbookIsPageBlock(elt))?"/pb":"")+
    ((sbookAvoidPageHead(elt))?"/ah":"")+
    ((sbookAvoidPageFoot(elt))?"/af":"")+
    ((fdjtHasText(elt))?"/ht":"")+
    " ["+
    info.top+","+info.bottom+"-"+info.height+
    ((info.fontsize)?"/":"")+((info.fontsize)?(info.fontsize):"")+
    +"]"+
    ((newpage)?((newpage!==elt)?("ph="+newpage.id):""):"");
}

function _sbookPageNodeInfo(elt,info,curpage)
{
  return "["+info.top+","+info.bottom+"/"+info.height+"] "+
    (((info.top<=curpage.top)&&(info.bottom>=curpage.limit))?"around":
     ((info.top>curpage.top)&&(info.bottom<curpage.limit))?"inside":
     ((info.top<curpage.top)&&(info.bottom>=curpage.top))?"topedge":
     ((info.top<curpage.limit)&&(info.bottom>=curpage.limit))?"botedge":
     (info.top>=curpage.limit)?"below":
     (info.bottom<=curpage.top)?"above":
     "weird")+
    "/t"+(elt.toclevel||0)+
    ((sbookIsPageHead(elt))?"/ph":"")+
    ((sbookIsPageBlock(elt))?"/pb":"")+
    ((sbookAvoidPageHead(elt))?"/ah":"")+
    ((sbookAvoidPageFoot(elt))?"/af":"")+
    ((fdjtHasText(elt))?"/ht":"");
}

/* Adjusting pages */

/* This adjusts the offset of a page and its successor to avoid widows */

function sbookAdjustPageBreak(node,top,bottom)
{
  var nodeinfo=fdjtDOM.getGeometry(node);
  var styleinfo=fdjtDOM.getStyle(node);
  var lastbottom=nodeinfo.top;
  var linebottom=lastbottom;
  var children=node.childNodes;
  var len=children.length; 
  var i=0; while (i<len) {
    var child=children[i++];
    if (child.nodeType===1)
      if (child.sbookinui) continue;
      else {
	var offinfo=fdjtDOM.getGeometry(child);
	if ((!(offinfo))||(offinfo.height===0)) continue;
	else if (offinfo.bottom<top) continue;
	else if (offinfo.bottom>=bottom)
	  return lastbottom;
	else if (offinfo.top>=lastbottom) { // new line 
	  lastbottom=linebottom;
	  linebottom=offinfo.bottom;}
	else if (offinfo.bottom>linebottom)
	  linebottom=offinfo.bottom;
	else {}}
    else if (child.nodeType===3) {
      // Make the text into a span
      var chunk=fdjtDOM("span",child.nodeValue);
      node.replaceChild(chunk,child);
      var offinfo=fdjtDOM.getGeometry(chunk);
      if ((!(offinfo))||(offinfo.height===0)) {
	node.replaceChild(child,chunk);
	continue;}
      else if (offinfo.bottom<top) {
	node.replaceChild(child,chunk);
	continue;}
      else if (offinfo.top>=bottom) {
	// if it's over the bottom, put it back
	// and use the last bottom
	node.replaceChild(child,chunk);
	return lastbottom;}
      else if (offinfo.bottom<bottom) {
	// if it's above the bottom, put it back and keep going
	node.replaceChild(child,chunk);
	if (offinfo.top>=lastbottom) { // new line 
	  lastbottom=linebottom;
	  linebottom=offinfo.bottom;}
	else if (offinfo.bottom>linebottom)
	  linebottom=offinfo.bottom;
	else {}}
      else {
	// It's stradding the bottom, so we go finer
	var split=sbookSplitNode(child);
	node.replaceChild(split,chunk);
	var words=split.childNodes;
	var j=0; var nwords=words.length;
	while (j<nwords) {
	  var word=words[j++];
	  if (word.nodeType!==1) continue;
	  var wordoff=fdjtDOM.getGeometry(word);
	  if (wordoff.bottom<top) continue;
	  else if (wordoff.bottom>=bottom) {
	    // As soon as we're over the bottom, we return the last bottom
	    node.replaceChild(child,split);
	    return lastbottom;}
	  else if (wordoff.top>=lastbottom) { // new line
	    lastbottom=linebottom;
	    linebottom=wordoff.bottom;}
	  else if (wordoff.bottom>linebottom)
	    linebottom=wordoff.bottom;
	  else {}}
	node.replaceChild(child,split);
	return lastbottom;}}
    else {}}
  return lastbottom;
}

function sbookSplitNode(textnode)
{
  var text=textnode.nodeValue;
  var words=text.split(/\b/);
  var span=fdjtDOM("span.sbookpageprobe");
  var i=0; var len=words.length;
  while (i<len) {
    var word=words[i++];
    var textnode=document.createTextNode(word);
    if (word.search(/\S/)>=0) {
      var wordspan=document.createElement("span");
      wordspan.appendChild(textnode);
      span.appendChild(wordspan);}
    else span.appendChild(textnode);}
  return span;
}

/* Framing a page */

function sbookGoToPage(pagenum,pageoff)
{
  if ((typeof pagenum !== 'number')||
      (pagenum<0)||(pagenum>=sbook_pages.length)) {
    fdjtLog.warn("[%f] Invalid page number %o",pagenum);
    return;}
  if (sbook_trace_paging)
    fdjtLog("[%f] sbookGoToPage %o+%o",fdjtET(),pagenum,pageoff);
  var off=sbook_pages[pagenum]+(pageoff||0);
  var info=sbook_pageinfo[pagenum];
  if (sbook_trace_paging)
    if (sbook_curpage>=0)
      fdjtLog("[%f] Jumped to P%d@%d=%d+%d P%d@[%d,%d]#%s+%d (%o) from P%d@[%d,%d]#%s (%o)",
	      fdjtET(),pagenum,off,sbook_pages[pagenum],pageoff,
	      pagenum,info.top,info.bottom,info.first.id,pageoff||0,info,
	      sbook_curpage,sbook_curinfo.top,sbook_curinfo.bottom,
	      sbook_curinfo.first.id,sbook_curinfo);
    else ("[%f] Jumped to %d P%d@[%d,%d]#%s+%d (%o)",
	  fdjtET(),off,
	  pagenum,info.top,info.bottom,info.first.id,pageoff||0,info);
  var footheight=((off-sbook_top_px)+(fdjtDOM.viewHeight()))-info.bottom;
  if (footheight<0) {
    footheight=0; sbook_curbottom=sbook_bottom_px;}
  fdjtID("SBOOKPAGEFOOT").style.height=footheight+'px';
  sbook_curpage=pagenum;
  sbook_curoff=pageoff||0;
  sbook_curinfo=info;
  if (fdjtDOM.viewTop()!==(off-sbook_top_px)) {
    if (sbook_notfixed) 
      document.body.style.visibility='hidden';
    window.scrollTo(0,(off-sbook_top_px));
    if (sbook_notfixed) {
      sbookMoveMargins(info);
      sbookSyncHUD();
      document.body.style.visibility='visible';}}
  if ((sbook_target)&&(fdjtDOM.isVisible(sbook_target)))
    sbookSetHead(sbook_target);
  else sbookSetHead(info.focus||info.first);
  
  if (((info.first)&&(info.first.id))||((info.last)&&(info.last.id))) {
    var firstloc=
      ((info.first)&&(info.first.id)&&
       (sbook_info[info.first.id])&&(sbook_info[info.first.id].sbookloc));
    var lastloc=
      ((info.last)&&(info.last.id)&&
       (sbook_info[info.last.id])&&(sbook_info[info.last.id].sbookloc));
    if ((firstloc)&&(lastloc))
      sbookSetLocation(Math.floor((firstloc+lastloc)/2));
    else if (firstloc) sbookSetLocation(firstloc);
    else if (lastloc) sbookSetLocation(lastloc);}

  if ((sbook_mode==="mark")&&(!(fdjtDOM.isVisible(sbook_mark_target))))
    sbookHUDMode(false);
  sbook_pagescroll=fdjtDOM.viewTop();
  // Add class if it's temporarily gone
  fdjtDOM.addClass(document.body,"sbookpageview");
}

function sbookGetPage(arg)
{
  var top;
  if (typeof arg === "number") top=arg;
  else if (arg.nodeType)
    top=fdjtDOM.getGeometry(arg).top;
  else if (!(fdjtID(arg))) return 0;
  else top=fdjtDOM.getGeometry(fdjtID(arg)).top;
  var i=1; var len=sbook_pages.length;
  while (i<len) 
    if (sbook_pages[i]>top) return i-1;
    else i++;
  return i-1;
}

function sbookMoveMargins(pageinfo)
{
  fdjtID("SBOOKPAGEHEAD").style.top=(pageinfo.top-sbook_top_px)+"px";
  fdjtID("SBOOKPAGEFOOT").style.top=pageinfo.bottom+"px";
  fdjtID("SBOOKLEFTEDGE").style.top=(pageinfo.top-sbook_top_px)+"px";
  fdjtID("SBOOKLEFTEDGE").style.height=(fdjtDOM.viewHeight())+"px";
  fdjtID("SBOOKRIGHTEDGE").style.top=(pageinfo.top-sbook_top_px)+"px";
  fdjtID("SBOOKRIGHTEDGE").style.height=(fdjtDOM.viewHeight())+"px";
}

function sbookSyncPage()
{
  if (sbook_pageview) {
    if (fdjtDOM.viewTop()!==sbook_pages[sbook_curpage]) {
      window.scrollTo(sbook_pages[sbook_curpage]);
      if (sbook_notfixed) sbookSyncHUD();}}
}

/* Other stuff */

function sbookForward()
{
  if (sbook_pageview) {
    var goto=-1;
    if ((sbook_curpage<0)||(sbook_curpage>=sbook_pages.length)) {
      var pagenum=sbookGetPage(fdjtDOM.viewTop());
      if (pagenum<(sbook_pages.length-1)) sbook_curpage=pagenum+1;
      sbookGoToPage(sbook_curpage);}
    else {
      // Synchronize if neccessary
      if (sbook_pagescroll!==fdjtDOM.viewTop())
	sbookGoToPage(sbook_curpage,sbook_curoff);
      var info=sbook_pageinfo[sbook_curpage];
      var pagebottom=fdjtDOM.viewTop()+(fdjtDOM.viewHeight());
      if (pagebottom<info.bottom)
	sbookGoToPage(sbook_curpage,pagebottom-info.top);
      else if (sbook_curpage===sbook_pages.length) {}
      else {
	sbook_curpage++;
	sbookGoToPage(sbook_curpage);
	if ((sbook_curinfo.focus)&&(sbook_curinfo.focus.id))
	  sbookSetHashID(sbook_curinfo.focus);}}}
  else window.scrollBy(0,sbook_pagesize);
}

function sbookBackward()
{
  if (sbook_pageview) {
    var goto=-1;
    if ((sbook_curpage<0)||(sbook_curpage>=sbook_pages.length)) {
      var pagenum=sbookGetPage(fdjtDOM.viewTop());
      if (pagenum<(sbook_pages.length-1)) sbook_curpage=pagenum+1;
      sbookGoToPage(sbook_curpage);}
    else {
      // Synchronize if neccessary
      if (sbook_pagescroll!==fdjtDOM.viewTop())
	sbookGoToPage(sbook_curpage,sbook_curoff);
      var info=sbook_pageinfo[sbook_curpage];
      var pagetop=fdjtDOM.viewTop()+sbook_top_px;
      if (pagetop>info.top)
	sbookGoToPage(sbook_curpage,(info.top-pagetop)-sbook_pagesize);
      else if (sbook_curpage===0) {}
      else {
	sbook_curpage--;
	sbookGoToPage(sbook_curpage);
	if (sbook_curinfo.focus) sbookSetHashID(sbook_curinfo.focus);}}}
  else window.scrollBy(0,-sbook_pagesize);
}


/* Tracing pagination */

function sbookTracePaging(name,elt)
{
  if (!(elt)) {
    fdjtLog("[%f] %s none",fdjtET(),name);
    return;}
  var top=fdjtDOM.viewTop()+sbook_top_px;
  var bottom=fdjtDOM.viewTop()+((fdjtDOM.viewHeight())-sbook_bottom_px);
  var offsets=fdjtDOM.getGeometry(elt);
  fdjtLog("[%f] %s [%d+%d=%d] %s [%d,%d] %o%s%s%s%s '%s'\n%o",
	  fdjtET(),name,offsets.top,offsets.height,offsets.top+offsets.height,
	  sbookPagePlacement(offsets,top,bottom),top,bottom,
	  elt.toclevel||0,
	  (sbookIsPageHead(elt)?"/ph":""),
	  (sbookIsPageBlock(elt)?"/pb":""),
	  (sbookAvoidPageHead(elt)?"/ah":""),
	  (sbookAvoidPageFoot(elt)?"/af":""),
	  elt.id,elt);
}

function sbookPagePlacement(offsets,top,bottom)
{
  if (offsets.top>bottom) return "below";
  else if (offsets.bottom<top) return "above";
  else if (offsets.top<top) return "athead";
  else if ((offsets.top+offsets.height)<bottom) return "inside";
  else return "atfoot";
}

function sbookNextPage(evt)
{
  evt=evt||event||null;
  window.scrollBy(0,(fdjtDOM.viewHeight())-100);
  if (evt.preventDefault) evt.preventDefault(); else evt.returnValue=false;
  evt.cancelBubble=true;
}

function sbookPrevPage(evt)
{
  evt=evt||event||null;
  window.scrollBy(0,-((fdjtDOM.viewHeight())-100));
  if (evt.preventDefault) evt.preventDefault(); else evt.returnValue=false;
  evt.cancelBubble=true;
}

var advance_timer=false;
var advance_interval=800;

function sbookNextPrev_startit(evt)
{
  evt=evt||event;
  var target=fdjtDOM.T(evt);
  if (advance_timer) clearInterval(advance_timer);
  if (target.alt==='>>') sbookForward(); else sbookBackward();
  if (target.alt==='>>')
    advance_timer=setInterval(sbookForward,advance_interval);
  else advance_timer=setInterval(sbookBackward,advance_interval);
}

function sbookNextPrev_stopit(evt)
{
  clearInterval(advance_timer);
}

function sbookPageView(flag,nogo)
{
  if (flag===sbook_pageview)
    sbookCheckPagination();
  else if (flag) {
    sbook_pageview=true;
    fdjtUI.CheckSpan.set(fdjtID("SBOOKPAGEVIEW"),true,true);
    fdjtDOM.addClass(document.body,"sbookpageview");
    fdjtDOM.dropClass(document.body,"sbookscroll");
    sbookFlashMessage(3000,
		      "Now using page view",
		      fdjtDOM("span.details",
			       "Press ",fdjtDOM("span.key","P"),
			       " to toggle back to scroll view"));
    sbookCheckPagination();
    if (!(nogo))
      sbookGoToPage(sbookGetPage(sbook_target||sbook_root));}
  else {
    sbook_pageview=false;
    sbook_nextpage=false; sbook_pagebreak=false;
    fdjtUI.CheckSpan.set(fdjtID("SBOOKPAGEVIEW"),false,true);
    fdjtDOM.addClass(document.body,"sbookscroll");
    fdjtDOM.dropClass(document.body,"sbookpageview");
    sbookFlashMessage(3000,
		      "Now using scroll view",
		      fdjtDOM("span.details",
			       "Press ",fdjtDOM("span.key","P"),
			       " to toggle back to page view"));
    if (!(nogo)) {
      var curx=fdjtDOM.viewLeft(); var cury=fdjtDOM.viewTop();
      window.scrollTo(0,0);
      window.scrollTo(curx,cury);}}
}

/* Setting up the page layout */

function sbookMakeMargin(spec)
{
  var div=fdjtDOM(spec);
  div.onmouseover=fdjtDOM.cancel;
  div.onmouseout=fdjtDOM.cancel;
  div.onmousedown=fdjtDOM.cancel;
  div.onmouseup=fdjtDOM.cancel;
  div.onclick=sbookDropHUD;
  return div;
}

function sbookPageHead_onclick(evt)
{
  evt=evt||event;
  if ((evt.clientX)>(fdjtID("SBOOKRIGHTEDGE").offsetLeft))
    return sbookRightEdge_onclick(evt);
  else if ((evt.clientX)<(fdjtID("SBOOKLEFTEDGE").offsetWidth))
    return sbookLeftEdge_onclick(evt);
  else if (sbook_mode) sbookHUDMode(false);
  else sbookHUDMode(sbook_last_dash);
}

function sbookPageFoot_onclick(evt)
{
  evt=evt||event;
  if ((evt.clientX)>(fdjtID("SBOOKRIGHTEDGE").offsetLeft))
    return sbookRightEdge_onclick(evt);
  else if ((evt.clientX)<(fdjtID("SBOOKLEFTEDGE").offsetWidth))
    return sbookLeftEdge_onclick(evt);
  else if (sbook_mode) sbookHUDMode(false);
  else sbookHUDMode("context");
}

/* Pagination utility functions */

function sbookUpdatePagination()
{
  var pagesize=(fdjtDOM.viewHeight())-
    (sbook_top_px+sbook_bottom_px);
  var target=sbook_target;
  sbookMessage("Determining page layout");
  var pagination=sbookPaginate(pagesize);
  fdjtID("SBOOKBOTTOMLEADING").style.height=pagesize+'px';
  sbook_pages=pagination.pages;
  sbook_pageinfo=pagination.info;
  sbook_pagesize=pagesize;
  sbookFlashMessage(2000,"Done with page layout");
  if (target)
    sbookGoToPage(sbookGetPage(target));
  else sbookGoToPage(sbookGetPage(fdjtDOM.viewTop()));
}

function sbookCheckPagination()
{
  if ((sbook_paginated)&&
      (sbook_paginated.offheight===document.body.offsetHeight)&&
      (sbook_paginated.offwidth===document.body.offsetWidth)&&
      (sbook_paginated.winwidth===(document.documentElement.clientWidth))&&
      (sbook_paginated.winheight===(fdjtDOM.viewHeight())))
    return false;
  else {
    var newinfo={};
    sbookUpdatePagination();
    newinfo.offheight=document.body.offsetHeight;
    newinfo.offwidth=document.body.offsetWidth;
    newinfo.winwidth=(document.documentElement.clientWidth);
    newinfo.winheight=(fdjtDOM.viewHeight());
    // fdjtTrace("Updated pagination from %o to %o",sbook_paginated,newinfo);
    sbook_paginated=newinfo;
    return newinfo;}
}

function sbookSetFontSize(size)
{
  if (document.body.style.fontSize!==size) {
    document.body.style.fontSize=size;
    sbookCheckPagination();}
}

function sbookSetHUDFontSize(size)
{
  if (sbookHUD.style.fontSize!==size) sbookHUD.style.fontSize=size;
}

function sbookLeftEdge_onclick(evt)
{
  // sbook_trace("sbookLeftEdge_onclick",evt);
  if (sbook_edge_taps) sbookBackward();
  else sbookHUDMode(false);
  fdjtDOM.cancel(evt);
}

function sbookRightEdge_onclick(evt)
{
  // sbook_trace("sbookRightEdge_onclick",evt);
  if (sbook_edge_taps) sbookForward();
  else sbookHUDMode(false);
  fdjtDOM.cancel(evt);
}

/* Emacs local variables
;;;  Local variables: ***
;;;  compile-command: "cd ..; make" ***
;;;  End: ***
*/
