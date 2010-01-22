/* -*- Mode: Javascript; -*- */

var sbooks_pages_id="$Id$";
var sbooks_pages_version=parseInt("$Revision$".slice(10,-1));

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

/* Getting the 'next' node */

function sbookNext(elt)
{
  var info=sbook_getinfo(elt);
  if ((info.sub) && (info.sub.length>0))
    return info.sub[0];
  else if (info.next) return info.next;
  else return sbookNextUp(elt);
}

function sbookNextUp(elt)
{
  var info=sbook_getinfo(elt).sbook_head;
  while (info) {
    if (info.next) return info.next;
    info=info.sbook_head;}
  return head;
}

function sbookPrev(elt)
{
  var info=sbook_getinfo(elt);
  if (!(info)) return false;
  else if (info.prev) {
    info=info.prev;
    if ((info.sub) && (info.sub.length>0))
      return info.sub[info.sub.length-1];
    else return document.getElementById(info.id);}
  else if (info.sbook_head)
    return document.getElementById(info.sbook_head.id);
  else return false;
}

function sbookUp(elt)
{
  var info=sbook_getinfo(elt);
  if ((info) && (info.sbook_head))
    return document.getElementById(info.sbook_head.id);
  else return false;
}


/* Section/page navigation */

function sbookNextSection(evt)
{
  var prev=((evt.ctrlKey) ? (sbookUp(sbook_head)) :
	    (sbookPrev(sbook_head)));
  if (prev) sbookGoTo(prev);
}

function sbookPrevSection(evt)
{
    var next=((evt.ctrlKey) ? (sbookNextUp(sbook_head)) :
	      (sbookNext(sbook_head)));
    if (next) sbookGoTo(next);
}

function sbookNextPage(evt)
{
  evt=evt||event||null;
  window.scrollBy(0,window.innerHeight-100);
  setTimeout("sbookTrackFocus(sbookGetXYFocus())",100);
  if (evt.preventDefault) evt.preventDefault(); else evt.returnValue=false;
  evt.cancelBubble=true;
}

function sbookPrevPage(evt)
{
  evt=evt||event||null;
  window.scrollBy(0,-(window.innerHeight-100));
  setTimeout("sbookTrackFocus(sbookGetXYFocus())",100);
  if (evt.preventDefault) evt.preventDefault(); else evt.returnValue=false;
  evt.cancelBubble=true;
}

var advance_timer=false;
var advance_interval=800;

function sbookNextPrev_startit(evt)
{
  evt=evt||event;
  var target=$T(evt);
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

function sbookForward()
{
  if (!(sbook_smart_paging)) {
    window.scrollBy(0,(window.innerHeight)-80);
    return;}
  var focus=sbookGetXYFocus(window.scrollX,window.scrollY);
  var head=sbookGetHead(focus);
  if (!(fdjtIsVisible(head))) head=sbookNextHead(head);
  var next=sbookNextHead(head);
  var deltahead=((head)?(((head.Yoff)-window.scrollY)):(0));
  var deltanext=((next)?(((next.Yoff)-window.scrollY)):(0));
  var deltapage=(window.innerHeight);
  var halfpage=(window.innerHeight)/2;
  /*
  fdjtTrace("heady=%o nexty=%o scrolly=%o",
	    head.Yoff,((next)&&(next.Yoff)),window.scrollY);
  fdjtTrace("head=%o<%s> next=%o<%s> dhead=%o dnext=%o dpage=%o",
	    head,fdjtTextify(head),next,fdjtTextify(next),
	    deltahead,deltanext,deltapage);
  */
  if ((deltahead>100)&&(deltahead<deltapage))
    window.scrollBy(0,deltahead-40);
  else if ((deltanext>100)&&(deltanext<deltapage)) /* &&(deltanext>halfpage) */
    window.scrollBy(0,deltanext-40);
  else window.scrollBy(0,deltapage-20);
}

function sbookBackward()
{
  window.scrollBy(0,-(window.innerHeight-20));
}


/* Emacs local variables
;;;  Local variables: ***
;;;  compile-command: "cd ..; make" ***
;;;  End: ***
*/
