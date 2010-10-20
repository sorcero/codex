/* -*- Mode: Javascript; -*- */

var sbooks_id="$Id$";
var sbooks_version=parseInt("$Revision$".slice(10,-1));

/* Copyright (C) 2009-2010 beingmeta, inc.
   This file implements a Javascript/DHTML UI for reading
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

sbook.Startup=
    (function(){

	var sbook_faketouch=false;

	var sbook_fullpages=[];
	var sbook_heading_qricons=false;

	/* Initialization */
	
	var _sbook_setup_start=false;
	
	function Startup(){
	    if (sbook._setup) return;
	    if (!(sbook._setup_start)) sbook._setup_start=new Date();
	    // Get various settings
	    getSettings();
	    sbookPaginate.getSettings();
	    // Dependent setups
	    fdjtDOM.init();
	    // Add this as soon as possible
	    if (sbook.paginate)
		fdjtDOM.addClass(document.body,"paginate");
	    var metadata=false;
	    var helphud=false;
	    fdjtTime.timeslice
	    ([// Setup sbook tables, databases, etc
		sbook.initDB,
		// This wraps the body in an div#SBOOKBODY 
		function(){
		    initBody();
		    sbook.body.style.opacity='0.25';},
		function(){
		    if (sbook.Trace.startup>1)
			fdjtLog("[%fs] Initializing HUD",fdjtET());
		    sbook.initHUD(); sbook.initDisplay();
		    helphud=fdjtID("SBOOKHELP");
		    helphud.style.opacity=0.0001;
		    if (sbook.Trace.startup>1)
			fdjtLog("[%fs] HUD Setup, sizing help",fdjtET());},
		function(){sbookMode("help");}, 
		function(){fdjtDOM.adjustToFit(helphud,0.2);},
		function(){fdjtDOM.adjustToFit(helphud,0.2);},
		function(){
		    fdjtDOM.finishScale(helphud);
		    if (sbook.Trace.startup>1)
			fdjtLog("[%fs] Displaying help",fdjtET());
		    helphud.style.opacity='';},
		sbook.setupGestures,
		getUser,
		function(){sbook.Message("analyzing book structure");},10,
		function(){
		    metadata=sbookScan(sbook.root);
		    sbook.docinfo=sbook.DocInfo.map=metadata;
		    sbook.ends_at=sbook.docinfo[sbook.root.id].ends_at;},
		function(){sbook.Message("building table of contents");},10,
		function(){
		    sbook.setupTOC(metadata[sbook.root.id]);},
		function(){
		    if (sbook.scrollfree) sbook.resizeBody();
		    sbook.body.style.opacity='';},
		initLocation,
		function(){
		    sbook.Message("processing knodule ",sbook.knodule.name);},
		10,
		((Knodule)&&(Knodule.HTML)&&(Knodule.HTML.Setup)&&
		 (function(){
		     Knodule.HTML.Setup(sbook.knodule);})),
		function(){sbook.Message("Indexing tags");},10,
		function(){
		    sbook.indexTags(metadata);
		    sbook.indexTechnoratiTags(sbook.knodule);},
		function(){sbook.Message("configuring server");},10,
		setupGlossServer,
		function(){
		    if (sbook.user) sbook.Message("getting glosses");},10,
		function (){ if (sbook.user) setupGlosses();},
		function(){
		    if (sbook.Trace.startup>1)
			fdjtLog("[%fs] Initial pagination for %ox%o",
				fdjtET(),fdjtDOM.viewWidth(),fdjtDOM.viewHeight());
		    sbookPaginate(sbook.paginate);},
		function(){
		    if ((sbook.user)&&(!(sbook.glossing))&&
			(!(sbook.glossed)))
			sbook.Message("getting glosses");},10,
		function (){
		    if ((sbook.user)&&(!(sbook.glossing))&&(!(sbook.glossed)))
			setupGlosses();},500,
		function(){
		    if ((sbook.user)&&(!(sbook.glossing))&&
			(!(sbook.glossed)))
			sbook.Message("getting glosses");},10,
		function(){
		    if ((!(sbook.glossing))&&(!(sbook.glossed))) {
			if (sbook.user) setupGlosses();
			else gotGlosses();}},
		function(){sbook.Message("setup completed");},10,
		function(){
		    if (fdjtState.getQuery("action")) {
			sbookMode("sbookapp");}
		    else if ((sbook.mode==='help')&&(sbook.hidehelp))
			setTimeout(function(){
			    if (sbook.mode==="help") sbookMode(false);},
				   2500);
		    else {}},
		function(){
		    sbook.displaySync();
		    _sbook_setup=sbook._setup=new Date();}],
	     25,100);}
	sbook.Startup=Startup;

	/* Application settings */

	var optrules=
	    {"paginate":["scrolling"],
	     "scrolling":["paginate"],
	     "touch":["mouse","kbd"],
	     "mouse":["touch","kbd"],
	     "kbd":["touch","mouse"]};

	function setopt(opt,flag){
	    if (typeof flag === 'undefined') flag=true;
	    if ((flag)&&(sbook[opt])) return;
	    else if ((!(flag))&&(!(sbook[opt]))) return;
	    var unset=optrules[opt];
	    sbook[opt]=true;
	    if (unset) {
		var i=0; var lim=unset.length;
		sbook[unset[i++]]=false;}}

	function workOffline(refuri){
	    var value=fdjtState.getQuery("offline")||
		fdjtState.getLocal("sbook.offline("+refuri+")")||
		fdjtState.getLocal("sbook.mycopy("+refuri+")")||
		fdjtState.getLocal("sbook.offline")||
		((fdjtDOM.getMeta("sbook.mycopyid")))||
		((fdjtDOM.getMeta("MYCOPYID")))||
		(fdjtDOM.getMeta("sbook.offline"));
	    if ((!(value))||(value==="no")||(value==="off")||(value==="never"))
		return false;
	    else if ((value==="ask")&&(window.confirm))
		return window.confirm("Read offline?");
	    else return true;}
	
	function getSettings(){
	    if (typeof _sbook_loadinfo === "undefined") _sbook_loadinfo=false;
	    // Basic stuff
	    var useragent=navigator.userAgent;
	    var refuri=_getsbookrefuri();
	    document.body.refuri=sbook.refuri=refuri;
	    sbook.docuri=_getsbookdocuri();
	    var refuris=fdjtState.getLocal("sbook.refuris",true)||[];
	    var offline=workOffline(refuri);
	    sbook.offline=((offline)?(true):(false));
	    if (offline)
		fdjtState.setLocal("sbook.offline("+refuri+")",offline);
	    // Get the settings for scanning the document structure
	    getScanSettings();
	    // Get the settings for automatic pagination
	    getPageSettings();
	    // Whether to hide help after startup
	    if (fdjtState.getLocal("sbook.hidehelp")) setConfig('hidehelp');

	    // Whether to suppress login, etc
	    if ((fdjtState.getLocal("sbook.nologin"))||
		(fdjtState.getQuery("nologin")))
		sbook.nologin=true;
	    sbook.max_excerpt=fdjtDOM.getMeta("sbook.maxexcerpt")||
		(sbook.max_excerpt);
	    sbook.min_excerpt=fdjtDOM.getMeta("sbook.minexcerpt")||
		(sbook.min_excerpt);
	    var sbooksrv=fdjtDOM.getMeta("sbook.server")||
		fdjtDOM.getMeta("SBOOKSERVER");
	    if (sbooksrv) sbook.server=sbooksrv;
	    else if (fdjtState.getCookie["SBOOKSERVER"])
		sbook.server=fdjtState.getCookie["SBOOKSERVER"];
	    else sbook.server=lookupServer(document.domain);
	    if (!(sbook.server)) sbook.server=sbook.default_server;
	    sbook_ajax_uri=fdjtDOM.getMeta("sbook.ajax",true);
	    sbook.mycopyid=fdjtDOM.getMeta("sbook.mycopyid")||
		((offline)&&(fdjtState.getLocal("mycopy("+refuri+")")))||
		false;
	    sbook.syncstamp=fdjtState.getLocal("syncstamp("+refuri+")",true);
	    
	    if ((offline)&&
		(!(fdjtState.getLocal("sbook.offline("+refuri+")")))) {
		fdjtState.setLocal("sbook.offline("+refuri+")",true,true);
		refuris.push(refuri);
		fdjtState.setLocal("sbook.refuris",refuris,true);}
	    
	    var isIphone = (/iphone/gi).test(navigator.appVersion);
	    var isIpad = (/ipad/gi).test(navigator.appVersion);
	    var isAndroid = (/android/gi).test(navigator.appVersion);
	    var isWebTouch = isIphone || isIpad || isAndroid;

	    if (isWebTouch) {
		fdjtDOM.addClass(document.body,"touch");
		viewportSetup();
		sbook.ui="webtouch";}
	    if ((useragent.search("Safari/")>0)&&
		(useragent.search("Mobile/")>0)) { 
		hide_mobile_safari_address_bar();
		// Have fdjtLog do it's own format conversion for the log
		fdjtLog.doformat=true;}
	    else if (sbook_faketouch) {
		fdjtDOM.addClass(document.body,"touch");
		viewportSetup();
		sbook.ui="faketouch"}
	    else {
		sbook.ui="mouse";}
	    
	    sbook.allglosses=
		((offline)?
		 ((fdjtState.getLocal("glosses("+refuri+")",true))||[]):
		 []);
	    sbook.allsources=
		((offline)?
		 ((fdjtState.getLocal("sources("+refuri+")",true))||{}):
		 {});
	    sbook.glossetc=
		((offline)?
		 ((fdjtState.getLocal("glossetc("+refuri+")",true))||{}):
		 {});}

	function setConfig(name,value){
	    var inputs=document.getElementsByName(name.toUpperCase());
	    // fdjtLog("[%fs] setConfig %o=%o",fdjtET(),name,value);
	    if ((value===true)||(typeof value === 'undefined')) {
		fdjtState.setLocal("sbook."+name,'yes');
		sbook[name]=true;
		if ((inputs)&&(inputs.length)) {
		    var i=0; var lim=inputs.length;
		    while (i<lim) fdjtUI.CheckSpan.set(inputs[i++],true);}}
	    else if (value===false) {
		fdjtState.dropLocal("sbook."+name,'yes');
		delete sbook[name];
		if ((inputs)&&(inputs.length)) {
		    var i=0; var lim=inputs.length;
		    while (i<lim) fdjtUI.CheckSpan.set(inputs[i++],false);}}
	    else {
		fdjtState.setLocal("sbook."+name,value);
		sbook[name]=value;
		if ((inputs)&&(inputs.length)) {
		    var i=0; var lim=inputs.length;
		    while (i<lim) inputs[i++].value=value;}}}
	sbook.setConfig=setConfig;

	var viewport_spec="width=device-width,initial-scale=1.0";
	function viewportSetup(){
	    var head=fdjtDOM.getHEAD();
	    sbook.ScrollFree(true);
	    var viewport=fdjtDOM.getMeta("viewport",false,false,true);
	    if (!(viewport)) {
		viewport=document.createElement("META");
		viewport.setAttribute("name","viewport");
		head.appendChild(viewport);}
	    viewport.setAttribute("content",viewport_spec);
	    var isapp=fdjtDOM.getMeta
	    ("apple-mobile-web-app-capable",false,false,true);
	    if (!(isapp)) {
		isapp=document.createElement("META");
		isapp.setAttribute("name","apple-mobile-web-app-capable");
		head.appendChild(isapp);}}

	function hide_mobile_safari_address_bar(){
	    window.scrollTo(0,1);
	    setTimeout(function(){window.scrollTo(0,0);},0);}

	/* Getting settings */

	function _getsbookrefuri(){
	    var refuri=fdjtDOM.getLink("sbook.refuri",false,false)||
		fdjtDOM.getLink("refuri",false,false)||
		fdjtDOM.getMeta("refuri",false,false)||
		fdjtDOM.getLink("canonical",false,true);
	    if (refuri) return decodeURI(refuri);
	    else {
		var locref=document.location.href;
		var qstart=locref.indexOf('?');
		if (qstart>=0) locref=locref.slice(0,qstart);
		var hstart=locref.indexOf('#');
		if (hstart>=0) locref=locref.slice(0,hstart);
		return decodeURI(locref);}}
	function _getsbookdocuri(){
	    return fdjtDOM.getLink("sbook.docuri",true)||
		fdjtDOM.getLink("DOCURI",true)||
		fdjtDOM.getMeta("sbook.docuri",true)||
		fdjtDOM.getMeta("DOCURI",true)||
		fdjtDOM.getLink("canonical",true)||
		location.href;}

	function lookupServer(string){
	    var sbook_servers=sbook.servers;
	    var i=0;
	    while (i<sbook_servers.length) 
		if (sbook_servers[i][0]===string)
		    return sbook_servers[i][1];
	    else if (string.search(sbook_servers[i][0])>=0)
		return sbook_servers[i][1];
	    else if ((sbook_servers[i][0].call) &&
		     (sbook_servers[i][0].call(string)))
		return sbook_servers[i][1];
	    else i++;
	    return false;}

	function hasTOCLevel(elt){
	    if ((elt.toclevel)||
		((elt.getAttributeNS)&&
		 (elt.getAttributeNS('toclevel','http://sbooks.net/')))||
		(elt.getAttribute('toclevel'))||
		(elt.getAttribute('data-toclevel'))||
		((elt.className)&&(elt.className.search(/sbook\dhead/)>=0)))
		return true;
	    else return false;}
	sbook.hasTOCLevel=hasTOCLevel;

	function getScanSettings(){
	    if (!(sbook.root))
		if (fdjtDOM.getMeta("sbook.root"))
		    sbook.root=fdjtID(fdjtDOM.getMeta("sbook.root"));
	    else sbook.root=fdjtID("SBOOKBODY")||document.body;
	    if (!(sbook.start))
		if (fdjtDOM.getMeta("sbook.start"))
		    sbook.start=fdjtID(fdjtDOM.getMeta("sbook.start"));
	    else if (fdjtID("SBOOKSTART"))
		sbook.start=fdjtID("SBOOKSTART");
	    else {
		var titlepage=fdjtID("SBOOKTITLE")||fdjtID("TITLEPAGE");
		while (titlepage)
		    if (fdjtDOM.nextElt(titlepage)) {
			sbook.start=fdjtDOM.nextElt(titlepage); break;}
		else titlepage=titlepage.parentNode;}
	    var i=1; while (i<9) {
		var rules=fdjtDOM.getMeta("sbook.head"+i,true).
		    concat(fdjtDOM.getMeta("sbook"+i+"head",true));
		if ((rules)&&(rules.length)) {
		    var j=0; var lim=rules.length;
		    var elements=fdjtDOM.getChildren(document.body,rules[j++]);
		    var k=0; var n=elements.length;
		    while (k<n) {
			var elt=elements[k++];
			if (!(hasTOCLevel(elt))) elt.toclevel=i;}}
		i++;}
	    if (fdjtDOM.getMeta("sbook.ignored")) 
		sbook.ignored=new fdjtDOM.Selector
	    (fdjtDOM.getMeta("sbook.ignored"));
	    if (fdjtDOM.getMeta("sbook.notag"))
		sbook.notag_rules=new fdjtDOM.Selector
	    (fdjtDOM.getMeta("sbook.notag"));
	    if (fdjtDOM.getMeta("sbook.terminals"))
		sbook.terminal_rules=new fdjtDOM.Selector
	    (fdjtDOM.getMeta("sbook.terminals"));
	    if (fdjtDOM.getMeta("sbook.idify")) 
		sbook_idify=new fdjtDOM.Selector
	    (fdjtDOM.getMeta("sbook.idify"));
	    if (fdjtDOM.getMeta("sbook.foci"))
		sbook.foci=new fdjtDOM.Selector(fdjtDOM.getMeta("sbook.foci"));
	    else if (fdjtDOM.getMeta("SBOOKFOCI"))
		sbook.foci=new fdjtDOM.Selector(fdjtDOM.getMeta("SBOOKFOCI"));
	    else {}}
	

	function getPageSettings(){
	    var tocmajor=fdjtDOM.getMeta("sbook.tocmajor",true);
	    if (tocmajor) sbook_tocmajor=parseInt(tocmajor);
	    var sbook_fullpage_rules=fdjtDOM.getMeta("sbook.fullpage",true);
	    if (sbook_fullpage_rules) {
		var i=0; while (i<sbook_fullpage_rules.length) {
		    sbook_fullpages.push
		    (fdjtDOM.Selector(sbook_fullpage_rules[i++]));}}
	    sbook_fullpages.push
	    (fdjtDOM.Selector(".sbookfullpage, .titlepage"));}

	function initBody(){
	    var sbody=
		((fdjtDOM.getMeta("sbook.body"))?
		 ((fdjtID(fdjtDOM.getMeta("sbook.body")))||(document.body)):
		 (fdjtID("SBOOKBODY")));
	    if (!(sbody)) {
		sbody=fdjtDOM("div#SBOOKBODY");
		var nodes=fdjtDOM.toArray(document.body.childNodes);
		var i=0; var lim=nodes.length;
		while (i<lim) sbody.appendChild(nodes[i++]);
		document.body.appendChild(sbody);}
	    fdjtDOM.addClass(document.body,"sbook");
	    if (sbook.scrollfree) fdjtDOM.addClass(document.body,"scrollfree");
	    sbook.body=sbody;
	    if (sbook.Trace.startup>1)
		fdjtLog("[%fs] Initialized body",fdjtET());}

	/* Changing settings */

	function updateSessionSettings(delay){
	    if (delay) {
		setTimeout(sbookUpdateSessionSettings,delay);
		return;}
	    // This updates the session settings from the checkboxes 
	    var sessionsettings="opts";
	    setopt("paginate",fdjtID("SBOOKPAGINATE").checked);
	    setopt("touch",fdjtID("SBOOKTOUCHMODE").checked);
	    setopt("mouse",fdjtID("SBOOKMOUSEMODE").checked);
	    setopt("kbd",fdjtID("SBOOKKBDMODE").checked);
	    setopt("flashy",fdjtID("SBOOKHUDFLASH").checked);
	    // setopt("rich",fdjtID("SBOOKHUDRICH").checked);
	    fdjtSetSession("sbookopts",sessionsettings);
	    applySettings();}

	function saveSettings(){
	    var opts=fdjtGetSession("sbookopts");
	    if (opts) {
		fdjtState.setLocal("sbookopts",opts);}}
	sbook.saveSettings=saveSettings;

	function getUser() {
	    var refuri=sbook.refuri;
	    var loadinfo=_sbook_loadinfo||false;
	    if (sbook.Trace.startup>1)
		fdjtLog("[%fs] Getting user for %o cur=%o",
			fdjtET(),refuri,sbook.user);
	    if (sbook.user) return;
	    else if (sbook.nologin) return;
	    if ((loadinfo)&&
		(setUser(loadinfo.userinfo,loadinfo.nodeid,
			 loadinfo.sources,loadinfo.outlets,
			 loadinfo.etc,loadinfo.sync))) 
		return;
	    if ((sbook.offline)&&
		(fdjtState.getLocal("sbook.user"))&&
		(fdjtState.getLocal("sbook.nodeid("+refuri+")"))) {
		var refuri=sbook.refuri;
		var user=fdjtState.getLocal("sbook.user");
		if (sbook.trace.startup)
		    fdjtLog("[%fs] Restoring offline user info for %o reading %o",
			    fdjtET(),user,refuri);
		var userinfo=JSON.parse(fdjtState.getLocal(user));
		var sources=fdjtState.getLocal("sbook.sources("+refuri+")",true);
		var outlets=fdjtState.getLocal("sbook.outlets("+refuri+")",true);
		var etc=fdjtState.getLocal("sbook.etc("+refuri+")",true);
		var nodeid=fdjtState.getLocal("sbook.nodeid("+refuri+")");
		var sync=fdjtState.getLocal("sbook.usersync",true);
		var etcinfo=[];
		if (etc) {
		    var i=0; var lim=etc.length;
		    while (i<lim) {
			var ref=etc[i++];
			fdjtKB.load(ref); etcinfo.push(ref);}}
		setUser(userinfo,nodeid,sources,outlets,etcinfo,sync);
		return;}
	    else if (!(fdjtID("SBOOKGETUSERINFO"))) {
		var user_script=fdjtDOM("SCRIPT#SBOOKGETUSERINFO");
		user_script.language="javascript";
		user_script.src=
		    "https://"+sbook.server+"/v4/user.js";
		document.body.appendChild(user_script);
		fdjtDOM.addClass(document.body,"nosbookuser");}
	    else fdjtDOM.addClass(document.body,"nosbookuser");}
	
	function setUser(userinfo,nodeid,sources,outlets,etc,sync){
	    var persist=((sbook.offline)&&(navigator.onLine));
	    var refuri=sbook.refuri;
	    if (sbook.user)
		if (userinfo.oid===sbook.user.oid) {}
	    else throw { error: "Can't change user"};
	    var syncstamp=sbook.syncstamp;
	    if ((syncstamp)&&(syncstamp>=sync)) {
		fdjtLog.warn("[%fs] Cached user information is newer (%o) than loaded (%o)",
			     fdjtET(),syncstamp,sync);
		return false;}
	    sbook.user=fdjtKB.Import(userinfo);
	    if (persist) {
		fdjtState.setLocal(sbook.user.oid,sbook.user,true);
		fdjtState.setLocal("sbook.nodeid("+sbook.refuri+")",nodeid);
		fdjtState.setLocal("sbook.user",sbook.user.oid);}
	    gotInfo("sources",sources,persist);
	    gotInfo("outlets",outlets,persist);
	    gotInfo("etc",etc,persist);
	    if (outlets) {
	      var i=0; var ilim=outlets.length;
	      while (i<ilim) {
		var outlet=outlets[i++];
		var span=fdjtID("SBOOKGLOSSOUTLET"+outlet.humid);
		if (!(span)) {
		  var completion=
		    fdjtDOM("span.completion.outlet.cue",outlet.name);
		  completion.id="SBOOKGLOSSOUTLET"+outlet.humid;
		  completion.setAttribute("value",outlet.qid);
		  completion.setAttribute("key",outlet.name);
		  fdjtDOM(fdjtID("SBOOKGLOSSOUTLETS"),completion," ");
		  if (sbook.gloss_cloud)
		    sbook.gloss_cloud.addCompletion(completion);}}}
	    if (sync) {
		sbook.usersync=sync;
		if (persist) fdjtState.setLocal("sbook.usersync",sync);}
	    if (!(sbook.nodeid)) {
		sbook.nodeid=nodeid;
		if ((nodeid)&&(persist))
		    fdjtState.setLocal("sbook.nodeid("+refuri+")",nodeid);}
	    setupUser();
	    return sbook.user;}
	function gotInfo(name,info,persist) {
	    var refuri=sbook.refuri;
	    if (info)
		if (info instanceof Array) {
		    var i=0; var lim=info.length; var qids=[];
		    while (i<lim) {
			if (typeof info[i] === 'string') {
			    var qid=info[i++];
			    if (sbook.offline) fdjtKB.load(qid);
			    qids.push(qid);}
			else {
			    var obj=fdjtKB.Import(info[i++]);
			    if (persist) 
				fdjtState.setLocal(obj.qid,obj,true);
			    qids.push(obj.qid);}}
		    sbook[name]=qids;
		    if (sbook.offline)
			fdjtState.setLocal
		    ("sbook."+name+"("+refuri+")",qids,true);}
	    else {
		var obj=fdjtKB.Import(info);
		if (persist) 
		    fdjtState.setLocal(obj.qid,obj,true);
		sbook[name]=obj.qid;
		if (persist)
		    fdjtState.setLocal("sbook."+name+"("+refuri+")",qid,true);}}
	sbook.setUser=setUser;
	function setupUser(){
	    if (sbook._user_setup) return;
	    if (!(sbook.user)) {
		fdjtDOM.addClass(document.body,"nosbookuser");
		return;}
	    fdjtDOM.dropClass(document.body,"nosbookuser");
	    var username=sbook.user.name;
	    fdjtID("SBOOKUSERNAME").innerHTML=username;
	    if (fdjtID("SBOOKMARKUSER"))
		fdjtID("SBOOKMARKUSER").value=sbook.user.oid;
	    if (sbook.user.pic) {
		if (fdjtID("SBOOKMARKIMAGE"))
		    fdjtID("SBOOKMARKIMAGE").src=sbook.user.pic;
		if (fdjtID("SBOOKUSERPIC"))
		    fdjtID("SBOOKUSERPIC").src=sbook.user.pic;}
	    if (fdjtID("SBOOKFRIENDLYOPTION"))
		if (sbook.user)
		    fdjtID("SBOOKFRIENDLYOPTION").value=sbook.user.oid;
	    else fdjtID("SBOOKFRIENDLYOPTION").value="";
	    var idlinks=document.getElementsByName("IDLINK");
	    if (idlinks) {
		var i=0; var len=idlinks.length;
		while (i<len) {
		    var idlink=idlinks[i++];
		    idlink.target='_blank';
		    idlink.title='click to edit your personal information';
		    idlink.href='https://www.sbooks.net/admin/id.fdcgi';}}
	    var addgloss=fdjtID("SBOOKGLOSSFORM");
	    if (addgloss) sbook.setupGlossForm(addgloss);
	    if (sbook.user.friends) {
		var friends=sbook.user.friends; var i=0; var lim=friends.length;
		while (i<lim) {
		    var friend=fdjtKB.ref(friends[i++]);
		    sbook.UI.addSource(friend);}}
	    sbook._user_setup=true;}

	function setupGlosses() {
	    var allglosses=[];
	    sbook.glossing=fdjtTime();
	    var latest=sbook.syncstamp||0;
	    var loaded=((_sbook_loadinfo)&&(_sbook_loadinfo.glosses))||[];
	    var cached=fdjtState.getLocal("glosses("+sbook.refuri+")",true);
	    sbook.glosses.Import(loaded);
	    if (cached) allglosses=cached;
	    if (loaded.length) {
		var n=loaded.length; var i=0; while (i<n) {
		    var gloss=loaded[i++];
		    var id=gloss.qid||gloss.uuid||gloss.oid;
		    var tstamp=gloss.syncstamp||gloss.tstamp;
		    if (tstamp>latest) latest=tstamp;
		    allglosses.push(id);}}
	    if ((_sbook_loadinfo)&&(_sbook_loadinfo.etc))
		fdjtKB.Import(_sbook_loadinfo.etc);
	    sbook.syncstamp=latest;
	    sbook.allglosses=allglosses;
	    if (sbook.offline) {
		fdjtState.setLocal("glosses("+sbook.refuri+")",allglosses,true);
		fdjtState.setLocal("syncstamp("+sbook.refuri+")",latest);}
	    if ((allglosses.length===0) &&
		(!(sbook.nologin)) && (sbook.user) && (navigator.onLine) &&
		(!(_sbook_loadinfo))) {
		var glosses_script=fdjtDOM("SCRIPT#SBOOKGETGLOSSES");
		glosses_script.language="javascript";
		glosses_script.src="https://"+sbook.server+
		    "/v4/glosses.js?CALLBACK=sbook.Startup.initGlosses&REFURI="+
		    encodeURIComponent(sbook.refuri);
		if (sbook.Trace.glosses)
		    fdjtLog("[%fs] setupGlosses/JSONP %o sync=%o",
			    fdjtET(),glosses_script.src,sbook.syncstamp||false);
		if (sbook.syncstamp)
		    glosses_script.src=
		    glosses_script.src+"&SYNCSTAMP="+sbook.syncstamp;
		document.body.appendChild(glosses_script);}
	    else gotGlosses();}
	
	function go_online(evt){return offline_update();}
	function offline_update(){
	    sbook.writeGlosses();
	    var uri="https://"+sbook.server+
		"/v4/update?REFURI="+
		encodeURIComponent(sbook.refuri)+
		"&ORIGIN="+
		encodeURIComponent(
		    document.location.protocol+"//"+document.location.hostname);
	    if (sbook.syncstamp) uri=uri+"&SYNCSTAMP="+(sbook.syncstamp+1);
	    fdjtAjax.jsonCall(offline_import,uri);}
	function offline_import(results){
	    fdjtKB.Import(results);
	    var i=0; var lim=results.length;
	    var syncstamp=sbook.syncstamp; var tstamp=false;
	    while (i<lim) {
		tstamp=results[i++].tstamp;
		if ((tstamp)&&(tstamp>syncstamp)) syncstamp=tstamp;}
	    sbook.syncstamp=syncstamp;
	    fdjtState.setLocal("syncstamp("+sbook.refuri+")",syncstamp);}
	sbook.update=offline_update;
	
	/* This initializes the sbook state to the initial location with the
	   document, using the hash value if there is one. */ 
	function initLocation() {
	    var hash=window.location.hash; var target=sbook.root;
	    if ((typeof hash === "string") && (hash.length>0)) {
		if ((hash[0]==='#') && (hash.length>1))
		    target=document.getElementById(hash.slice(1));
		else target=document.getElementById(hash);
		if (sbook.Trace.startup>1)
		    fdjtLog("[%fs] sbookInitLocation hash=%s=%o",
			    fdjtET(),hash,target);}
	    else if (fdjtState.getCookie("sbooktarget")) {
		var targetid=fdjtState.getCookie("sbooktarget");
		if (sbook.Trace.startup>1)
		    fdjtLog("[%fs] sbookInitLocation cookie=#%s=%o",
			    fdjtET(),targetid,target);
		if ((targetid)&&(fdjtID(targetid)))
		    target=fdjtID(targetid);
		else target=sbook.root;}
	    else {
		target=sbook.root;
		if (sbook.Trace.startup>1)
		    fdjtLog("[%fs] sbookInitLocation target=%o",fdjtET(),target);}
	    if (target) {
		sbook.target=target;
		fdjtDOM.addClass(target,"sbooktarget");}
	    sbook.setHead(target||sbook.start||sbook.root);
	    if (sbook.paginate) {
		if (sbook.pages) sbook.GoTo(target);}
	    else sbook.GoTo(target);}
	
	function gotGlosses(){
	    delete sbook.glossing; sbook.glossed=fdjtTime();
	    if (sbook.Trace.glosses)
		fdjtLog("[%fs] gotGlosses",fdjtET());
	    sbook.Message("Setting up search cloud...");
	    fdjtDOM.replace("SBOOKSEARCHCLOUD",sbook.FullCloud().dom);
	    sbook.Message("Setting up glossing cloud...");
	    fdjtDOM.replace("SBOOKGLOSSCLOUD",sbook.glossCloud().dom);
	    sbook.Message("Setting up sharing cloud...");
	    fdjtDOM.replace("SBOOKSHARECLOUD",sbook.shareCloud().dom);
	    if (sbook.knodule) {
		sbook.Message("Integrating knodule terms...");
		fdjtTime.slowmap(sbook.addTag2UI,sbook.knodule.alldterms);}}

	function initGlosses(glosses,etc){
	    var allglosses=sbook.allglosses;
	    if (etc) {
		if (sbook.Trace.startup)
		    fdjtLog("[%fs] Assimilating %d new glosses and %d sources",
			    fdjtET(),glosses.length,etc.length);
		sbook.Message(
		    fdjtString("Assimilating %d new glosses/%d sources...",
			       glosses.length,etc.length));}
	    else {
		if (sbook.Trace.startup)
		    fdjtLog("[%fs] Assimilating %d new glosses",
			    fdjtET(),glosses.length);
		sbook.Message(
		    fdjtString(
			"Assimilating %d new glosses...",glosses.length));}
	    fdjtKB.Import(etc);
	    sbook.glosses.Import(glosses);
	    var i=0; var lim=glosses.length;
	    var latest=sbook.syncstamp||0;
	    while (i<lim) {
		var gloss=glosses[i++];
		var id=gloss.qid||gloss.uuid||gloss.oid;
		var tstamp=gloss.syncstamp||gloss.tstamp;
		if (tstamp>latest) latest=tstamp;
		allglosses.push(id);}
	    sbook.syncstamp=latest;
	    sbook.allglosses=allglosses;
	    if (sbook.offline) {
		fdjtState.setLocal("glosses("+sbook.refuri+")",allglosses,true);
		fdjtState.setLocal("syncstamp("+sbook.refuri+")",latest);}
	    gotGlosses();}
	sbook.Startup.initGlosses=initGlosses;

	/* Indexing tags */
	function sbookIndexTags(docinfo){
	    var sbook_index=sbook.index;
	    knodule=(knodule)||(knodule=sbook.knodule);
	    /* One pass processes all of the inline KNodes and
	       also separates out primary and auto tags. */
	    for (var eltid in docinfo) {
		var tags=docinfo[eltid].tags;
		if (!(tags)) continue;
		var k=0; var ntags=tags.length;
		while (k<ntags) {
		    var tag=tags[k];
		    if (tag[0]==='*') {
			var tagstart=tag.search(/[^*]+/);
			tags[k]=tag=tag.slice(tagstart);
			tags[tag]=2*tagstart;}
		    else if (tag[0]==='~') tags[k]=tag=tag.slice(1);
		    else tags[tag]=2;
		    if ((tag.indexOf('|')>=0)) knodule.handleSubjectEntry(tag);
		    k++;}}
	    var knodule=sbook.knodule||false;
	    sbook_index.Tags=function(item){
		var info=docinfo[item]||
		    sbook.glosses.ref(item)||
		    fdjtKB.ref(item);
		return ((info)&&(info.tags))||[];};
	    for (var eltid in docinfo) {
		var tags=docinfo[eltid].tags;
		if (!(tags)) continue;
		var k=0; var ntags=tags.length;
		while (k<ntags) {
		    var tag=tags[k++];
		    sbook_index.add(eltid,tag,tags[tag]||1,knodule);}}}
	sbook.indexTags=sbookIndexTags;
	
	/* Inline knodules */
	function indexTechnoratiTags(kno) {
	    var sbook_index=sbook.index;
	    if (!(kno)) kno=knodule;
	    var anchors=document.getElementsByTagName("A");
	    if (!(anchors)) return;
	    var i=0; var len=anchors.length;
	    while (i<len)
		if (anchors[i].rel==='tag') {
		    var elt=anchors[i++];
		    var href=elt.href;
		    var cxt=elt;
		    while (cxt) if (cxt.id) break; else cxt=cxt.parentNode;
		    if (!((href)&&(cxt))) return;
		    var tagstart=(href.search(/[^/]+$/));
	    var tag=((tagstart<0)?(href):href.slice(tagstart));
	    var dterm=((kno)?(kno.handleEntry(tag)):(fdjtString.stdspace(tag)));
	    sbook_index.add(cxt,dterm);}
	else i++;}
     sbook.indexTechnoratiTags=indexTechnoratiTags;

     /* Clearing offline data */

     function clearOffline(refuri){
	 if (refuri) {
	     var glosses=
		 fdjtState.getLocal("sbook.glosses("+refuri+")",true);
	     var i=0; var lim=glosses.length;
	     while (i<lim) fdjtState.dropLocal(glosses[i++]);
	     fdjtState.dropLocal("sbook.sources("+refuri+")");
	     fdjtState.dropLocal("sbook.outlets("+refuri+")");
	     fdjtState.dropLocal("sbook.etc("+refuri+")");
	     fdjtState.dropLocal("sbook.offline("+refuri+")");
	     var refuris=fdjtState.getLocal("sbook.refuris",true);
	     refuris=fdjtKB.remove(refuris,refuri);
	     fdjtState.setLocal("sbook.refuris",refuris,true);}
	 else {
	     var refuris=fdjtState.getLocal("sbook.refuris",true);
	     var i=0; var lim=refuris.length;
	     while (i<lim) clearOffline(refuris[i++]);
	     fdjtState.dropLocal("sbook.refuris");}}
     sbook.clearOffline=clearOffline;

     /* Other setup */
     
     function setupGlossServer(){}

     return Startup;})();
sbookStartup=sbook.Startup;
sbook.Setup=sbook.Startup;

/* Emacs local variables
   ;;;  Local variables: ***
   ;;;  compile-command: "cd ..; make" ***
   ;;;  End: ***
*/
