/* -*- Mode: Javascript; Character-encoding: utf-8; -*- */

/* ###################### codex/hud.js ###################### */

/* Copyright (C) 2009-2014 beingmeta, inc.

   This file provides initialization and some interaction for the
   Codex HUD (Heads Up Display), an layer on the book content
   provided by the Codex e-reader web application.

   This file is part of Codex, a Javascript/DHTML web application for reading
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
/* jshint browser: true */
/* global Codex: false */

/* Initialize these here, even though they should always be
   initialized before hand.  This will cause various code checkers to
   not generate unbound variable warnings when called on individual
   files. */
// var fdjt=((typeof fdjt !== "undefined")?(fdjt):({}));
// var Codex=((typeof Codex !== "undefined")?(Codex):({}));
// var Knodule=((typeof Knodule !== "undefined")?(Knodule):({}));
// var iScroll=((typeof iScroll !== "undefined")?(iScroll):({}));

Codex.setMode=
    (function(){
        "use strict";
        var fdjtString=fdjt.String;
        var fdjtTime=fdjt.Time;
        var fdjtState=fdjt.State;
        var fdjtLog=fdjt.Log;
        var fdjtDOM=fdjt.DOM;
        var fdjtUI=fdjt.UI;
        var fdjtID=fdjt.ID;
        var TapHold=fdjtUI.TapHold;
        var cxID=Codex.ID;
        
        // Helpful dimensions
        // Whether to call displaySync on mode changes
        var display_sync=false;
        
        var addClass=fdjtDOM.addClass;
        var dropClass=fdjtDOM.dropClass;
        var hasClass=fdjtDOM.hasClass;
        var getParent=fdjtDOM.getParent;
        var hasSuffix=fdjtString.hasSuffix;

        var fixStaticRefs=Codex.fixStaticRefs;

        var CodexHUD=false;
        var CodexMedia=false;

        // This will contain the interactive input console (for debugging)
        var frame=false, hud=false, media=false;
        var allglosses=false, sbooksapp=false;

        function initHUD(){
            if (fdjtID("CODEXHUD")) return;
            var started=fdjtTime();
            var messages=fdjtDOM("div#CODEXSTARTUPMESSAGES.startupmessages");
            messages.innerHTML=fixStaticRefs(Codex.HTML.messages);
            if (Codex.Trace.startup>2) fdjtLog("Initializing HUD layout");
            Codex.HUD=CodexHUD=hud=fdjtDOM("div#CODEXHUD");
            Codex.Media=CodexMedia=media=fdjtDOM("div#CODEXMEDIA");
            hud.codexui=true; media.codexui=true;
            hud.innerHTML=fixStaticRefs(Codex.HTML.hud);
            fdjtDOM.append(messages);
            if (fdjtID("CODEXFRAME")) frame=fdjtID("CODEXFRAME");
            else {
                frame=fdjtDOM("#CODEXFRAME");
                fdjtDOM.prepend(document.body,frame);}
            frame.appendChild(messages); frame.appendChild(hud);
            frame.appendChild(media);
            Codex.Frame=frame;
            // Fill in the HUD help
            var hudhelp=fdjtID("CODEXHUDHELP");
            hudhelp.innerHTML=fixStaticRefs(Codex.HTML.hudhelp);
            // Fill in the HUD help
            var helptext=fdjtID("CODEXAPPHELP");
            helptext.innerHTML=fixStaticRefs(Codex.HTML.help);
            // Setup heart
            var heart=fdjtID("CODEXHEART");
            heart.innerHTML=fixStaticRefs(Codex.HTML.heart);
            Codex.DOM.heart=heart;
            // Other HUD parts
            Codex.DOM.top=fdjtID("CODEXTOP");
            Codex.DOM.heart=fdjtID("CODEXHEART");
            Codex.DOM.head=fdjtID("CODEXHEAD");
            Codex.DOM.foot=fdjtID("CODEXFOOT");
            Codex.DOM.tabs=fdjtID("CODEXTABS");

            Codex.DOM.noteshud=fdjtID("CODEXNOTETEXT");
            Codex.DOM.asidehud=fdjtID("CODEXASIDE");

            // Initialize the pagebar
            Codex.DOM.pagebar=fdjtID("CODEXPAGEBAR");
            
            // Initialize search UI
            var search=fdjtID("CODEXSEARCH");
            search.innerHTML=fixStaticRefs(Codex.HTML.searchbox);
            addClass(Codex.HUD,"emptysearch");

            // Setup addgloss prototype
            var addgloss=fdjtID("CODEXADDGLOSSPROTOTYPE");
            addgloss.innerHTML=fixStaticRefs(Codex.HTML.addgloss);

            Codex.UI.addHandlers(hud,"hud");

            if (Codex.Trace.startup>2) fdjtLog("Done with HUD initialization");

            if (!(Codex.svg)) {
                var images=fdjtDOM.getChildren(hud,"img");
                var i=0; var lim=images.length;
                if (Codex.Trace.startup) fdjtLog("Switching images to SVG");
                while (i<lim) {
                    var img=images[i++];
                    if ((img.src)&&
                        ((hasSuffix(img.src,".svg"))||
                         (hasSuffix(img.src,".svgz")))&&
                        (img.getAttribute('bmp')))
                        img.src=img.getAttribute('bmp');}}

            Codex.hudtick=fdjtTime();

            fdjtDOM.setInputs(".codexrefuri",Codex.refuri);
            fdjtDOM.setInputs(".codexdocuri",Codex.docuri);
            fdjtDOM.setInputs(".codextopuri",Codex.topuri);
            
            // Initialize gloss UI
            Codex.DOM.allglosses=fdjtID("CODEXALLGLOSSES");
            if ((Codex.Trace.startup>2)&&(Codex.DOM.allglosses))
                fdjtLog("Setting up gloss UI %o",allglosses);

            Codex.glosses=allglosses=new Codex.Slice(Codex.DOM.allglosses);
            Codex.glossdb.onAdd("maker",function(f,p,v){
                Codex.sourcedb.ref(v).oninit
                (Codex.UI.addGlossSource,"newsource");});
            Codex.glossdb.onAdd("sources",function(f,p,v){
                Codex.sourcedb.ref(v).oninit
                (Codex.UI.addGlossSource,"newsource");});
            Codex.glossdb.onLoad(addGloss2UI);
            
            function messageHandler(evt){
                var origin=evt.origin;
                if (Codex.Trace.messages)
                    fdjtLog("Got a message from %s with payload %s",
                            origin,evt.data);
                if (origin.search(/https:\/\/[^\/]+.sbooks.net/)!==0) {
                    fdjtLog.warn("Rejecting insecure message from %s",
                                 origin);
                    return;}
                if (evt.data==="sbooksapp") {
                    setMode("sbooksapp");}
                else if (evt.data==="loggedin") {
                    if (!(Codex.user)) {
                        Codex.userSetup();}}
                else if (evt.data.search("setuser=")===0) {
                    if (!(Codex.user)) {
                        Codex.userinfo=JSON.parse(evt.data.slice(8));
                        Codex.loginUser(Codex.userinfo);
                        Codex.setMode("welcome");
                        Codex.userSetup();}}
                else if (evt.data)
                    fdjtDOM("CODEXINTRO",evt.data);
                else {}}
            var appframe=sbooksapp;
            var appwindow=((appframe)&&(appframe.contentWindow));
            if (appwindow.postMessage) {
                if (Codex.Trace.messages)
                    fdjtLog("Setting up message listener");
                fdjtDOM.addListener(window,"message",messageHandler);}
            
            Codex.TapHold.foot=
                new fdjtUI.TapHold(
                    Codex.DOM.foot,
                    {override: true,holdfast: true,taptapthresh: 0,
                     holdthresh: 500});
            Codex.TapHold.head=
                new fdjtUI.TapHold(Codex.DOM.head,
                                   {override: true,taptapthresh: 0});
            Codex.DOM.skimmer=fdjtID("CODEXSKIMMER");
            Codex.TapHold.skimmer=new TapHold(Codex.DOM.skimmer);
            
            var help=Codex.DOM.help=fdjtID("CODEXHELP");
            help.innerHTML=fixStaticRefs(Codex.HTML.help);

            resizeHUD();

            Codex.scrollers={};

            /* Setup clouds */
            var dom_gloss_cloud=fdjtID("CODEXGLOSSCLOUD");
            Codex.gloss_cloud=
                new fdjtUI.Completions(
                    dom_gloss_cloud,fdjtID("CODEXTAGINPUT"),
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            updateScroller("CODEXGLOSSCLOUD");
            Codex.TapHold.gloss_cloud=new TapHold(Codex.gloss_cloud.dom);

            Codex.empty_cloud=
                new fdjtUI.Completions(
                    fdjtID("CODEXALLTAGS"),false,
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            if (Codex.adjustCloudFont)
                Codex.empty_cloud.updated=function(){
                    Codex.adjustCloudFont(this);};
            Codex.DOM.empty_cloud=fdjtID("CODEXALLTAGS");
            updateScroller("CODEXALLTAGS");
            Codex.TapHold.empty_cloud=new TapHold(Codex.empty_cloud.dom);
            
            var dom_share_cloud=fdjtID("CODEXSHARECLOUD");
            Codex.share_cloud=
                new fdjtUI.Completions(
                    dom_share_cloud,fdjtID("CODEXTAGINPUT"),
                    fdjtUI.FDJT_COMPLETE_OPTIONS|
                        fdjtUI.FDJT_COMPLETE_CLOUD|
                        fdjtUI.FDJT_COMPLETE_ANYWORD);
            Codex.DOM.share_cloud=dom_share_cloud;
            updateScroller("CODEXSHARECLOUD");
            Codex.TapHold.share_cloud=new TapHold(Codex.share_cloud.dom);

            fdjtDOM.setupCustomInputs(fdjtID("CODEXHUD"));

            if (Codex.Trace.startup>1)
                fdjtLog("Initialized basic HUD in %dms",fdjtTime()-started);}
        Codex.initHUD=initHUD;
        
        function resizeHUD(){
            var view_height=fdjtDOM.viewHeight();
            fdjtID("CODEXHEART").style.maxHeight=(view_height-100)+'px';
            fdjt.DOM.tweakFonts(Codex.HUD);}
        Codex.resizeHUD=resizeHUD;

        /* Various UI methods */
        function addGloss2UI(item){
            if (!(item.frag)) {
                fdjtLog.warn("Warning: skipping gloss %o with no fragment identifier",
                             item.uuid);}
            else if (cxID(item.frag)) {
                var addGlossmark=Codex.UI.addGlossmark;
                allglosses.addCards(item);
                var nodes=Codex.getDups(item.frag);
                addClass(nodes,"glossed");
                var i=0, lim=nodes.length; while (i<lim) {
                    addGlossmark(nodes[i++],item);}
                if (item.excerpt) {
                    var range=Codex.findExcerpt(nodes,item.excerpt,item.exoff);
                    if (range) {
                        fdjtUI.Highlight(range,"codexuserexcerpt",
                                         item.note,{"data-glossid":item.uuid});}}
                if (item.tags) {
                    var gloss_cloud=Codex.gloss_cloud;
                    var tags=item.tags, j=0, n_tags=tags.length;
                    while (j<n_tags) 
                        Codex.cloudEntry(tags[j++],gloss_cloud);}
                if (item.tstamp>Codex.syncstamp)
                    Codex.syncstamp=item.tstamp;}}

        /* This is used for viewport-based browser, where the HUD moves
           to be aligned with the viewport */
        
        function getBounds(elt){
            var style=fdjtDOM.getStyle(elt);
            return { top: fdjtDOM.parsePX(style.marginTop)||0+
                     fdjtDOM.parsePX(style.borderTop)||0+
                     fdjtDOM.parsePX(style.paddingTop)||0,
                     bottom: fdjtDOM.parsePX(style.marginBottom)||0+
                     fdjtDOM.parsePX(style.borderBottom)||0+
                     fdjtDOM.parsePX(style.paddingBottom)||0};}
        fdjtDOM.getBounds=getBounds;
        
        /* Creating the HUD */
        
        function setupTOC(root_info){
            var navhud=createNavHUD("div#CODEXTOC.hudpanel",root_info);
            var toc_button=fdjtID("CODEXTOCBUTTON");
            toc_button.style.visibility='';
            Codex.DOM.toc=navhud;
            fdjtDOM.replace("CODEXTOC",navhud);
            var statictoc=createStaticTOC("div#CODEXSTATICTOC.hudpanel",root_info);
            Codex.Statictoc=statictoc;
            fdjtDOM.replace("CODEXSTATICTOC",statictoc);}
        Codex.setupTOC=setupTOC;

        function createNavHUD(eltspec,root_info){
            var scan=root_info;
            while (scan) {
                if ((!(scan.sub))||(scan.sub.length===0)) break;
                else if (scan.sub.length>1) {
                    root_info=scan; break;}
                else scan=scan.sub[0];}
            var toc_div=Codex.TOC(root_info,0,false,"CODEXTOC4",true);
            var div=fdjtDOM(eltspec||"div#CODEXTOC.hudpanel",toc_div);
            Codex.UI.addHandlers(div,"toc");
            return div;}

        function createStaticTOC(eltspec,root_info){
            var scan=root_info;
            while (scan) {
                if ((!(scan.sub))||(scan.sub.length===0)) break;
                else if (scan.sub.length>1) {
                    root_info=scan; break;}
                else scan=scan.sub[0];}
            var toc_div=Codex.TOC(scan,0,false,"CODEXSTATICTOC4");
            var div=fdjtDOM(eltspec||"div#CODEXSTATICTOC",toc_div);
            Codex.UI.addHandlers(div,"toc");
            div.title=
                "Tap a section to jump there directly; press and hold to see (glimpse) it temporarily; while glimpsing, tap (or press a key) to jump to where you're looking.";
            return div;}

        /* HUD animation */

        function setHUD(flag,clearmode){
            if (typeof clearmode === 'undefined') clearmode=true;
            if ((Codex.Trace.gestures)||(Codex.Trace.mode))
                fdjtLog("setHUD %o mode=%o hudup=%o bc=%o hc=%o",
                        flag,Codex.mode,Codex.hudup,
                        document.body.className,
                        CodexHUD.className);
            if (flag) {
                Codex.hudup=true;
                dropClass(document.body,"cxSKIMMING");
                addClass(document.body,"hudup");}
            else {
                Codex.hudup=false;
                Codex.scrolling=false;
                if (Codex.previewing)
                    Codex.stopPreview("setHUD");
                dropClass(document.body,"cxSHRINK");
                if (clearmode) {
                    if (Codex.popmode) {
                        var fn=Codex.popmode;
                        Codex.popmode=false;
                        fn();}
                    dropClass(CodexHUD,"openheart");
                    dropClass(CodexHUD,"openhead");
                    dropClass(CodexHUD,"full");
                    dropClass(CodexHUD,CodexModes);
                    dropClass(document.body,"cxSKIMMING");
                    dropClass(document.body,"cxSKIMSTART");
                    dropClass(document.body,"cxSKIMEND");
                    Codex.mode=false;}
                dropClass(document.body,"hudup");
                dropClass(document.body,"openhud");
                Codex.focusBody();}}
        Codex.setHUD=setHUD;

        /* Opening and closing the cover */

        function showCover(){
            if (Codex._setup)
                fdjtState.dropLocal("codex.opened("+Codex.docuri+")");
            addClass(document.body,"cxCOVER");}
        Codex.showCover=showCover;
        function hideCover(){
            if (Codex._setup)
                fdjtState.setLocal(
                    "codex.opened("+Codex.docuri+")",fdjtTime());
            dropClass(document.body,"cxCOVER");}
        Codex.hideCover=hideCover;
        function toggleCover(){
            if (hasClass(document.body,"cxCOVER")) hideCover();
            else showCover();}
        Codex.toggleCover=toggleCover;
        
        /* Mode controls */
        
        var CodexModes=/\b((search)|(refinesearch)|(expandsearch)|(searchresults)|(overtoc)|(openglossmark)|(allglosses)|(context)|(statictoc)|(minimal)|(addgloss)|(gotoloc)|(gotopage)|(shownote)|(showaside)|(glossdetail))\b/g;
        var codexHeartModes=/\b((statictoc)|(search)|(refinesearch)|(expandsearch)|(searchresults)|(allglosses)|(showaside)|(glossaddtag)|(glossaddtag)|(glossaddoutlet)|(glosseditdetail))\b/g;
        var codexHeadModes=/\b((overtoc)|(search)|(refinesearch)|(expandsearch)|(searchresults)|(allglosses)|(addgloss)|(shownote))\b/g;
        var CodexPopModes=/\b((glossdetail))\b/g;
        var CodexCoverModes=/\b((welcome)|(help)|(layers)|(login)|(settings)|(cover)|(aboutsbooks)|(console)|(aboutbook)|(titlepage))\b/g;
        var CodexSearchModes=/((refinesearch)|(searchresults)|(expandsearch))/;
        Codex.searchModes=CodexSearchModes;
        var codex_mode_scrollers=
            {allglosses: "CODEXALLGLOSSES",
             searchresults: "CODEXSEARCHRESULTS",
             expandsearch: "CODEXALLTAGS",
             search: "CODEXSEARCHCLOUD",
             refinesearch: "CODEXSEARCHCLOUD",
             openglossmark: "CODEXPOINTGLOSSES",
             statictoc: "CODEXSTATICTOC"};
        var codex_mode_foci=
            {gotopage: "CODEXPAGEINPUT",
             gotoloc: "CODEXLOCINPUT",
             search: "CODEXSEARCHINPUT",
             refinesearch: "CODEXSEARCHINPUT",
             expandsearch: "CODEXSEARCHINPUT"};
        
        function setMode(mode,nohud){
            var oldmode=Codex.mode;
            if (typeof mode === 'undefined') return oldmode;
            if (mode==='last') mode=Codex.last_mode;
            if ((!(mode))&&(Codex.mode)&&
                (Codex.mode.search(CodexPopModes)>=0))
                mode=Codex.last_mode;
            if (mode==='none') mode=false;
            if (mode==='heart') mode=Codex.heart_mode||"about";
            if (Codex.Trace.mode)
                fdjtLog("setMode %o, cur=%o dbc=%o",
                        mode,Codex.mode,document.body.className);
            if ((mode!==Codex.mode)&&(Codex.previewing))
                Codex.stopPreview("setMode");
            if ((mode!==Codex.mode)&&(Codex.popmode)) {
                var fn=Codex.popmode;
                Codex.popmode=false;
                fn();}
            if (hasClass(document.body,"cxCOVER")) {
                if (!(mode)) hideCover();
                else if (mode.search(CodexCoverModes)>=0)
                    hideCover();
                else {}
                CodexCoverModes.lastIndex=0;} // Kludge
            if ((Codex.mode==="addgloss")&&(mode!=="addgloss")&&
                (hasClass("CODEXLIVEGLOSS","modified")))
                Codex.submitGloss(fdjt.ID("CODEXLIVEGLOSS"));
            if (mode) {
                if (mode==="search") mode=Codex.search_mode||"refinesearch";
                if (mode==="addgloss") {}
                else dropClass(document.body,"cxSHRINK");
                if (mode===Codex.mode) {}
                else if (mode===true) {
                    /* True just puts up the HUD with no mode info */
                    Codex.hideCover();
                    if (codex_mode_foci[Codex.mode]) {
                        var input=fdjtID(codex_mode_foci[Codex.mode]);
                        input.blur();}
                    dropClass(CodexHUD,CodexModes);
                    Codex.mode=false;
                    Codex.last_mode=true;}
                else if (typeof mode !== 'string') 
                    throw new Error('mode arg not a string');
                else if (mode.search(CodexCoverModes)>=0) {
                    fdjtID("CODEXCOVER").className=mode;
                    if (mode==="console") fdjtLog.update();
                    showCover();
                    Codex.mode=mode;
                    Codex.modechange=fdjtTime();
                    return;}
                else {
                    Codex.hideCover();
                    Codex.modechange=fdjtTime();
                    if (codex_mode_foci[Codex.mode]) {
                        var modeinput=fdjtID(codex_mode_foci[Codex.mode]);
                        modeinput.blur();}
                    if (mode!==Codex.mode) Codex.last_mode=Codex.mode;
                    Codex.mode=mode;}
                // If we're switching to the inner app but the iframe
                //  hasn't been initialized, we do it now.
                if ((mode==="sbooksapp")&&
                    (!(fdjtID("SBOOKSAPP").src))&&
                    (!(Codex.appinit)))
                    initIFrameApp();
                // Update Codex.scrolling which is the scrolling
                // element in the HUD for this mode
                if (typeof mode !== 'string')
                    Codex.scrolling=false;
                else if (codex_mode_scrollers[mode]) 
                    Codex.scrolling=(codex_mode_scrollers[mode]);
                else Codex.scrolling=false;

                if ((mode==='refinesearch')||
                    (mode==='searchresults')||
                    (mode==='expandsearch'))
                    Codex.search_mode=mode;

                if ((mode==='addgloss')||(mode==="openglossmark")) 
                    addClass(document.body,"openhud");
                else if (nohud) {}
                // And if we're not skimming, we just raise the hud
                else setHUD(true);
                // Actually change the class on the HUD object
                if (mode===true) {
                    dropClass(CodexHUD,"openhead");
                    dropClass(CodexHUD,"openheart");
                    fdjtDOM.swapClass(CodexHUD,CodexModes,"minimal");}
                else if (mode==="addgloss") {
                    // addgloss has submodes which may specify the
                    //  open heart configuration
                    addClass(CodexHUD,"openhead");
                    if (CodexHUD.className.search(codexHeartModes)<0)
                        dropClass(CodexHUD,"openheart");
                    else addClass(CodexHUD,"openheart");}
                else {
                    if (mode.search(codexHeartModes)<0) {
                        dropClass(CodexHUD,"openheart");}
                    if (mode.search(codexHeadModes)<0)
                        dropClass(CodexHUD,"openhead");
                    if (mode.search(codexHeartModes)>=0) {
                        Codex.heart_mode=mode;
                        addClass(CodexHUD,"openheart");}
                    if (mode.search(codexHeadModes)>=0) {
                        Codex.head_mode=mode;
                        addClass(CodexHUD,"openhead");}}
                changeMode(mode);}
            else {
                // Clearing the mode is a lot simpler, in part because
                //  setHUD clears most of the classes when it brings
                //  the HUD down.
                Codex.last_mode=Codex.mode;
                if ((Codex.mode==="openglossmark")&&
                    (fdjtID("CODEXOPENGLOSSMARK")))
                    fdjtID("CODEXOPENGLOSSMARK").id="";
                if (Codex.textinput) {
                    Codex.setFocus(false);}
                Codex.focusBody();
                if (Codex.skimming) {
                    var dups=Codex.getDups(Codex.target);
                    Codex.clearHighlights(dups);
                    dropClass(dups,"codexhighlightpassage");}
                dropClass(CodexHUD,"openheart");
                dropClass(CodexHUD,"openhead");
                dropClass(document.body,"dimmed");
                dropClass(document.body,"codexhelp");
                dropClass(document.body,"cxPREVIEW");
                dropClass(document.body,"cxSHRINK");
                dropClass(CodexHUD,CodexModes);
                Codex.cxthelp=false;
                if (display_sync) Codex.displaySync();
                if (nohud) Codex.setHUD(false);
                else setHUD(false);}}
        
        function scrollSlices(mode){
            if (mode==="allglosses") {
                if ((Codex.skimming)||(Codex.point))
                    Codex.UI.scrollSlice(
                        Codex.skimming||Codex.point,Codex.glosses);}
            else if (mode==="searchresults") {
                if ((Codex.skimming)||(Codex.point))
                    Codex.UI.scrollSlice(
                        Codex.skimming||Codex.point,Codex.query.listing);}
            else {}}
        Codex.scrollSlices=scrollSlices;

        function changeMode(mode){      
            if (Codex.Trace.mode)
                fdjtLog("changeMode %o, cur=%o dbc=%o",
                        mode,Codex.mode,document.body.className);
            fdjtDOM.dropClass(CodexHUD,CodexModes);
            fdjtDOM.addClass(CodexHUD,mode);
            scrollSlices(mode);
            if (mode==="statictoc") {
                var headinfo=((Codex.head)&&(Codex.head.id)&&
                              (Codex.docinfo[Codex.head.id]));
                var hhinfo=headinfo.head, pinfo=headinfo.prev;
                var static_head=fdjt.ID("CODEXSTATICTOC4"+headinfo.frag);
                var static_hhead=
                    ((hhinfo)&&(fdjt.ID("CODEXSTATICTOC4"+hhinfo.frag)));
                var static_phead=
                    ((pinfo)&&(fdjt.ID("CODEXSTATICTOC4"+pinfo.frag)));
                if ((static_head)&&(static_head.scrollIntoView)) {
                    if (static_hhead) static_hhead.scrollIntoView();
                    if ((static_phead)&&(static_phead.scrollIntoViewIfNeeded))
                        static_phead.scrollIntoViewIfNeeded();
                    if (static_head.scrollIntoViewIfNeeded)
                        static_head.scrollIntoViewIfNeeded();
                    else static_head.scrollIntoView();}}
            else if (mode==="allglosses") {
                var curloc=Codex.location;
                var allcards=Codex.DOM.allglosses.childNodes;
                var i=0, lim=allcards.length;
                var card=false, lastcard=false, lasthead=false;
                if (Codex.glosses) Codex.glosses.setLive(true);
                while (i<lim) {
                    var each=allcards[i++];
                    if (each.nodeType!==1) continue;
                    lastcard=card; card=each;
                    if (hasClass(card,"newhead")) lasthead=card;
                    var loc=card.getAttribute("data-location");
                    if (loc) loc=parseInt(loc,10);
                    if (loc>=curloc) break;}
                if (i>=lim) card=lastcard=false;
                if ((card)&&(lasthead)&&(Codex.iscroll)) {
                    Codex.heartscroller.scrollToElement(lasthead,0);
                    Codex.heartscroller.scrollToElement(card,0);}
                else if ((card)&&(Codex.iscroll)) {
                    Codex.heartscroller.scrollToElement(card,0);}
                else if ((card)&&(lasthead)&&(card.scrollIntoViewIfNeeded)) {
                    lasthead.scrollIntoView();
                    card.scrollIntoViewIfNeeded();}
                else if ((card)&&(lastcard.scrollIntoView))
                    card.scrollIntoView();}
            else {}
            
            // This updates scroller dimensions, we delay it
            //  because apparently, on some browsers, the DOM
            //  needs to catch up with CSS
            if ((Codex.scrolling)&&(Codex.iscroll)) {
                var scroller=fdjtID(Codex.scrolling);
                if (Codex.Trace.iscroll)
                    fdjtLog("Updating scroller for #%s s=%o",
                            Codex.scrolling,scroller);
                setTimeout(function(){updateScroller(scroller);},
                           2000);}
            
            // We autofocus any input element appropriate to the
            // mode
            if (codex_mode_foci[mode]) {
                var input=fdjtID(codex_mode_foci[mode]);
                if (input) {
                    setTimeout(function(){
                        Codex.setFocus(input);},
                               50);}}
            else if (mode==="addgloss") {}
            // Moving the focus back to the body lets keys work
            else setTimeout(Codex.focusBody,50);
            
            if (display_sync) Codex.displaySync();}

        function updateScroller(elt){
            /* jshint newcap: false */
            if (!(Codex.iscroll)) return;
            if ((elt)&&(Codex.Trace.scrolling))
                fdjtLog("Updating scroller for %o",elt);
            if (Codex.heartscroller) Codex.heartscroller.refresh();
            else {
                var heart=fdjtID("CODEXHEART");
                var contents=fdjtID("CODEXHEARTCONTENT");
                if (!(contents)) {
                    contents=fdjtDOM("div#CODEXHEARTCONTENT");
                    fdjtDOM(contents,fdjtDOM.Array(heart.childNodes));
                    fdjtDOM(heart,contents);}
                Codex.heartscroller=new iScroll(heart);
                Codex.heartscroller.refresh();}}
        Codex.UI.updateScroller=updateScroller;

        function CodexHUDToggle(mode,keephud){
            if (!(Codex.mode)) setMode(mode);
            else if (mode===Codex.mode)
                if (keephud) setMode(true); else setMode(false);
            else if ((mode==='heart')&&
                     (Codex.mode.search(codexHeartModes)===0))
                if (keephud) setMode(true); else setMode(false);
            else setMode(mode);}
        Codex.toggleMode=CodexHUDToggle;

        Codex.dropHUD=function(){return setMode(false);};
        Codex.toggleHUD=function(evt){
            evt=evt||window.event;
            if ((evt)&&(fdjtUI.isClickable(fdjtUI.T(evt)))) return;
            fdjtLog("toggle HUD %o hudup=%o",evt,Codex.hudup);
            if (Codex.hudup) setHUD(false,false);
            else setHUD(true);};
        
        /* The App HUD */

        var iframe_app_init=false;
        function initIFrameApp(){
            if (iframe_app_init) return;
            if (Codex.appinit) return;
            var query="";
            if (document.location.search) {
                if (document.location.search[0]==="?")
                    query=query+document.location.search.slice(1);
                else query=query+document.location.search;}
            if ((query.length)&&(query[query.length-1]!=="&"))
                query=query+"&";
            var refuri=Codex.refuri;
            var appuri="https://"+Codex.server+"/flyleaf?"+query;
            if (query.search("REFURI=")<0)
                appuri=appuri+"REFURI="+encodeURIComponent(refuri);
            if (query.search("TOPURI=")<0)
                appuri=appuri+"&TOPURI="+
                encodeURIComponent(document.location.href);
            if (document.title) {
                appuri=appuri+"&DOCTITLE="+encodeURIComponent(document.title);}
            if (Codex.user) {
                appuri=appuri+"&BOOKUSER="+encodeURIComponent(Codex.user._id);}
            if (document.location.hash) {
                appuri=appuri+"&HASH="+document.location.hash.slice(1);}

            fdjtID("SBOOKSAPP").src=appuri;
            iframe_app_init=true;}
        Codex.initIFrameApp=initIFrameApp;

        Codex.selectApp=function(){
            if (Codex.mode==='sbooksapp') setMode(false);
            else setMode('sbooksapp');};

        /* Skimming */

        function CodexSkim(elt,src,dir,expanded){
            var nextSlice=Codex.nextSlice, prevSlice=Codex.prevSlice;
            var pelt=Codex.skimming;
            var i=0, lim=0;
            if (typeof dir !== "number") dir=0;
            addClass(document.body,"cxSKIMMING"); setHUD(false,false);
            if (true) // (Codex.Trace.mode)
                fdjtLog("CodexSkim() %o (src=%o) mode=%o scn=%o/%o dir=%o",
                        elt,src,Codex.mode,Codex.skimming,Codex.target,
                        dir);
            // Copy the description of what we're skimming into the
            // skimmer (at the top of the page during skimming and
            // preview)
            if (Codex.skimming!==src) {
                var skimmer=fdjtID("CODEXSKIMMER");
                var clone=src.cloneNode(true);
                var next=nextSlice(src), prev=prevSlice(src);
                var before=0, after=0, slice=prev;
                var pct=((dir<0)?("-120%"):(dir>0)?("120%"):(false));
                dropClass(skimmer,"transimate");
                fdjtDOM.replace("CODEXSKIM",clone);
                var dropTransAnimate=function(){
                    dropClass(skimmer,"transanimate");
                    fdjtDOM.removeListener(
                        skimmer,"transitionend",dropTransAnimate);};
                if ((Codex.skimming)&&(pct)) {
                    skimmer.style[fdjtDOM.transform]=
                        "translate("+pct+",0)";
                    setTimeout(function(){
                        addClass(skimmer,"transanimate");
                        fdjtDOM.addListener(
                            skimmer,"transitionend",dropTransAnimate);
                        setTimeout(function(){
                            skimmer.style[fdjtDOM.transform]="";},
                                   0);},
                               0);}
                // This all makes sure that the >| and |< buttons
                // appear appropriately
                if (next) dropClass(document.body,"cxSKIMEND");
                else addClass(document.body,"cxSKIMEND");
                if (prev) dropClass(document.body,"cxSKIMSTART");
                else addClass(document.body,"cxSKIMSTART");
                while (slice) {before++; slice=prevSlice(slice);}
                slice=next; while (slice) {
                    after++; slice=nextSlice(slice);}
                var skiminfo=fdjtID("CODEXSKIMINFO");
                skiminfo.innerHTML=(before+1)+"/"+(before+after+1);
                // This marks where we are currently skimming
                if (pelt) dropClass(pelt,"codexskimpoint");
                if (src) addClass(src,"codexskimpoint");
                if (typeof expanded === "undefined") {}
                else if (expanded) addClass("CODEXSKIMMER","expanded");
                else dropClass("CODEXSKIMMER","expanded");
                Codex.skimming=src;}
            else {}
            var highlights=[];
            if (Codex.target)
                Codex.clearHighlights(Codex.getDups(Codex.target));
            dropClass("CODEXSKIMMER","cxfoundhighlights");
            Codex.setTarget(elt);
            if ((src)&&(hasClass(src,"gloss"))) {
                var glossinfo=Codex.glossdb.ref(src.name);
                if (glossinfo.excerpt) {
                    var searching=Codex.getDups(elt.id);
                    var range=Codex.findExcerpt(
                        searching,glossinfo.excerpt,glossinfo.exoff);
                    if (range) {
                        highlights=
                            fdjtUI.Highlight(range,"codexhighlightexcerpt");
                        addClass("CODEXSKIMMER","cxhighlights");}}
                else if (src.about[0]==="#")
                    addClass(Codex.getDups(src.about.slice(1)),
                             "codexhighlightpassage");
                else addClass(Codex.getDups(src.about),"codexhighlightpassage");}
            else if ((src)&&(getParent(src,".sbookresults"))) {
                var about=src.about, target=cxID(about);
                if (target) {
                    var info=Codex.docinfo[target.id];
                    var terms=Codex.query.tags;
                    var spellings=info.knodeterms;
                    i=0; lim=terms.length;
                    if (lim===0)
                        addClass(Codex.getDups(target),"codexhighlightpassage");
                    else while (i<lim) {
                        var term=terms[i++];
                        var h=Codex.highlightTerm(term,target,info,spellings);
                        highlights=highlights.concat(h);}}}
            delete Codex.skimpoints;
            delete Codex.skimoff;
            if ((highlights)&&(highlights.length===1)&&
                (getParent(highlights[0],elt)))
                Codex.GoTo(elt,"Skim");
            else if ((highlights)&&(highlights.length)) {
                var possible=Codex.getDups(elt.id);
                if (possible.length) {
                    var skimpoints=[];
                    i=0; lim=possible.length;
                    while (i<lim) {
                        var poss=possible[i++];
                        var j=0, jlim=highlights.length;
                        while (j<jlim) {
                            if (getParent(highlights[j++],poss)) {
                                skimpoints.push(poss); break;}}}
                    if (skimpoints.length)
                        Codex.skimpoints=skimpoints;
                    else Codex.skimpoints=possible;
                    if (dir<0) 
                        Codex.skimoff=Codex.skimpoints.length-1;
                    else Codex.skimoff=0;
                    Codex.GoTo(Codex.skimpoints[Codex.skimoff]);}
                else Codex.GoTo(elt,"Skim");}
            else Codex.GoTo(elt,"Skim");}
        Codex.Skim=CodexSkim;
        function stopSkimming(){
            // Tapping the tochead returns to results/glosses/etc
            var skimming=Codex.skimming;
            if (!(skimming)) return;
            dropClass(document.body,"cxSKIMMING");
            if (getParent(skimming,fdjtID("CODEXALLGLOSSES"))) 
                Codex.setMode("allglosses");
            else if (getParent(skimming,fdjtID("CODEXSEARCHRESULTS"))) 
                Codex.setMode("searchresults");
            else {}}
        Codex.stopSkimming=stopSkimming;
        
        Codex.addConfig("uisize",function(name,value){
            fdjtDOM.swapClass(
                Codex.Frame,/codexuifont\w+/,"codexuifont"+value);});
        Codex.addConfig("animatecontent",function(name,value){
            if (Codex.dontanimate) {}
            else if (value) addClass(document.body,"_ANIMATE");
            else dropClass(Codex.page,"_ANIMATE");});
        Codex.addConfig("animatehud",function(name,value){
            if (Codex.dontanimate) {}
            else if (value) addClass("CODEXFRAME","_ANIMATE");
            else dropClass("CODEXFRAME","_ANIMATE");});

        /* Settings apply/save handlers */

        function getSettings(){
            var result={};
            var settings=fdjtID("CODEXSETTINGS");
            var layout=fdjtDOM.getInputValues(settings,"CODEXLAYOUT");
            result.layout=
                ((layout)&&(layout.length)&&(layout[0]))||false;
            var bodysize=fdjtDOM.getInputValues(settings,"CODEXBODYSIZE");
            if ((bodysize)&&(bodysize.length))
                result.bodysize=bodysize[0];
            var bodyfamily=fdjtDOM.getInputValues(settings,"CODEXBODYFAMILY");
            if ((bodyfamily)&&(bodyfamily.length))
                result.bodyfamily=bodyfamily[0];
            var uisize=fdjtDOM.getInputValues(settings,"CODEXUISIZE");
            if ((uisize)&&(uisize.length))
                result.uisize=uisize[0];
            var hidesplash=fdjtDOM.getInputValues(settings,"CODEXHIDESPLASH");
            result.hidesplash=((hidesplash)&&(hidesplash.length))||false;
            var showconsole=fdjtDOM.getInputValues(settings,"CODEXSHOWCONSOLE");
            result.showconsole=
                ((showconsole)&&(showconsole.length)&&(true))||false;
            var locsync=fdjtDOM.getInputValues(settings,"CODEXLOCSYNC");
            if ((locsync)&&(locsync.length)) result.locsync=true;
            var justify=fdjtDOM.getInputValues(settings,"CODEXJUSTIFY");
            if ((justify)&&(justify.length)) result.justify=true;
            else result.justify=false;
            var cacheglosses=fdjtDOM.getInputValues(settings,"CODEXCACHEGLOSSES");
            if ((cacheglosses)&&(cacheglosses.length)) result.cacheglosses=true;
            else result.cacheglosses=false;
            var animatecontent=fdjtDOM.getInputValues(
                settings,"CODEXANIMATECONTENT");
            result.animatecontent=
                (((animatecontent)&&(animatecontent.length)&&(animatecontent[0]))?
                 (true):(false));
            var animatehud=fdjtDOM.getInputValues(
                settings,"CODEXANIMATEHUD");
            result.animatehud=
                (((animatehud)&&(animatehud.length)&&(animatehud[0]))?
                 (true):(false));
            
            return result;}

        Codex.UI.settingsUpdate=function(){
            var settings=getSettings();
            Codex.setConfig(settings);};

        Codex.UI.settingsSave=function(evt){
            if (typeof evt === "undefined") evt=event;
            if (evt) fdjt.UI.cancel(evt);
            var settings=getSettings();
            Codex.setConfig(settings);
            Codex.saveConfig(settings);
            fdjtDOM.dropClass("CODEXSETTINGS","changed");
            fdjtDOM.replace("CODEXSETTINGSMESSAGE",
                            fdjtDOM("span.message#CODEXSETTINGSMESSAGE",
                                    "Your settings have been saved."));};

        Codex.UI.settingsReset=function(evt){
            if (typeof evt === "undefined") evt=event;
            if (evt) fdjt.UI.cancel(evt);
            Codex.resetConfig();
            fdjtDOM.dropClass("CODEXSETTINGS","changed");
            fdjtDOM.replace("CODEXSETTINGSMESSAGE",
                            fdjtDOM("span.message#CODEXSETTINGSMESSAGE",
                                    "Your settings have been reset."));};

        Codex.UI.settingsOK=function(evt){
            if (typeof evt === "undefined") evt=event;
            if (evt) fdjt.UI.cancel(evt);
            var settings=getSettings();
            Codex.setConfig(settings);
            Codex.saveConfig(settings);
            fdjtDOM.replace("CODEXSETTINGSMESSAGE",
                            fdjtDOM("span.message#CODEXSETTINGSMESSAGE",
                                    "Your settings have been saved."));};
        
        Codex.UI.settingsCancel=function(evt){
            if (typeof evt === "undefined") evt=event;
            if (evt) fdjt.UI.cancel(evt);
            Codex.setConfig(Codex.getConfig());
            fdjtDOM.replace("CODEXSETTINGSMESSAGE",
                            fdjtDOM("span.message#CODEXSETTINGSMESSAGE",
                                    "Your changes have been discarded."));};

        function keyboardHelp(arg,force){
            if (arg===true) {
                if (Codex.keyboardHelp.timer) {
                    clearTimeout(Codex.keyboardHelp.timer);
                    Codex.keyboardHelp.timer=false;}
                dropClass("CODEXKEYBOARDHELPBOX","closing");
                dropClass("CODEXKEYBOARDHELPBOX","closed");
                return;}
            else if (arg===false) {
                if (Codex.keyboardHelp.timer) {
                    clearTimeout(Codex.keyboardHelp.timer);
                    Codex.keyboardHelp.timer=false;}
                addClass("CODEXKEYBOARDHELPBOX","closed");
                dropClass("CODEXKEYBOARDHELPBOX","closing");
                return;}
            if ((!force)&&(!(Codex.keyboardhelp))) return;
            if (typeof arg === 'string') arg=fdjtID(arg);
            if ((!(arg))||(!(arg.nodeType))) return;
            var box=fdjtID("CODEXKEYBOARDHELPBOX");
            var content=arg.cloneNode(true);
            content.id="CODEXKEYBOARDHELP";
            fdjtDOM.replace("CODEXKEYBOARDHELP",content);
            fdjtDOM.dropClass(box,"closed");
            Codex.keyboardHelp.timer=
                setTimeout(function(){
                    fdjtDOM.addClass(box,"closing");
                    Codex.keyboardHelp.timer=
                        setTimeout(function(){
                            Codex.keyboardHelp.timer=false;
                            fdjtDOM.swapClass(box,"closing","closed");},
                                   5000);},
                           5000);}
        Codex.keyboardHelp=keyboardHelp;

        /* Showing a particular gloss */

        Codex.showGloss=function showGloss(uuid){
            if (!(Codex.glossdb.ref(uuid))) return false;
            var elts=document.getElementsByName(uuid);
            if (!(elts)) return false;
            else if (!(elts.length)) return false;
            else {
                var hasParent=fdjtDOM.hasParent;
                var i=0, lim=elts.length;
                while (i<lim) {
                    var src=elts[i++];
                    if (hasParent(src,allglosses)) {
                        var elt=cxID(src.about);
                        setMode("allglosses");
                        Codex.Skim(elt,src);
                        return true;}}
                return false;}};

        /* Setting/clearing help mode */
        Codex.hideHelp=function(){
            fdjtDOM.dropClass(document.body,"codexhelp");};
        Codex.showHelp=function(){
            fdjtDOM.addClass(document.body,"codexhelp");};

        return setMode;})();

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  indent-tabs-mode: nil ***
   ;;;  End: ***
*/
