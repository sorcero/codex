/* -*- Mode: Javascript; -*- */

/* This file implements dialogs and interaction for marking (adding
   glosses) to sbooks. */

/* Copyright (C) 2009-2010 beingmeta, inc.
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

var sbooks_glossmark_id="$Id$";
var sbooks_glossmark_version=parseInt("$Revision$".slice(10,-1));

var sbookMark=
    (function(){
	// This is the target for which the mark HUD has been set
	sbook.mark_target=false;
	
	// This is the completions object for the mark cloud
	var sbook_mark_cloud=false;
	
	function inputvalue(elt){
	    if (fdjtDOM.hasClass(elt,"isempty"))
		return "";
	    else return elt.value;}

	function get_titlepath(info,embedded){
	    if (!(info))
		if (document.title)
		    if (embedded)
			return " // "+document.title;
	    else return "";
	    else return "";
	    else {
		var next=(info.head)||false;
		if (info.title)
		    return ((embedded) ? (" // ") : (""))+info.title+
		    get_titlepath(next,true);
		else return get_titlepath(next,embedded);}}

	/* Setting up the mark hud for a particular target */
	function setupHUD(target,origin,excerpt){
	    if (!(target))
		if ((origin)&&(origin.id))
		    target=fdjtID(origin.id);
	    else target=sbook.target;
	    if (!(sbook_mark_cloud))
		fdjtDOM.replace("SBOOKMARKCLOUD",sbookMark.getCloud().dom);
	    var refuri=sbook.getRefURI(target);
	    if (sbook.Trace.mark)
		fdjtLog("Setting up gloss HUD for %o from %o st=%o excerpt=%o",
			target,origin,sbook.target,excerpt);
	    if (sbook.mark_target===target) {
		/* If the HUD is already, initialized for the target, just update
		   the excerpt from the current selection */
		if (sbook.Trace.mark)
		    fdjtLog("Just updating gloss HUD with excerpt %o",excerpt);
		// Make sure there's a UUID
		if (!(fdjtID("SBOOKMARKUUID").value))
		    fdjtID("SBOOKMARKUUID").value=
		    fdjtState.getUUID(sbook.nodeid);
		setExcerpt(fdjtID("SBOOKMARKFORM"),excerpt||false);
		return;}
	    sbook.mark_target=target;
	    var info=((target) &&
		      ((sbook.Info(target)) ||
		       (sbook.Info(sbook.getHead(target)))));
	    // Get information about the origin if it's a gloss
	    //  If it's the user's gloss, we set it.  Otherwise,
	    //   we set the relay field
	    var glossinfo=((origin)&&
			   (((origin.qid)&&(sbook.sourcekb.map[origin.qid]))||
			    ((origin.uuid)&&(sbook.sourcekb.map[origin.uuid]))||
			    ((origin.oid)&&(sbook.sourcekb.map[origin.oid]))));
	    if (glossinfo)
		if (glossinfo.user===sbook.user) {
		    fdjtID("SBOOKMARKOID").value=origin.oid;
		    fdjtID("SBOOKMARKRELAY").value=glossinfo.relay||null;}
	    else {
		fdjtID("SBOOKMARKOID").value=null;
		fdjtID("SBOOKMARKRELAY").value=origin.oid;}
	    fdjtID("SBOOKMARKREFURI").value=refuri;
	    fdjtID("SBOOKMARKFRAGID").value=target.id;
	    fdjtID("SBOOKMARKSOURCE").value=sbook.getDocURI(target);
	    fdjtID("SBOOKMARKSYNC").value=sbook.syncstamp;
	    fdjtID("SBOOKMARKUUID").value=fdjtState.getUUID(sbook.nodeid);
	    fdjtID("SBOOKMARKTITLE").value=
		((origin)&&(origin.title))||
		((target)&&(target===sbook.target)&&(sbook.target_title))||
		(get_titlepath(info))||"";
	    if ((origin)&&(origin.oid))
		fdjtID("SBOOKMARKRELAY").value=origin.oid;
	    else fdjtID("SBOOKMARKRELAY").value=null;
	    setExcerpt(fdjtID("SBOOKMARKFORM"),excerpt||false);
	    var tags_elt=fdjtID("SBOOKMARKTAGS");
	    var checkspans=fdjtDOM.getChildren(tags_elt,".checkspan");
	    fdjtDOM.remove(fdjtDOM.toArray(checkspans));
	    if ((glossinfo)&&(glossinfo.tags)) {
		var tags=glossinfo.tags;
		i=0; lim=tags.length;
		while (i<lim) addTag(tags_elt,tags[i++]);}
	    if ((glossinfo)&&(glossinfo.xrefs))
		setXREFS(fdjtID("SBOOKMARKFORM"),(glossinfo.xrefs));
	    if ((glossinfo)&&(glossinfo.attachments))
		setAttachments(fdjtID("SBOOKMARKFORM"),(glossinfo.attachments));
	    // Reinit the autoprompt fields
	    fdjtUI.AutoPrompt.setup(fdjtID("SBOOKMARKHUD"));
	    /* Figure out the tagcues */
	    setTagCues(sbook_mark_cloud,target);}

	function setTagCues(cloud,target){
	    var docinfo=sbook.docinfo[target.id];
	    var glosses=sbook.glosses.find('frag',target.id);
	    if (cloud.frag_cues) fdjtDOM.dropClass(cloud.frag_cues,"cue");
	    var tags=[].concat(docinfo.tags||[]);
	    if ((glosses)&&(glosses.length)) {
		var i=0; var lim=glosses.length;
		while (i<lim) {
		    var gloss=glosses[i++];
		    if (gloss.tags) cues.concat(gloss.tags);}}
	    cloud.frag_cues=cloud.setCues(tags);}

	function setExcerpt(form,text){
	    var excerpt=fdjtDOM.getChild(form,'.excerpt');
	    var content=(excerpt)&&fdjtDOM.getChild(excerpt,'.content');
	    var input=(excerpt)&&
		fdjtDOM.getChild(excerpt,"input[name='EXCERPT']");	    
	    if (!(text)) {
		input.value="";
		fdjtDOM.replace(content,fdjtDOM("span.content"));
		fdjtDOM.addClass(excerpt,"noexcerpt");}
	    else {
		input.value=text;
		fdjtDOM.dropClass(excerpt,"noexcerpt");
		fdjtDOM.replace(content,fdjtDOM("span.content",text));}}
	function setXREFS(form,xrefs){
	    var div=fdjtDOM.getChild(form,'.xrefs');
	    var cur=fdjtDOM.getChildren(div,'.xref');
	    if ((cur)&&(cur.length)) fdjtDOM.remove(cur);
	    if (xrefs) 
		for (var uri in xrefs) {
		    var title=xrefs[uri];
		    var compound=((uri===title)?(uri):(uri+"|"+title));
		    var xref_div=
			fdjtDOM("div.xref",
				fdjtUI.CheckSpan
				("span.checkspan.checkbox",
				 "XREF",compound,true),
				fdjtDOM.Anchor(false,uri,title));
		    fdjtDOM(div,xref_div);}}
	function setAttachments(form,attachments){
	    var div=fdjtDOM.getChild(form,'.attachments');
	    var cur=fdjtDOM.getChildren(div,'.attachment');
	    if ((cur)&&(cur.length)) fdjtDOM.remove(cur);
	    if (attachments) 
		for (var uri in attachments) {
		    var title=attachments[uri];
		    var compound=((uri===title)?(uri):(uri+"|"+title));
		    var xref_div=
			fdjtDOM("div.attachment",
				fdjtUI.CheckSpan
				("span.checkspan.checkbox",
				 "ATTACHMENTS",compound,true),
				fdjtDOM.Anchor(false,uri,title));
		    fdjtDOM(div,xref_div);}}

	function oncallback(req){
	    if (sbook.Trace.network)
		fdjtLog("Got AJAX gloss response %o from %o",req,sbook_mark_uri);
	    fdjtKB.Import(JSON.parse(req.responseText));
	    // Clear the UUID
	    fdjtID("SBOOKMARKUUID").value="";
	    /* Turn off the target lock */
	    sbook.setTarget(false);
	    sbookMode(false);}

	function addTag(form,tag) {
	    if (!(tag)) tag=form;
	    if (form.tagName!=='FORM')
		form=fdjtDOM.getParent(form,'form')||form;
	    var tagselt=fdjtDOM.getChild(form,'.tags');
	    var varname='TAGS'; var info;
	    if ((tag.nodeType)&&(fdjtDOM.hasClass(tag,'completion'))) {
		if (fdjtDOM.hasClass(tag,'outlet'))
		    varname='OUTLETS';
		else if (fdjtDOM.hasClass(tag,'source'))
		    varname='ATTENTION'
		else {}
		tag=sbook_mark_cloud.getValue(tag);}
	    var info=fdjtKB.ref(tag)||sbook.knowlet.probe(tag);
	    var text=((info)?
		      ((info.toHTML)&&(info.toHTML())||info.name||info.dterm):
		      (tag));
	    if (info) {
		if (info.knowlet===sbook.knowlet)
		    tag=info.dterm;
		else tag=info.qid||info.oid||info.dterm||tag;}
	    if ((info)&&(info.pool===sbook.sourcekb)) varname='OUTLETS';
	    var span=fdjtUI.CheckSpan("span.checkspan",varname,tag,true);
	    fdjtDOM.addClass(span,varname.toLowerCase());
	    fdjtDOM.append(span,text);
	    fdjtDOM.append(tagselt,span," ");}

	    
	/* The completions element */
	function getCloud(){
	    if (sbook_mark_cloud) return sbook_mark_cloud;
	    var seen={};
	    var sbook_index=sbook.index;
	    var outlets_span=fdjtDOM("span.outlets");
	    var sources_span=fdjtDOM("span.sources");
	    var completions=fdjtDOM("div.completions","\n",outlets_span);
	    if (sbook.outlets) {
		var outlets=sbook.outlets;
		var i=0; var lim=outlets.length;
		while (i<lim) {
		    var outlet=outlets[i++];
		    var info=sbook.sourcekb.ref(outlet);
		    var completion=fdjtDOM("span.completion.cue.outlet",info.name);
		    completion.setAttribute("value",outlet);
		    completion.setAttribute("key",info.name);
		    if (info.about) completion.title=info.about;
		    fdjtDOM(outlets_span,completion," ");}}
	    if (sbook.sources) {
		var outlets=sbook.outlets||[];
		var sources=sbook.sources;
		var i=0; var lim=sources.length;
		while (i<lim) {
		    var source=sources[i++];
		    if (fdjtKB.contains(outlets,source)) continue;
		    var info=sbook.sourcekb.ref(source);
		    var completion=fdjtDOM
		    ("span.completion.source",info.name);
		    completion.setAttribute("value",source);
		    completion.setAttribute("key",info.name);
		    if (info.about) completion.title=info.about;
		    fdjtDOM(sources_span,completion," ");}}
	    completions._seen=seen;
	    var tagscores=sbook_index.tagScores();
	    var alltags=tagscores._all;
	    var i=0; while (i<alltags.length) {
		var tag=alltags[i++];
		// We elide sectional tags
		if ((typeof tag === "string") && (tag[0]==="\u00A7")) continue;
		var tagnode=Knowlet.HTML(tag,sbook.knowlet,false,true);
		fdjtDOM(completions,tagnode," ");}
	    var i=0; while (i<alltags.length) {
		var tag=alltags[i++];
		// We elide sectional tags
		if ((typeof tag === "string") && (tag[0]==="\u00A7")) {
		    var showname=tag; var title;
		    if (showname.length>17) {
			showname=showname.slice(0,17)+"...";
			title=tag;}
		    var sectnode=
			fdjtDOM("span.completion",fdjtDOM("span.sectname",showname));
		    if (title) sectnode.title=title;
		    sectnode.key=tag; sectnode.value=tag;
		    fdjtDOM(completions,sectnode," ");
		    continue;}}
	    // Generic sources go at the end
	    fdjtDOM(completions,sources_span);
	    fdjtDOM.addListener(completions,"click",markcloud_onclick);
	    sbook_mark_cloud=
		new fdjtUI.Completions(
		    completions,false,
		    fdjtUI.FDJT_COMPLETE_OPTIONS|
			fdjtUI.FDJT_COMPLETE_CLOUD|
			fdjtUI.FDJT_COMPLETE_ANYWORD);
	    return sbook_mark_cloud;}

	function markcloud_onclick(evt){
	    var target=fdjtUI.T(evt);
	    var completion=fdjtDOM.getParent(target,'.completion');
	    if (completion) addTag(completion);
	    fdjtUI.cancel(evt);}
	
	var _sbook_tagupdate=false;
	var _sbook_tagupdate_delay=300;
	function taginput_onkeypress(evt){
	    evt=evt||event||null;
	    if (sbook._tagupdate) {
		clearTimeout(sbook._tagupdate);
		sbook._tagupdate=false;}
	    var ch=evt.charCode||evt.keyCode;
	    var target=fdjtDOM.T(evt);
	    if ((ch===13)||(ch===59)||(ch===93)) {
		var qstring=inputvalue(target);
		if (!(fdjtString.isEmpty(qstring))) {
		    fdjtDOM.cancel(evt);
		    var completions=sbook_mark_cloud.complete(qstring);
		    // fdjtLog("Completions on %o are %o",qstring,completions);
		    if (completions.length) addTag(target,completions[0]);
		    else {
			var curval=target.value;
			var knospan=sbook.knowlet.HTML(curval,false,true);
			fdjtDOM.prepend(fdjtID("SBOOKMARKCLOUD"),knospan);
			addTag(target,curval);}
		    target.value="";
		    fdjtDOM.addClass(target,"isempty");
		    sbook_mark_cloud.complete("");}
		else {}
		return false;}
	    else if (ch==32) { /* Space */
		var qstring=inputvalue(target);
		var completions=sbook_mark_cloud.complete(qstring);
		if (completions.prefix!==qstring) {
		    target.value=completions.prefix;
		    fdjtDOM.cancel(evt);
		    return;}}
	    else {
		sbook._tagupdate=
		    setTimeout(function(){
			sbook._tagupdate=false;
			sbook_mark_cloud.complete(inputvalue(target));},
			       _sbook_tagupdate_delay);}}
	sbookUI.handlers.taginput_onkeypress=taginput_onkeypress;

	function taginput_onfocus(evt){
	    evt=evt||event||null;
	    var input=fdjtDOM.T(evt);
	    sbook_mark_cloud.complete(inputvalue(input));}
	sbookUI.handlers.taginput_onfocus=taginput_onfocus;

	function taginput_onkeyup(evt){
	    evt=evt||event||null;
	    var kc=evt.keyCode;
	    if ((kc===8)||(kc===45)) {
		if (sbook._tagupdate) {
		    clearTimeout(sbook._tagupdate);
		    sbook._tagupdate=false;}
		var target=fdjtDOM.T(evt);
		sbook._tagupdate=
		    setTimeout(function(){
			sbook._tagupdate=false;
			sbook_mark_cloud.complete(inputvalue(target));},
			       _sbook_tagupdate_delay);}}
	sbookUI.handlers.taginput_onkeyup=taginput_onkeyup;

	/* Other fields */
	
	function xrefs_onkeypress(evt){
	    return fdjtMultiText_onkeypress(evt,'div');}
	sbookUI.handlers.xrefs_onkeypress;
	
	function gettagspan(input,pt){
	    if (fdjtDOM.hasClass(input,"isempty")) return false;
	    if ((typeof pt === 'undefined')&&
		(typeof input.selectionStart === 'number')&&
		(typeof input.selectionEnd === 'number')&&
		(input.selectionEnd>input.selectionStart)) {
		var val=input.value;
		var start=input.selectionStart;
		var end=input.selectionEnd;
		if ((start>0)&&(val[start-1]==='[')) start--;
		if (val[end+1]===']') end++;
		return [start,end];}
	    if (!(pt)) pt=input.selectionStart;
	    var val=input.value;
	    var start=val.indexOf('[');
	    if ((start<0)||(start>pt)) return false;
	    var scan=val.indexOf('[',start+1);
	    while ((scan>=0)&&(scan<pt)) {
		start=scan; scan=val.indexOf('[',start+1);}
	    if (start<0) return false;
	    var end=val.indexOf(']',start);
	    if (end<0) return [start,pt];
	    else if (end<pt) return false;
	    else return [start,end+1];}

	function inline_complete(input_elt,engage){
	    if (fdjtDOM.hasClass(input_elt,"isempty")) return;
	    var tagspan=gettagspan(input_elt);
	    if (!(tagspan)) return;
	    var start=tagspan[0], end=tagspan[1];
	    if (engage) inline_tag(input_elt,input_elt.value,start,end);
	    else {
		var val=input_elt.value;
		if (val[start]==='[') start++;
		if (val[end-1]===']') end--;
		sbook_mark_cloud.complete(val.slice(start,end));}}
	function inline_tag(input_elt,string,start,end){
	    var tagstring=string.slice(start,end);
	    if (tagstring[0]==='[') tagstring=tagstring.slice(1);
	    if (tagstring[tagstring.length-1]===']')
		tagstring=tagstring.slice(0,tagstring.length-1);
	    var completions=
		sbook_mark_cloud.complete(tagstring);
	    if ((!(completions))||(completions.length===0))
		addTag(input_elt,tagstring);
	    else if (completions.length===1) {
		addTag(input_elt,completions[0]);
		if (completions.strings) tagstring=completions.strings[0];}
	    else {
		addTag(input_elt,completions[0]);
		if (completions.strings) tagstring=completions.strings[0];}
	    sbook_mark_cloud.complete("");
	    input_elt.value=
		string.slice(0,start)+
		'['+tagstring+']'+
		string.slice(end+1);}

	// Here's how it works:
	//  When typing, go back to the open bracket and try to complete
	//  When you type a ], force a completion
	//  When you click the tag icon, 
	//    Get the tagtext, which is either
	//    if text is selected and it's bracketed, force a completion
	//    otherwise, bracket it and probe a completion
	//    if no text is selected but you're in a tag

	function insertTag(evt){
	    evt=evt||event;
	    fdjtUI.cancel(evt);
	    var target=fdjtUI.T(evt);
	    var form=fdjtDOM.getParent(target,"FORM");
	    var input=fdjtDOM.getChild(form,".addnote");
	    var start=input.selectionStart;
	    var end=input.selectionEnd;
	    if ((typeof start === 'number')&&
		(typeof end === 'number')&&
		(end>start)) {
		var val=input.value;
		var sel=val.slice(start,end);
		input.focus();
		fdjtLog("cur=%o sel=%o",sbook_mark_cloud.curstring,sel);
		if (sbook_mark_cloud.curstring===sel)
		    inline_tag(input,val,start,end);
		else sbook_mark_cloud.complete(sel);}
	    else {
		var val=input.value;
		input.value=val.slice(0,start)+'[]'+val.slice(start);
		input.selectionStart=input.selectionEnd=start+1;
		return;}}
	sbookMark.insertTag=insertTag;
		
	function note_onmouseup(evt){
	    inline_complete(fdjtUI.T(evt));}
	function note_onkeypress(evt){
	    var target=fdjtUI.T(evt);
	    if (evt.charCode===93) { /* ] */
		inline_complete(target,true);
		fdjtUI.cancel(evt);}
	    else setTimeout(function(){inline_complete(target);},
			    _sbook_tagupdate_delay);}
	
	function engage_glossbar(evt){
	  var gb=fdjtDOM.getParent(fdjtUI.T(evt),".glossbar");
	  fdjtDOM.toggleClass(gb,"engaged");}

	function setupMarkForm(form){
	    if (form.getAttribute("sbooksetup")) return;
	    form.onsubmit=fdjtAjax.onsubmit;
	    form.oncallback=sbookMark.oncallback;
	    var glossbar=fdjtDOM.getChild(form,".glossbar");
	    if (glossbar)
	      fdjtDOM.addListener(glossbar,"click",engage_glossbar);
	    var noteinput=fdjtDOM.getChild(form,"[name='NOTE']");
	    if (noteinput) {
		fdjtDOM.addListener(noteinput,"mouseup",note_onmouseup);
		fdjtDOM.addListener(noteinput,"keypress",note_onkeypress);}
	    var origin=fdjtDOM.getChild(form,"input[name='origin']");
	    if (origin) origin.value=
		document.location.protocol+"//"+document.location.hostname;
	    fdjtUI.AutoPrompt.setup(form);
	    form.setAttribute("sbooksetup","yes");}

	var markmodes=/(showxrefs)|(showhelp)|(showattach)/;

	function toggleMarkMode(arg,mode) {
	    if (!(arg)) arg=event;
	    var target=((arg.nodeType)?(arg):(fdjtUI.T(arg)));
	    var form=fdjtDOM.getParent(target,'form');
	    if (!(mode)) fdjtDOM.dropClass(form,markmodes);
	    else if (fdjtDOM.hasClass(form,mode))
		fdjtDOM.dropClass(form,mode);
	    else {
		fdjtDOM.dropClass(form,markmodes);
		fdjtDOM.addClass(form,mode);}}

	/* Mark functions */
	
	function sbookMark(target,gloss,excerpt){
	    setupMarkForm(fdjtID("SBOOKMARKFORM"),gloss,excerpt);
	    if (sbook.mark_target!==target) {fdjtID("SBOOKMARKFORM").reset();}
	    if ((gloss)&&(gloss.user)) {
		// Handle relays and edits
		if (gloss.user===sbook.user.qid)
		    sbookMark.setup(target,gloss||false,excerpt||false);
		else {
		    sbookMark.setup(target,false,excerpt||false);
		    if (gloss.gloss) fdjtID("SBOOKMARKRELAY").value=gloss.gloss;
		    if (gloss.user) {
			var userinfo=sbook.sourcekb.map[gloss.user];
			var glossblock=
			    fdjtDOM("div.sbookrelayblock","Relayed from ",
				    fdjtDOM("span.user",userinfo.name),
				    ((gloss.note)&&(": ")),
				    ((gloss.note)?(fdjtDOM("span.note",gloss.note)):(false)));
			fdjtDOM.replace("SBOOKMARKRELAYBLOCK",glossblock);}}}
	    else sbookMark.setup(target,gloss||false,excerpt||false);
	    sbookUI.openGlossmark(target,true);
	    sbookMode("mark");
	    fdjtID("SBOOKMARKINPUT").focus();}
	sbookMark.setup=setupHUD;
	sbookMark.oncallback=oncallback;
	sbookMark.getCloud=getCloud;
	sbookMark.toggle=toggleMarkMode;
	sbookMark.revid="$Id$";
	sbookMark.version=parseInt("$Revision$".slice(10,-1));
	sbookMark.cloud=function(){return sbook_mark_cloud;};

	return sbookMark;})();

/* Emacs local variables
;;;  Local variables: ***
;;;  compile-command: "cd ..; make" ***
;;;  End: ***
*
/
