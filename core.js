/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### codex/core.js ###################### */

/* Copyright (C) 2009-2013 beingmeta, inc.
   This file implements a Javascript/DHTML web application for reading
   large structured documents (sBooks).

   For more information on sbooks, visit www.sbooks.net
   For more information on knodules, visit www.knodules.net
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

/* Initialize these here, even though they should always be
   initialized before hand.  This will cause various code checkers to
   not generate unbound variable warnings when called on individual
   files. */
var fdjt=((typeof fdjt !== "undefined")?(fdjt):({}));
var Knodule=((typeof Knodule !== "undefined")?(Knodule):({}));
var iScroll=((typeof iScroll !== "undefined")?(iScroll):({}));

var Codex=
    {mode: false,hudup: false,scrolling: false,query: false,
     head: false,target: false,glosstarget: false,location: false,
     root: false,start: false,HUD: false,dosync: true,
     user: false, loggedin: false, cxthelp: false,
     _setup: false,_user_setup: false,_gloss_setup: false,_social_setup: false,
     // Whether we have a real connection to the server
     connected: false,
     // Keeping track of paginated context
     curpage: false,curoff: false,curinfo: false, curbottom: false,
     // For tracking UI state
     last_mode: false, last_heartmode: "about", demo: false,
     // How long it takes a gesture to go from tap to hold
     taptapmsecs: 500, holdmsecs: 200, edgeclick: 50, pagesize: 250,
     dontanimate: false,
     glossmodes: /(addtag)|(addlink)|(addoutlet)|(editdetail)/,
     updatehash: true, iscroll: false,
     // Whether to cache layouts locally
     cachelayouts: true,
     // Whether to store glosses, etc for offline/faster access
     persist: false,
     // Whether to use native scrolling for body content
     nativescroll: true,
     // Whether to use native scrolling for embedded DIVs
     scrolldivs: true,
     // Dominant interaction mode
     mouse: true,touch: false,kbd: false,
     // Restrictions on excerpts
     min_excerpt: 3, max_excerpt: false,
     // These are the UUIDs of locally stored glosses which are queued
     //  to be saved when possible (online and connected).
     queued: [],
     // These are weights assigned to search tags
     tagweights: {}, tagmaxweight: 0, tagminweight: 200000000,
     // This is the base URI for this document, also known as the REFURI
     // A document (for instance an anthology or collection) may include
     // several refuri's, but this is the default.
     refuri: false,
     // These are the refuris used in this document
     refuris: [],
     // This is the document URI, which is usually the same as the REFURI.
     docuri: false,
     // This is the unique signed DOC+USER identifier used by myCopy
     // social DRM
     mycopyid: false, 
     // This is the time of the last update
     syncstamp: false,
     // Various handlers, settings, and status information for the
     // Codex interface
     UI: {
         // This maps device types into sets of node->event handlers
         handlers: {mouse: {}, kbd: {}, ios: {}}},
     Debug: {},
     /* This is where HTML source strings for UI components are placed */
     HTML: {},
     /* This is where we store pointers into the dom */
     DOM: {},
     Trace: {
         startup: 0,       // Whether to trace startup
         config: 0,        // Whether to trace config setup/modification/etc
         mode: false,      // Whether to trace mode changes
         nav: false,       // Whether to trace book navigation
         scan: 1,          // How much to trace DOM scanning
         search: 0,        // How much to trace searches
         clouds: 0,        // How much to trace cloud generation
         focus: false,     // Whether to trace target changes
         toc: false,       // Whether we're debugging TOC tracking
         storage: 0,       // How much to trace offline persistence
         network: 0,       // How much to trace server interaction
         glosses: 0,       // How much we're tracing gloss processing
         layout: 0,        // How much to trace document layout
         knodules: 0,      // How much to trace knodule processing
         dosync: false,    // Whether to trace state saves
         state: false,     // Whether to trace set state
         flips: false,     // Whether to trace page flips (movement by pages)
         messages: false,  // Whether to trace inter-window messages
         iscroll: false,   // Whether to trace HUD scrolling with iScroll
         highlight: 0,     // Whether to trace highlighting
         indexing: 0,      // How much to trace document indexing
         gestures: 0}      // How much to trace gestures
    };

(function(){

    var fdjtString=fdjt.String;
    var fdjtState=fdjt.State;
    var fdjtTime=fdjt.Time;
    var fdjtLog=fdjt.Log;
    var fdjtDOM=fdjt.DOM;
    var fdjtUI=fdjt.UI;
    var fdjtID=fdjt.ID;
    var RefDB=fdjt.RefDB, Ref=fdjt.Ref, Query=RefDB.Query;

    var hasClass=fdjtDOM.hasClass;
    var addClass=fdjtDOM.addClass;
    var dropClass=fdjtDOM.dropClass;
    var hasParent=fdjtDOM.hasParent;

    var getLocal=fdjt.State.getLocal;
    
    function initDB() {
        if (Codex.Trace.start>1) fdjtLog("Initializing DB");
        var refuri=(Codex.refuri||document.location.href);
        if (refuri.indexOf('#')>0) refuri=refuri.slice(0,refuri.indexOf('#'));

        // Global lists
        Codex.allglosses=[];
        Codex.allsources=[];
        // These are all references outside of the glosses
        Codex.etc=[];

        var docinfo=Codex.docdb=new RefDB(
            refuri+"#",{indices: ["frag","tags","tags*",
                                  "*tags","**tags","~tags"]});
        
        var knodule_name=
            fdjtDOM.getMeta("SBOOK.knodule")||
            fdjtDOM.getMeta("~KNODULE")||
            refuri;
        Codex.knodule=new Knodule(knodule_name);
        Codex.BRICO=new Knodule("BRICO");
        Codex.BRICO.addAlias(":@1/");
        Codex.BRICO.addAlias("@1/");
        var glosses_init={
            indices: ["frag","maker","outlets"]};
        Codex.glossdb=new RefDB("glosses",glosses_init); {
            var superadd=Codex.glossdb.add;
            Codex.glossdb.absrefs=true;
            Codex.glossdb.addAlias("glossdb");
            Codex.glossdb.addAlias("-UUIDTYPE=61");
            Codex.glossdb.addAlias(":@31055/");
            Codex.glossdb.addAlias("@31055/");
            Codex.glossdb.onLoad(function initGloss(item) {
                var elt=document.getElementById(item.frag);
                var info=Codex.docinfo[item.frag];
                if (!(info)) {
                    fdjtLog("Gloss refers to nonexistent '%s': %o",
                            item.frag,item);
                    return;}
                if ((info)&&(info.starts_at)) {item.starts_at=info.starts_at;}
                if ((info)&&(info.starts_at)) {item.ends_at=info.ends_at;}
                if ((!(item.maker))&&(Codex.user)) item.maker=(Codex.user._id);
                var maker=(item.maker)&&(Codex.sourcedb.ref(item.maker));
                if (maker) {
                    Codex.addTag2GlossCloud(maker);
                    Codex.addTag2SearchCloud(maker);
                    Codex.UI.addGlossSource(maker,true);}
                var maker_knodule=Codex.getMakerKnodule(item.maker);
                var tags=item.tags; var knodes=[];
                if (tags) {
                    if ((typeof tags === 'string')||(!(tags.length)))
                        tags=[tags];
                    if ((tags)&&(tags.length)) {
                        var i=0; var lim=tags.length;
                        while (i<lim) {
                            var tag=tags[i++];
                            var knode=addTag(item,tag);
                            if (info.glosstags)
                                info.glosstags.push(knode);
                            else info.glosstags=[knode];
                            knodes.push(knode);
                            Codex.addTag2SearchCloud(knode);
                            Codex.addTag2GlossCloud(knode);}}}
                var sources=item.sources;
                if (sources) {
                    if (typeof sources === 'string') sources=[sources];
                    if ((sources)&&(sources.length)) {
                        var i=0; var lim=sources.length;
                        while (i<lim) {
                            var source=sources[i++];
                            var ref=Codex.sourcedb.ref(source);
                            Codex.UI.addGlossSource(ref,true);}}}},
                                  "initgloss");
            if (Codex.persist) Codex.glossdb.storage=window.localStorage;}
        Codex.sourcedb=new RefDB("sources");{
            Codex.sourcedb.absrefs=true;
            Codex.sourcedb.addAlias("@1961/");
            Codex.sourcedb.forDOM=function(source){
                var spec="span.source"+((source.kind)?".":"")+
                    ((source.kind)?(source.kind.slice(1).toLowerCase()):"");
                var name=source.name||source.oid||source.uuid||source.uuid;
                var span=fdjtDOM(spec,name);
                if (source.about) span.title=source.about;
                return span;};
            var anonymous=Codex.sourcedb.ref("@1961/0");
            Codex.anonymous=anonymous;
            anonymous.name="anonymous";
            if (Codex.persist) Codex.sourcedb.storage=window.localStorage;}

        Codex.queued=((Codex.persist)&&
                      (getLocal("queued("+Codex.refuri+")",true)))||
            [];

        function Query(tags,base_query){
            if (!(this instanceof Query))
                return new Query(tags,base_query);
            else if (arguments.length===0) return this;
            else return Knodule.TagQuery.call(
                this,tags,false,false,false,base_query);}
        Query.prototype=new Knodule.TagQuery();
        Query.prototype.dbs=[Codex.glossdb,Codex.docdb];
        Query.prototype.base_slots=["tags","^tags","+tags"];
        Query.prototype.ambigrefs=false;
        Codex.Query=Query;

        Codex.query=Codex.empty_query=new Query([]);

        if (Codex.Trace.start>1) fdjtLog("Initialized DB");}
    Codex.initDB=initDB;

    function getMakerKnodule(arg){
        var result;
        if (!(arg)) arg=Codex.user;
        if (!(arg)) return (Codex.knodule);
        else if ((arg.maker)&&(arg.maker._qid))
            result=new Knodule(arg.maker._qid);
        else if (arg._qid)
            result=new Knodule(arg._qid);
        else if (arg._id)
            result=new Knodule(arg._i);
        else result=Codex.knodule;
        result.description=arg.name;
        return result;}
    Codex.getMakerKnodule=getMakerKnodule;

    var trace1="%s %o in %o: mode%s=%o, target=%o, head=%o scanning=%o";
    var trace2="%s %o: mode%s=%o, target=%o, head=%o scanning=%o";
    function sbook_trace(handler,cxt){
        var target=((cxt.nodeType)?(cxt):(fdjtUI.T(cxt)));
        if (target)
            fdjtLog(trace1,handler,cxt,target,
                    ((Codex.scanning)?("(scanning)"):""),Codex.mode,
                    Codex.target,Codex.head,Codex.scanning);
        else fdjtLog(trace2,handler,cxt,
                     ((Codex.scanning)?("(scanning)"):""),Codex.mode,
                     Codex.target,Codex.head,Codex.scanning);}
    Codex.trace=sbook_trace;

    // This is the hostname for the sbookserver.
    Codex.server=false;
    // This is an array for looking up sbook servers.
    Codex.servers=[[/.sbooks.net$/g,"glosses.sbooks.net"]];
    //Codex.servers=[];
    // This is the default server
    Codex.default_server="glosses.sbooks.net";
    // There be icons here!
    Codex.root=fdjtDOM.getLink("CODEX.staticroot")||
        "http://static.beingmeta.com/";
    Codex.withsvg=document.implementation.hasFeature(
        "http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1")||
        navigator.mimeTypes["image/svg+xml"];
    Codex.svg=false;
    if (fdjtState.getQuery("nosvg")) Codex.svg=false;
    else if (fdjtState.getQuery("withsvg")) Codex.svg=true;
    Codex.icon=function(base,width,height){
        return Codex.root+"g/codex/"+base+
            ((Codex.svg)?(".svgz"):
             ((((width)&&(height))?(width+"x"+height):
               (width)?(width+"w"):(height)?(height+"h"):"")+
              ".png"));}

    Codex.getRefURI=function(target){
        var scan=target;
        while (scan)
            if (scan.refuri) return scan.refuri;
        else scan=scan.parentNode;
        return Codex.refuri;}

    Codex.getDocURI=function(target){
        var scan=target;
        while (scan) {
            var docuri=
                (((scan.getAttributeNS)&&
                  (scan.getAttributeNS("docuri","http://sbooks.net/")))||
                 ((scan.getAttribute)&&(scan.getAttribute("docuri")))||
                 ((scan.getAttribute)&&(scan.getAttribute("data-docuri"))));
            if (docuri) return docuri;
            else scan=scan.parentNode;}
        return Codex.docuri;}

    Codex.getRefID=function(target){
        if (target.getAttributeNS)
            return (target.getAttributeNS('sbookid','http://sbooks.net/'))||
            (target.getAttributeNS('sbookid'))||
            (target.getAttributeNS('data-sbookid'))||
            (target.codexbaseid)||(target.id);
        else return target.id;};

    function getHead(target){
        /* First, find some relevant docinfo */
        var targetid=(target.codexbaseid)||(target.id);
        if ((targetid)&&(Codex.docinfo[targetid]))
            target=Codex.docinfo[targetid];
        else if (targetid) {
            while (target)
                if ((target.id)&&(Codex.docinfo[targetid])) {
                    target=Codex.docinfo[targetid]; break;}
            else target=target.parentNode;}
        else {
            /* First, try scanning forward to find a non-empty node */
            var scan=target.firstChild; var scanid=false;
            var next=target.nextNode;
            while ((scan)&&(scan!=next)) {
                if ((scan.id)||(scan.codexbaseid)) break;
                if ((scan.nodeType===3)&&
                    (!(fdjtString.isEmpty(scan.nodeValue)))) break;
                scan=fdjtDOM.forward(scan);}
            /* If you found something, use it */
            if ((scan)&&(scan.id)&&(scan!=next))
                target=Codex.docinfo[scanid];
            else {
                while (target)
                    if ((targetid=((target.codexbaseid)||(target.id)))&&
                        (Codex.docinfo[targetid])) {
                        target=Codex.docinfo[targetid]; break;}
                else target=target.parentNode;}}
        if (target) {
            if (target.level)
                return document.getElementById(target.frag);
            else if (target.head)
                return document.getElementById(target.head.frag);
            else return false;}
        else return false;}
    Codex.getHead=getHead;

    Codex.getRef=function(target){
        while (target)
            if (target.about) break;
        else if ((target.getAttribute)&&(target.getAttribute("about"))) break;
        else target=target.parentNode;
        if (target) {
            var ref=((target.about)||(target.getAttribute("about")));
            if (!(target.about)) target.about=ref;
            if (ref[0]==='#')
                return document.getElementById(ref.slice(1));
            else return document.getElementById(ref);}
        else return false;}
    Codex.getRefElt=function(target){
        while (target)
            if ((target.about)||
                ((target.getAttribute)&&(target.getAttribute("about"))))
                break;
        else target=target.parentNode;
        return target||false;}

    Codex.checkTarget=function(){
        if ((Codex.target)&&(Codex.mode==='glosses'))
            if (!(fdjtDOM.isVisible(Codex.target))) {
                Codex.setMode(false); Codex.setMode(true);}};

    function getDups(id){
        if (!(id)) return false;
        else if (typeof id === "string") {
            if ((Codex.layout)&&(Codex.layout.dups)) {
                var dups=Codex.layout.dups;
                var d=dups[id];
                if (d) return [document.getElementById(id)].concat(d);
                else return [document.getElementById(id)];}
            else return [document.getElementById(id)];}
        else return getDups(id.codexbaseid||id.id);}
    Codex.getDups=getDups;

    function getTarget(scan,closest){
        scan=((scan.nodeType)?(scan):(scan.target||scan.srcElement||scan));
        var target=false, lowest=false; var low_off=false;
        var id=false;
        var prefix=Codex.baseid;
        while (scan) {
            if (scan.codexui) return false;
            else if (scan===Codex.docroot) return target;
            else if (scan===document.body) return target;
            else if ((id=(scan.id||scan.codexbaseid))&&(Codex.docinfo[id])) {
                if (id.search("CODEXTMP")===0) {}
                else if (hasParent(scan,Codex.HUD)) return false;
                else if (hasParent(scan,".codexmargin")) return false;
                else if ((hasClass(scan,"sbooknofocus"))||
                         ((Codex.nofocus)&&(Codex.nofocus.match(scan)))) {}
                else if ((hasClass(scan,"sbookfocus"))||
                         ((Codex.focus)&&(Codex.focus.match(scan))))
                    return scan;
                else if (closest) return scan;
                else if ((target)&&(!(fdjt.DOM.isVisible(scan))))
                    return target;
                else target=scan;}
            else {}
            scan=scan.parentNode;}
        return target;}
    Codex.getTarget=getTarget;
    
    var isEmpty=fdjtString.isEmpty;

    function notEmpty(arg){
        if (typeof arg === 'string') {
            if (isEmpty(arg)) return false;
            else return arg;}
        else return false;}

    Codex.getTitle=function(target,tryhard) {
        var targetid;
        return target.sbooktitle||
            (((targetid=((target.codexbaseid)||(target.id)))&&
              (Codex.docinfo[targetid]))?
             (notEmpty(Codex.docinfo[targetid].title)):
             (notEmpty(target.title)))||
            ((tryhard)&&
             (fdjtDOM.textify(target)).
             replace(/\n(\s*\n)+/g,"\n").
             replace(/^\n+/,"").
             replace(/\n+$/,"").
             replace(/\n+/g," // ").
             replace(/^\s*\/\//,""));};

    function getinfo(arg){
        if (arg) {
            if (typeof arg === 'string')
                return (Codex.docinfo[arg]||
                        Codex.glossdb.probe(arg)||
                        RefDB.ref(arg));
            else if (arg._id) return arg;
            else if (arg.codexbaseid)
                return Codex.docinfo[arg.codexbaseid];
            else if (arg.id) return Codex.docinfo[arg.id];
            else return false;}
        else return false;}
    Codex.Info=getinfo;

    /* Navigation functions */

    function setHead(head){
        if (!(head)) {
            if (Codex.mode==="tocscan") Codex.setMode(false);
            return;}
        else if (typeof head === "string") 
            head=getHead(fdjtID(head))||Codex.content;
        else {}
        var headid=head.codexbaseid||head.id;
        var headinfo=Codex.docinfo[headid];
        while ((headinfo)&&(!(headinfo.level))) {
            headinfo=headinfo.head;
            headid=headinfo.frag;
            head=document.getElementById(headid);}
        if (Codex.Trace.nav)
            fdjtLog("Codex.setHead #%s",headid);
        if (head===Codex.head) {
            if (Codex.Trace.focus) fdjtLog("Redundant SetHead");
            return;}
        else if (headinfo) {
            if (Codex.Trace.focus)
                Codex.trace("Codex.setHead",head);
            Codex.TOC.setHead(headinfo);
            window.title=headinfo.title+" ("+document.title+")";
            if (Codex.head) dropClass(Codex.head,"sbookhead");
            addClass(head,"sbookhead");
            Codex.setLocation(Codex.location);
            Codex.head=fdjtID(headid);
            Codex.TOC.setHead(headinfo);}
        else {
            if (Codex.Trace.focus)
                Codex.trace("Codex.setFalseHead",head);
            Codex.TOC.setHead(headinfo);
            Codex.head=false;}}
    Codex.setHead=setHead;

    function setLocation(location,force){
        if ((!(force)) && (Codex.location===location)) return;
        if (Codex.Trace.toc)
            fdjtLog("Setting location to %o",location);
        var info=Codex.Info(Codex.head);
        while (info) {
            var tocelt=document.getElementById("CODEXTOC4"+info.frag);
            var flytocelt=document.getElementById("CODEXFLYTOC4"+info.frag);
            var start=info.starts_at; var end=info.ends_at;
            var progress=((location-start)*100)/(end-start);
            var bar=false, appbar=false;
            if (tocelt) {
                bar=fdjtDOM.getFirstChild(tocelt,".progressbar");
                tocelt.title=Math.round(progress)+"%";}
            if (flytocelt) {
                appbar=fdjtDOM.getFirstChild(flytocelt,".progressbar");
                flytocelt.title=Math.round(progress)+"%";}
            if (Codex.Trace.toc)
                fdjtLog("For tocbar %o/%o loc=%o start=%o end=%o progress=%o",
                        bar,appbar,location,start,end,progress);
            if ((progress>=0) && (progress<=100)) {
                if (bar) bar.style.width=(progress)+"%";
                if (appbar) appbar.style.width=(progress)+"%";}
            info=info.head;}
        var spanbars=fdjtDOM.$(".spanbar");
        var i=0; while (i<spanbars.length) {
            var spanbar=spanbars[i++];
            var width=spanbar.ends-spanbar.starts;
            var ratio=(location-spanbar.starts)/width;
            if (Codex.Trace.toc)
                fdjtLog("ratio for spanbar %o[%d] is %o [%o,%o,%o]",
                        spanbar,spanbar.childNodes[0].childNodes.length,
                        ratio,spanbar.starts,location,spanbar.ends);
            if ((ratio>=0) && (ratio<=1)) {
                var progressbox=fdjtDOM.$(".progressbox",spanbar);
                if (progressbox.length>0) {
                    progressbox[0].style.left=((Math.round(ratio*10000))/100)+"%";}}}
        Codex.location=location;}
    Codex.setLocation=setLocation;

    function location2pct(location) {
        var max_loc=Codex.ends_at;
        var pct=(100*location)/max_loc;
        // This is (very roughly) intended to be the precision needed
        //  for line level (40 character) accuracy.
        var prec=Math.round(Math.log(max_loc/40)/Math.log(10))-2;
        if (prec<0) prec=0;
        return fdjtString.precString(pct,prec)+"%";}
    Codex.location2pct=location2pct;

    function setTarget(target){
        if (Codex.Trace.focus) Codex.trace("Codex.setTarget",target);
        if (target===Codex.target) return;
        else if ((Codex.target)&&
                 (Codex.target.id===target.codexbaseid))
            return;
        if (Codex.target) {
            var old_target=Codex.target, oldid=old_target.id;
            var old_targets=getDups(oldid);
            dropClass(old_target,"codextarget");
            dropClass(old_target,"codexnewtarget");
            dropClass(old_targets,"codextarget");
            dropClass(old_targets,"codexnewtarget");
            clearHighlights(old_targets);
            Codex.target=false;}
        if (!(target)) {
            if (Codex.UI.setTarget) Codex.UI.setTarget(false);
            return;}
        else if ((inUI(target))||(!(target.id||target.codexbaseid)))
            return;
        else {}
        var targetid=target.codexbaseid||target.id;
        var primary=((targetid)&&(fdjtID(targetid)))||target;
        var targets=getDups(targetid);
        addClass(targets,"codextarget");
        addClass(targets,"codexnewtarget");
        setTimeout(function(){
            dropClass(targets,"codexnewtarget");},
                   5000);
        fdjtState.setCookie(
            "codextarget",targetid||target.getAttribute('data-sbookid'));
        Codex.target=primary;
        if (Codex.UI.setTarget) Codex.UI.setTarget(primary);
        if (Codex.search_cloud)
            Codex.setCloudCuesFromTarget(Codex.search_cloud,primary);}
    Codex.setTarget=setTarget;

    function clearHighlights(target){
        if (typeof target === "string") target=fdjtID(target);
        if (!(target)) return;
        else if (target.length) {
            dropClass(target,"codexhighlightpassage");
            var i=0, lim=target.length;
            while (i<lim) {
                var node=target[i++];
                fdjtUI.Highlight.clear(node,"codexhighlightexcerpt");
                fdjtUI.Highlight.clear(node,"codexhighlightsearch");}}
        else {
            dropClass(target,"codexhighlightpassage");
            fdjtUI.Highlight.clear(target,"codexhighlightexcerpt");
            fdjtUI.Highlight.clear(target,"codexhighlightsearch");}}
    Codex.clearHighlights=clearHighlights;

    function findExcerpt(node,excerpt,off){
        if (typeof node === "string") node=document.getElementById(node);
        if (!(node)) return false;
        if (node.nodeType) node=getDups(node);
        var found=fdjtDOM.findString(node,excerpt,off||0);
        if (found) return found;
        var trimmed=fdjtString.trim(excerpt);
        var regex_string=trimmed.replace(/\s+/g,"(\\s+)");
        var pattern=new RegExp("(\\s*)"+regex_string+"(\\s*)","g");
        var matches=fdjtDOM.findMatches(node,pattern,off||0,1);
        if ((matches)&&(matches.length)) return matches[0];
        // We could do this more intelligently
        if (off>7) matches=fdjtDOM.findMatches(node,pattern,off-7,1);
        if ((matches)&&(matches.length)) return matches[0];
        else return false;}
    Codex.findExcerpt=findExcerpt;

    /* Tags */

    function parseTag(tag,kno){
        var slot="tags"; var usekno=kno||Codex.knodule;
        if (tag[0]==="~") {
            slot="~tags"; tag=tag.slice(1);}
        else if ((tag[0]==="*")&&(tag[1]==="*")) {
            slot="**tags"; tag=tag.slice(2);}
        else if (tag[0]==="*") {
            slot="*tags"; tag=tag.slice(1);}
        else {}
        var knode=((tag.indexOf('|')>=0)?
                   (usekno.handleSubjectEntry(tag)):
                   (slot==="~tags")?
                   (((kno)&&(kno.probe(tag)))||(tag)):
                   (usekno.handleSubjectEntry(tag)));
        if (slot!=="tags") return {slot: slot,tag: knode};
        else return knode;}
    Codex.parseTag=parseTag;
    function addTag(item,tag,kno,slot){
        if (!(slot)) slot="tags";
        var usekno=kno||Codex.knodule;
        if (tag[0]==="~") {
            slot="~"+slot; tag=tag.slice(1);}
        else if ((tag[0]==="*")&&(tag[1]==="*")) {
            slot="**"+slot; tag=tag.slice(2);}
        else if (tag[0]==="*") {
            slot="*"+slot; tag=tag.slice(1);}
        else {}
        var knode=((tag instanceof Ref)?(tag):
                   ((tag.indexOf('|')>=0)?
                    (usekno.handleSubjectEntry(tag)):
                    (slot[0]==="~")?
                    (((kno)&&(kno.probe(tag)))||(tag)):
                    (usekno.handleSubjectEntry(tag))));
        item.add(slot,knode);
        if (knode.allways) {
            var allways=knode.allways;
            var i=0, lim=allways.length;
            while (i<lim) item.add(slot+"*",allways[i++]);}
        return knode;}
    Codex.addTag=addTag;

    /* Navigation */

    function resizeBody(){
        if (Codex.nativescroll) {}
        else {
            /*
            var curx=x_offset-fdjtDOM.parsePX(Codex.pages.style.left);
            var cury=y_offset-fdjtDOM.parsePX(Codex.pages.style.top);
            // Codex.body.style.left=''; Codex.body.style.top='';
            var geom=fdjtDOM.getGeometry(Codex.body,Codex.body);
            x_offset=geom.left; y_offset=geom.top;
            Codex.bodyoff=[x_offset,y_offset];
            Codex.pages.style.left='0px';
            Codex.pages.style.top=(y_offset)+'px';
            */
        }}
    Codex.resizeBody=resizeBody;

    Codex.viewTop=function(){
        if (Codex.nativescroll) return fdjtDOM.viewTop();
        else return -(fdjtDOM.parsePX(Codex.pages.style.top));}
    var sbookUIclasses=
        /(\bhud\b)|(\bglossmark\b)|(\bleading\b)|(\bcodexmargin\b)/;

    function inUI(elt){
        if (elt.codexui) return true;
        else if (hasParent(elt,Codex.HUD)) return true;
        else while (elt)
            if (elt.codexui) return true;
        else if (hasClass(elt,sbookUIclasses)) return true;
        else elt=elt.parentNode;
        return false;}

    function displayOffset(){
        var toc;
        if (Codex.mode)
            if (toc=fdjtID("CODEXTOC"))
                return -((toc.offsetHeight||50)+15);
        else return -60;
        else return -40;}

    function setHashID(target){
        var targetid=target.codexbaseid||target.id;
        if ((!(targetid))||(window.location.hash===targetid)||
            ((window.location.hash[0]==='#')&&
             (window.location.hash.slice(1)===targetid)))
            return;
        if ((target===Codex.body)||(target===document.body)) return;
        window.location.hash=targetid;}
    Codex.setHashID=setHashID;

    var syncing=false;
    
    function setState(state){
        if ((Codex.state===state)||
            ((Codex.state)&&
             (Codex.state.target===state.target)&&
             (Codex.state.location===state.location)&&
             (Codex.state.page===state.page)))
            return;
        if (syncing) return;
        if (!(Codex.dosync)) return;
        if (!(state.tstamp)) state.tstamp=fdjtTime.tick();
        if (!(state.refuri)) state.refuri=Codex.refuri;
        Codex.state=state;
        if (Codex.Trace.state) fdjtLog("Setting state to %j",state);
        var statestring=JSON.stringify(state);
        var uri=Codex.docuri||Codex.refuri;
        fdjtState.setLocal("state("+uri+")",statestring);}
    Codex.setState=setState;
    
    function setConnected(val){
        if ((val)&&(!(Codex.connected))) {
            var onconnect=Codex._onconnect;
            Codex._onconnect=false;
            if ((onconnect)&&(onconnect.length)) {
                var i=0; var lim=onconnect.length;
                while (i<lim) (onconnect[i++])();}
            if (fdjtState.getLocal("queued("+Codex.refuri+")"))
                Codex.writeQueuedGlosses();}
        if (((val)&&(!(Codex.connected)))||
            ((!(val))&&(Codex.connected)))
            fdjtDOM.swapClass(document.body,/\bcx(CONN|DISCONN)\b/,
                              ((val)?("cxCONN"):("cxDISCONN")));
        Codex.connected=val;}
    Codex.setConnected=setConnected;

    function serverSync(){
        if ((Codex.user)&&(Codex.dosync)&&(navigator.onLine)) {
            var state=Codex.state; var synced=Codex.syncstate;
            // Warning when syncing doesn't return?
            if (syncing) return;
            if (!(state)) {
                var uri=Codex.docuri||Codex.refuri;
                var statestring=fdjtState.getLocal("state("+uri+")");
                if (statestring) Codex.state=state=JSON.parse(statestring);
                else state={};}
            if ((synced)&&
                (synced.target===state.target)&&
                (synced.location===state.location)&&
                (synced.page===state.page))
                return;
            var refuri=((Codex.target)&&(Codex.getRefURI(Codex.target)))||
                (Codex.refuri);
            var uri="https://"+Codex.server+"/v1/sync?ACTION=save"+
                "&DOCURI="+encodeURIComponent(Codex.docuri)+
                "&REFURI="+encodeURIComponent(refuri);
            if (Codex.user)
                uri=uri+"&SYNCUSER="+encodeURIComponent(Codex.user._id);
            if (Codex.deviceName)
                uri=uri+"&devicename="+encodeURIComponent(Codex.deviceName);
            if (state.target) uri=uri+"&target="+encodeURIComponent(state.target);
            if ((state.location)||(state.hasOwnProperty('location')))
                uri=uri+"&location="+encodeURIComponent(state.location);
            if (Codex.ends_at)
                uri=uri+"&maxloc="+encodeURIComponent(Codex.ends_at);
            if ((state.page)||(state.hasOwnProperty('page')))
                uri=uri+"&page="+encodeURIComponent(state.page);
            if (typeof Codex.pagecount === 'number')
                uri=uri+"&maxpage="+encodeURIComponent(Codex.pagecount);
            if ((Codex.Trace.dosync)||(Codex.Trace.state))
                fdjtLog("syncState(call) %s: %j",uri,state);
            var req=new XMLHttpRequest();
            syncing=state;
            req.onreadystatechange=function(evt){
                if ((req.readyState===4)&&(req.status>=200)&&(req.status<300)) {
                    Codex.syncstate=syncing;
                    setConnected(true);
                    syncing=false;}
                else if ((req.readyState===4)&&(navigator.onLine))
                    setConnected(false);
                else {}
                if ((Codex.Trace.dosync)||(Codex.Trace.state))
                    fdjtLog("serverSync(callback) %o ready=%o status=%o %j",
                            evt,req.readyState,req.status,syncing);};
            req.withCredentials=true;
            try {
                req.open("GET",uri,true);
                req.send();}
            catch (ex) {Codex.dosync=false;}}}
    Codex.serverSync=serverSync;

    function forceSync(){
        if (Codex.connected) Codex.update();
        else if (Codex._onconnect)
            Codex._onconnect.push(function(){Codex.update();});
        else Codex._onconnect=[function(){Codex.update();}];
        if (!(Codex.syncstart)) Codex.syncLocation();
        else serverSync();}
    Codex.forceSync=forceSync;

    function getLocInfo(elt){
        var eltid=false;
        var counter=0; var lim=200;
        var forward=fdjtDOM.forward;
        while ((elt)&&(counter<lim)) {
            eltid=elt.codexbaseid||elt.id;
            if ((eltid)&&(Codex.docinfo[eltid])) break;
            else {counter++; elt=forward(elt);}}
        if ((eltid)&&(Codex.docinfo[eltid])) {
            var info=Codex.docinfo[eltid];
            return {start: info.starts_at,end: info.ends_at,
                    len: info.ends_at-info.starts_at};}
        else return false;}
    Codex.getLocInfo=getLocInfo;

    function resolveLocation(loc){
        var allinfo=Codex.docinfo._allinfo;
        var i=0; var lim=allinfo.length;
        while (i<lim) {
            if (allinfo[i].starts_at<loc) i++;
            else break;}
        while (i<lim)  {
            if (allinfo[i].starts_at>loc) break;
            else i++;}
        return fdjtID(allinfo[i-1].frag);}
    Codex.resolveLocation=resolveLocation;

    // This moves within the document in a persistent way
    function CodexGoTo(arg,caller,istarget,pushstate){
        if (typeof istarget === 'undefined') istarget=true;
        if (typeof pushstate === 'undefined') pushstate=true;
        var target; var location;
        if (typeof arg === 'string') {
            target=document.getElementById(arg);
            var info=getLocInfo(target);
            location=info.start;}
        else if (typeof arg === 'number') {
            location=arg;
            target=(((istarget.nodeType)&&(istarget.id))?(istarget):
                    (resolveLocation(arg)));}
        else if (arg.nodeType) {
            var info=getLocInfo(arg);
            if (arg.id) target=arg;
            else if (arg.codexbaseid) target=arg;
            else target=getTarget(arg);
            location=info.start;}
        else {
            fdjtLog.warn("Bad CodexGoTo %o",arg);
            return;}
        if (!(target)) {
            if (Codex.layout instanceof fdjt.CodexLayout)
                Codex.GoToPage(arg,caller,pushstate);
            else if (arg.nodeType) {
                var scan=arg;
                while (scan) {
                    if (scan.offsetTop) break;
                    else scan=scan.parentNode;}
                if (scan) Codex.content.style.offsetTop=-(scan.offsetTop);}
            else {}
            return;}
        var page=((Codex.bypage)&&(Codex.layout)&&
                  (Codex.pagecount)&&(Codex.getPage(target)));
        var targetid=target.codexbaseid||target.id;
        var info=((targetid)&&(Codex.docinfo[targetid]));
        if (Codex.Trace.nav)
            fdjtLog("Codex.GoTo%s() #%o@P%o/L%o %o",
                    ((caller)?("/"+caller):""),targetid,page,
                    ((info)&&(info.starts_at)),target);
        if (info) Codex.point=target;
        setHead(target);
        setLocation(location);
        if ((istarget)&&(targetid)&&(!(inUI(target)))) setTarget(target);
        if ((pushstate)&&(istarget))
            Codex.setState({
                target: ((Codex.target)&&(Codex.targetid)),
                location: location,page: page});
        else if (pushstate)
            Codex.setState({location: location,page: page});
        else {}
        if (page)
            Codex.GoToPage(target,caller||"CodexGoTo",false);
        else {
            if (Codex.previewing)
                Codex.stopPreview(((caller)?("goto/"+caller):("goto")));
            var offinfo=fdjtDOM.getGeometry(target,Codex.content);
            var use_top=offinfo.top-((fdjtDOM.viewHeight()-50)/2);
            if (use_top<0) use_top=0;
            window.scrollTo(0,use_top);}
        Codex.location=location;}
    Codex.GoTo=CodexGoTo;

    function anchorFn(evt){
        var target=fdjtUI.T(evt);
        while (target)
            if (target.href) break; else target=target.parentNode;
        if ((target)&&(target.href)&&(target.href[0]==='#')) {
            var elt=document.getElementById(target.href.slice(1));
            if (elt) {CodexGoTo(elt,"anchorFn"); fdjtUI.cancel(evt);}}}
    Codex.anchorFn=anchorFn;

    // This jumps and disables the HUD at the same time
    function CodexJumpTo(target){
        if (Codex.hudup) Codex.setMode(false);
        CodexGoTo(target,"JumpTo");}
    Codex.JumpTo=CodexJumpTo;

    // This jumps and disables the HUD at the same time
    // We try to animate the transition
    function CodexScanTo(target){
        if (Codex.hudup) { // Figure out what mode to go to
            var headinfo=Codex.docinfo[target]||Codex.docinfo[target.id];
            if ((headinfo)&&((!(headinfo.sub))||(headinfo.sub.length===0)))
                Codex.setMode("tocscan");}
        CodexGoTo(target,"CodexScanTo");}
    Codex.ScanTo=CodexScanTo;

    // Preview functions
    var oldscroll=false; var oldsect=false;
    function CodexStartPreview(spec,caller){
        var target=((spec.nodeType)?(spec):(fdjtID(spec)));
        if (Codex.Trace.flips)
            fdjtLog("startPreview %o (%s)",target,caller);
        if (Codex.layout instanceof fdjt.CodexLayout) 
            Codex.startPagePreview(spec,caller);
        else {
            // This is the scrolling-based version
            var yoff=window.scrollTop||0;
            if (!(oldscroll)) oldscroll={x: 0,y: yoff};
            var offinfo=fdjtDOM.getGeometry(target,Codex.content);
            if (Codex.Trace.flips)
                fdjtLog("startPreview/%s to %d for %o",
                        caller||"nocaller",offinfo.top-100,spec);
            // Codex.content.style.top=(-offinfo.top)+"px";
            var use_top=offinfo.top-((fdjtDOM.viewHeight()-50)/2);
            if (use_top<0) use_top=0;
            window.scrollTo(0,use_top);
            Codex.previewing=target;}
        if (Codex.previewTarget) {
            var drop=Codex.getDups(Codex.previewTarget);
            dropClass(drop,"codexpreviewtarget");}
        Codex.previewTarget=target;
        addClass(document.body,"cxPREVIEW");
        var dups=Codex.getDups(target);
        addClass(dups,"codexpreviewtarget");
        return target;}
    Codex.startPreview=CodexStartPreview;
    function CodexStopPreview(caller){
        if (Codex.bypage) 
            Codex.stopPagePreview(caller);
        else {
            if ((Codex.Trace.flips)&&(oldscroll))
                fdjtLog("stopPreview/%s returning to %d",
                        caller||"nocaller",oldscroll.x,oldscroll.y);
            else if (Codex.Trace.flips)
                fdjtLog("stopPreview/%s, no saved position",
                        caller||"nocaller");
            // if (oldscroll) Codex.content.style.top=oldscroll.y+"px";
            window.scrollTo(0,oldscroll.y);}
        dropClass(document.body,"cxPREVIEW");
        Codex.previewing=false;
        if (Codex.previewTarget) {
            var targets=getDups(Codex.previewTarget);
            dropClass(targets,"codexpreviewtarget");
            dropClass(targets,"codexhighlightpassage");
            Codex.clearHighlights(targets);
            Codex.previewTarget=false;}
        oldscroll=false;}
    Codex.stopPreview=CodexStopPreview;

    function getLevel(elt){
        if (elt.toclevel) {
            if (elt.toclevel==='none')
                return elt.toclevel=false;
            else return elt.toclevel;}
        var attrval=
            ((elt.getAttributeNS)&&
             (elt.getAttributeNS('toclevel','http://sbooks.net')))||
            (elt.getAttribute('toclevel'))||
            (elt.getAttribute('data-toclevel'));
        if (attrval) {
            if (attrval==='none') return false;
            else return parseInt(attrval);}
        if (elt.className) {
            var cname=elt.className;
            if (cname.search(/\bsbooknotoc\b/)>=0) return 0;
            if (cname.search(/\bsbookignore\b/)>=0) return 0;
            var tocloc=cname.search(/\bsbook\d+head\b/);
            if (tocloc>=0)
                return parseInt(cname.slice(tocloc+5));}
        if ((Codex.notoc)&&(Codex.notoc.match(elt))) return 0;
        if ((Codex.ignore)&&(Codex.ignore.match(elt))) return 0;
        if ((elt.tagName==='HGROUP')||(elt.tagName==='HEADER'))
            return getFirstTocLevel(elt,true);
        if (elt.tagName.search(/H\d/)==0)
            return parseInt(elt.tagName.slice(1,2));
        else return false;}

    function getFirstTocLevel(node,notself){
        if (node.nodeType!==1) return false;
        var level=((!(notself))&&(getLevel(node)));
        if (level) return level;
        var children=node.childNodes;
        var i=0; var lim=children.length;
        while (i<lim) {
            var child=children[i++];
            if (child.nodeType!==1) continue;
            level=getFirstTocLevel(child);
            if (level) return level;}
        return false;}

    Codex.getTOCLevel=getLevel;
    
    function getCover(){
        if (Codex.cover) return Codex.cover;
        var cover=fdjtID("CODEXCOVERPAGE")||
            fdjtID("SBOOKCOVERPAGE")||
            fdjtID("COVERPAGE");
        if (cover) {}
        else if (Codex.coverpage) {
            cover=fdjtDOM.Image(
                Codex.coverpage,"img.codexfullpage.codexcoverpage.sbookpage#CODEXCOVERPAGE");
            fdjtDOM.prepend(Codex.content,cover);}
        // This should generate a textual cover page
        else if ((!(fdjt.ID("CODEXTITLEPAGE")))&&
                 (!(fdjt.ID("SBOOKTITLEPAGE")))) {
            cover=fdjtDOM("div.codexcoverpage.codexfullpage#CODEXCOVERPAGE","\n",
                          ((Codex.booktitle)?
                           (fdjtDOM("h1.title",Codex.booktitle)):
                           null),
                          "\n",
                          ((Codex.bookauthor)?
                           (fdjtDOM("h1.author",Codex.bookauthor)):
                           null));
            fdjtDOM.prepend(Codex.content,cover);}
        if (cover) Codex.cover=cover;
        return cover;}
    Codex.getCover=getCover;

})();

/* Adding qricons */

/*
  function sbookAddQRIcons(){
  var i=0;
  while (i<Codex.heads.length) {
  var head=Codex.heads[i++];
  var id=head.id;
  var title=(head.sbookinfo)&&sbook_get_titlepath(head.sbookinfo);
  var qrhref="https://"+Codex.server+"/glosses/qricon.png?"+
  "URI="+encodeURIComponent(Codex.docuri||Codex.refuri)+
  ((id)?("&FRAG="+head.id):"")+
  ((title) ? ("&TITLE="+encodeURIComponent(title)) : "");
  var qricon=fdjtDOM.Image(qrhref,".sbookqricon");
  fdjtDOM.prepend(head,qricon);}}
*/

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
