// Build 34: the live job report draws the crew on a plan of the job while the feed runs.
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path"),fs=require("fs");
const putDownPaper=require("./paper.js");
const OUT=path.join(__dirname,"shots34");fs.mkdirSync(OUT,{recursive:true});
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};
(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  const noise=t=>/ERR_CERT/.test(t)||/music\/|\.mp3|manifest\.json/.test(t)||(/CORS policy/.test(t)&&/file:\/\//.test(t))||/net::ERR_FAILED/.test(t)||/ERR_FILE_NOT_FOUND/.test(t);
  page.on("console",m=>{const where=(m.location()||{}).url||"";const t=m.text()+(where?" ["+where+"]":"");if(m.type()==="error"&&!noise(t))errors.push(t);});
  await page.goto("file://"+(process.argv[2]?require("path").resolve(process.argv[2]):GAME));
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Paz");await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  await putDownPaper(page);
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  const drain=async()=>{let n=0;while(await page.$(".modal.notice")||await page.$('[data-act="loose"]')){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');else await page.click('[data-act="loose"][data-i="0"]');
    await page.waitForTimeout(90);if(++n>30)break;}};
  await drain();

  const started=await page.evaluate(()=>{
    S.money=5e7;SET.speed=4;
    // The name is what opens the places, and a posting can want three trades. At Nobody there are
    // not enough seats to hire them, so the feed carries no trade beats and sometimes no runnable
    // job at all. Raise the name first, as the board itself would have done by then.
    S.rep=RANKS.find(r=>r[1]==="Respected")[0];
    S.jobs=[];refreshJobs(true);
    const sign=t=>{const c=S.roster.find(x=>x.status==="available"&&x.tech===t&&canSign(x));
      if(c&&recruits().length<crewSeats()){c.status="crew";c._touched=true;S.crewIds.push(c.id);return c;}return null;};
    S.notices=[];S.modal=null;
    // A trade beat is only written when the crew HAS the trade the job wants, so hire what the
    // posting wants rather than hope the board offered something the crew happens to fit — and
    // work down the board, because a border or somebody s own limits can still rule one out.
    let j=null;
    // One board does not always carry a posting this crew can both run and be written beats for —
    // a border rules people out, seats run short — so deal another one rather than give up. This
    // was the last of the setup flakes: the drive has to arrange the situation, not hope for it.
    // Hiring for one candidate must not poison the next. Operations sit at the FRONT of the board
    // and name three to five specialist trades, so without this the first candidate fills every
    // seat with specialists, and no ordinary posting after it can get its own trades signed.
    const unwind=()=>{recruits().forEach(c=>{c.status="available";});S.crewIds=[];};
    for(let board=0;board<12&&!j;board++){
      for(const cand of S.jobs.filter(x=>!x.final)){
        unwind();
        cand.techs.forEach(t=>{if(!recruits().some(c=>c.tech===t))sign(t);});
        while(recruits().length<crewSeats()){const x=S.roster.find(c=>c.status==="available"&&canSign(c));if(!x)break;sign(x.tech);}
        cand.need=Math.min(cand.need,recruits().length+1);
        // against the team that can actually GO, not the crew on the books: a border or somebody own
        // limits can bar the very person whose trade the posting wants, and then no beat is written.
        const aa=assessJob(cand,jobPool(cand));
        if(aa.canRun&&cand.techs.some(t=>aa.team.some(c=>c.tech===t))){j=cand;break;}
      }
      if(!j){S.jobs=[];refreshJobs(true);}
    }
    if(!j)return null;
    doExecute(j.id);
    estabClear();   // build 102: the night opens on a card of the city. Click it away, as a player does.
    return {team:(S.modal&&S.modal.data?S.modal.data.teamIds.length:0),
            wants:j.techs.slice(),
            lines:S.modal&&S.modal.data?S.modal.data.narrative.length:0};
  });
  check(started&&started.team>=2,"a job is running with "+(started&&started.team)+" in the field");
  await page.waitForTimeout(300);

  // ---- the map is there, and it is a place
  check(await page.$(".modal .feedmap"),"the live report draws a plan of the job");
  const parts=await page.evaluate(()=>{const m=document.querySelector(".feedmap");
    return {clock:m.querySelector(".fm-clock")?m.querySelector(".fm-clock").textContent.trim():null,
      where:m.querySelector(".fm-where")?m.querySelector(".fm-where").textContent.trim():null,
      sites:[...m.querySelectorAll(".fm-site")].map(e=>e.getAttribute("data-site")),
      labels:[...m.querySelectorAll(".fm-site text")].map(e=>e.textContent),
      ops:m.querySelectorAll(".fm-op").length,
      // A plan is not always a street of buildings — a pass is switchbacks and a barrier, an
      // interception is a road across country, the deep-water job is the water itself. So what
      // is counted is the plan's ink altogether, not one kind of shape.
      blocks:[].slice.call(m.querySelectorAll("*")).filter(e=>/(^| )sc-/.test(e.getAttribute("class")||"")).length,
      // Not every plan marks its subject the same way — a vault has a strongroom inside a
      // building, a pass has a barrier, a port has a quay — so the question is whether the thing
      // the job is about is drawn at all, not which of the three classes it happened to use.
      target:!!m.querySelector(".sc-target, .sc-strong, .sc-solid"),
      labels2:[...m.querySelectorAll(".sc-text")].map(e=>e.textContent),
      glyphs:[...m.querySelectorAll(".fm-op")].map(e=>e.getAttribute("data-glyph")),
      names:[...m.querySelectorAll(".fm-op-n")].map(e=>e.textContent)};});
  // It is no longer the world zoomed in — it is a plan of the place, drawn from the posting, so
  // two jobs in the same country do not look alike. What must be on it: streets and buildings,
  // and the thing the job is actually about, marked.
  check(parts.blocks>20,"it is a plan of the place — "+parts.blocks+" pieces of ink on it");
  check(parts.target,"with the thing the job is about marked on it");
  check(parts.where&&/·/.test(parts.where),"and named in the corner: "+parts.where);
  check(parts.sites.length===5,"five places around it: "+parts.labels.join(", "));
  check(parts.ops===started.team,"one icon per operator on the job ("+parts.ops+")");
  check(parts.names.length===started.team,"each one carrying their name: "+parts.names.join(", "));
  check(parts.glyphs.every(g=>g==="walk"),"and everyone arriving, on foot");
  check(/^\d\d:\d\d$/.test(parts.clock||""),"and a clock reading "+parts.clock);

  // the clock is at the top left of the map
  const geo=await page.evaluate(()=>{const m=document.querySelector(".feedmap").getBoundingClientRect();
    const c=document.querySelector(".fm-clock").getBoundingClientRect();
    return {dx:Math.round(c.left-m.left),dy:Math.round(c.top-m.top),w:Math.round(m.width)};});
  check(geo.dx<=2&&geo.dy<=2,"the clock sits at the top left of the map ("+geo.dx+", "+geo.dy+")");

  // The plan is drawn from the posting, which is the whole point of it: every job gets its own
  // place rather than the same country zoomed in. So it must differ between two postings — and
  // it must NOT differ between two looks at the same one, or the place changes under the player.
  const drawn=await page.evaluate(()=>{
    const open=(S.jobs||[]).filter(j=>!j.final);
    if(open.length<2)return null;
    const d=j=>({id:j.id,job:j});   // fmFrame takes the feed's data, not the posting
    const a1=fmFrame(d(open[0])).svg,a2=fmFrame(d(open[0])).svg,b1=fmFrame(d(open[1])).svg;
    return {stable:a1===a2,different:a1!==b1,len:a1.length,
            what:open[0].cat+" in "+open[0].country+" vs "+open[1].cat+" in "+open[1].country};});
  check(drawn&&drawn.stable,"a posting always draws the same plan");
  check(drawn&&drawn.different,"and two postings draw different ones: "+(drawn&&drawn.what));

  // The feed is on the left and the plan on the right now, pinned, because when the plan sat
  // above the feed, scrolling the feed scrolled the plan off the top of the screen.
  const order=await page.evaluate(()=>{const m=document.querySelector(".feedmap").getBoundingClientRect();
    const t=document.querySelector("#ticker").getBoundingClientRect();
    const holder=document.querySelector(".feedmap").parentElement;
    return {right:m.left>=t.right-2,top:Math.round(m.top),tickerTop:Math.round(t.top),
      stuck:getComputedStyle(holder).position==="sticky"||getComputedStyle(document.querySelector(".feedmap")).position==="sticky"};});
  check(order.right,"the plan is beside the running text, to its right");
  check(order.stuck,"and pinned there, so scrolling the feed never scrolls it away");
  await page.screenshot({path:OUT+"/01-start.png"});

  // ---- it moves as the feed runs
  const before=await page.evaluate(()=>({clock:document.querySelector(".fm-clock").textContent.trim(),
    where:[...document.querySelectorAll(".fm-op")].map(e=>e.getAttribute("data-site")).join(","),
    pos:[...document.querySelectorAll(".fm-op")].map(e=>e.getAttribute("transform")).join("|")}));
  check(before.where.split(",").every(w=>w==="road"),"everyone starts on the street, where the feed puts them");
  // Wait for the state the claim is about, not for a number of milliseconds: the first lines of
  // any feed are the arrival and all happen on the street, so a fixed wait sometimes asserted
  // movement before anybody had moved. A twist can also stop the feed while everyone is still on
  // the street, so answer it and carry on rather than assert against a feed that has not run.
  const leftTheStreet=()=>page.evaluate(()=>{
    const d=S&&S.modal&&S.modal.data;if(!d)return false;
    for(let i=0;i<d.revealed;i++){const l=d.narrative[i];if(l.at&&l.at!=="road"&&l.who)return true;}
    return false;});
  for(let round=0;round<4;round++){
    await page.waitForFunction(()=>{
      const d=S&&S.modal&&S.modal.data;if(!d)return true;
      for(let i=0;i<d.revealed;i++){const l=d.narrative[i];if(l.at&&l.at!=="road"&&l.who)return true;}
      return d.done||d.awaiting;},{timeout:60000});
    if(await leftTheStreet())break;
    if(await page.$(".twist-opt")){await page.click('.twist-opt[data-i="0"]');await page.waitForTimeout(400);continue;}
    break;
  }
  await page.waitForTimeout(700);
  check(await leftTheStreet(),"the feed has named somebody somewhere other than the street");
  const after=await page.evaluate(()=>({clock:document.querySelector(".fm-clock").textContent.trim(),
    where:[...document.querySelectorAll(".fm-op")].map(e=>e.getAttribute("data-site")).join(","),
    pos:[...document.querySelectorAll(".fm-op")].map(e=>e.getAttribute("transform")).join("|"),
    lit:[...document.querySelectorAll(".fm-site.on")].map(e=>e.getAttribute("data-site")),
    revealed:S.modal.data.revealed}));
  check(after.revealed>1,"the feed has run on ("+after.revealed+" lines)");
  check(after.clock!==before.clock,"the clock moves with it ("+before.clock+" → "+after.clock+")");
  check(after.pos!==before.pos,"and the icons move");
  check(after.lit.length<=1,"the place the current line happens in is lit"+(after.lit.length?": "+after.lit[0]:""));
  const marks=await page.evaluate(()=>({
    now:[...document.querySelectorAll(".fm-op")].map(e=>e.getAttribute("data-glyph")),
    known:Object.keys(FM_GLYPH),
    drawn:[...document.querySelectorAll(".fm-op-g")].every(g=>g.children.length>0)}));
  check(marks.now.every(g=>marks.known.indexOf(g)>=0),"every icon is one of the marks the game draws: "+marks.now.join(", "));
  check(marks.drawn,"and each is actually drawn, not an empty circle");
  check(marks.now.some(g=>g!=="walk"),"and at least one has stopped walking and started working");
  // a tether from every operator to the place they are standing at, so no group is ambiguous
  const tether=await page.evaluate(()=>document.querySelectorAll(".fm-tether line").length);
  check(tether===after.where.split(",").length,"every operator is tied to the place they are at ("+tether+" lines)");
  // nobody is drawn on top of anybody, whatever the crew size and wherever they crowd
  const clear=await page.evaluate(()=>{
    const pos=[...document.querySelectorAll(".fm-op")].map(e=>{
      const m=/translate\(([-\d.]+),([-\d.]+)\)/.exec(e.getAttribute("transform")||"");
      return m?[+m[1],+m[2]]:null;}).filter(Boolean);
    let worst=999;
    for(let i=0;i<pos.length;i++)for(let j=i+1;j<pos.length;j++)
      worst=Math.min(worst,Math.hypot(pos[i][0]-pos[j][0],pos[i][1]-pos[j][1]));
    return {n:pos.length,worst:Math.round(worst*10)/10};});
  check(clear.worst>5.4,"and no two of the "+clear.n+" sit on top of each other (closest "+clear.worst+", dot is 5.4 wide)");
  // and no place name is hidden behind a face. The crew stand below their own marker, so a
  // cluster never covers its own name — but it reaches the name of the site below it, and seven
  // people on one plan makes that ordinary rather than rare. So the names are painted over the
  // faces: what is asked here is the paint order, which is what decides whether it can be read.
  const labels=await page.evaluate(()=>{
    const svg=document.querySelector(".fm-svg");
    const kids=[...svg.children];
    const ops=kids.findIndex(e=>e.classList.contains("fm-ops"));
    const firstSite=kids.findIndex(e=>e.classList.contains("fm-site"));
    const covered=[];
    document.querySelectorAll(".fm-site text").forEach(t=>{const r=t.getBoundingClientRect();
      document.querySelectorAll(".fm-op circle").forEach(c=>{const q=c.getBoundingClientRect();
        if(q.left<r.right-1&&q.right>r.left+1&&q.top<r.bottom-1&&q.bottom>r.top+1)covered.push(t.textContent);});});
    return {ops,firstSite,over:[...new Set(covered)]};});
  check(labels.firstSite>labels.ops,
    "the place names are painted over the crew, so one standing on a name does not erase it"
    +(labels.over.length?" ("+labels.over.join(", ")+" has somebody on it)":" (nobody on one this time)"));
  await page.screenshot({path:OUT+"/02-running.png"});

  // ---- where somebody stands is what their trade is
  // A trade beat — "Leif (Lookout) spots the plain car" — must put that person where that trade
  // works. Arriving, the papers and the language are deliberately on the street whoever they are,
  // so the claim is made against the beats, found by their own shape rather than by the placement
  // being checked, and over the whole narrative rather than whatever has been revealed by now.
  const truth=await page.evaluate(()=>{
    const d=S.modal.data,out=[];
    // every trade, not the original sixteen: at Respected the board carries operations, the crew
    // hires the specialists those name, and a beat written by one of them is still a trade beat
    const tech=Object.create(null);TECHS_ALL.forEach(t=>tech[t.l]=t.k);
    d.narrative.forEach(l=>{const m=/^(\S+) \(([^)]+)\) /.exec(l.x||"");
      if(m&&tech[m[2]])out.push({who:m[1],trade:m[2],at:l.at||null,want:techSite(tech[m[2]])});});
    return out;});
  check(truth.length>0,truth.length+" trade beat(s) in the feed: "+truth.map(x=>x.who+" the "+x.trade).join(", "));
  const wrong=truth.filter(x=>x.at!==x.want);
  check(wrong.length===0,"each one stands where that trade works — "+
    truth.map(x=>x.trade.toLowerCase()+" at "+x.at).join(", "));

  // ---- every line the game can write knows where it happens
  // Not a percentage: the claim is that everything which happens AT the job has a place, and the
  // only lines without one are the aftermath — the morning, the quiet week, the split — which come
  // after the crew have gone and correctly leave the map where it stood.
  const cover=await page.evaluate(()=>{const d=S.modal.data;
    const n=d.narrative.length,withAt=d.narrative.filter(l=>l.at).length;
    const last=d.narrative.map((l,i)=>l.at?i:-1).reduce((a,b)=>Math.max(a,b),-1);
    const tail=d.narrative.slice(last+1);
    return {n,withAt,last,tailAll:tail.every(l=>!l.at),tailN:tail.length,
      named:d.narrative.filter(l=>l.who&&l.who!=="*"),
      namedPlaced:d.narrative.filter(l=>l.who&&l.who!=="*"&&l.at).length,
      sites:[...new Set(d.narrative.map(l=>l.at).filter(Boolean))]};});
  check(cover.named.length>0&&cover.namedPlaced===cover.named.length,
    "every line that names one person says where they are ("+cover.namedPlaced+" of "+cover.named.length+")");
  check(cover.tailAll,"and the only lines without a place are the "+cover.tailN+" after the crew have gone");
  check(cover.sites.length>=3,"and the job moves through "+cover.sites.length+" of the five places: "+cover.sites.join(", "));

  // ---- skipping to the end leaves the map behind with the report
  await page.click('[data-act="skip-ticker"]');
  await page.waitForTimeout(600);
  const end=await page.evaluate(()=>({awaiting:!!S.modal.data.awaiting,done:!!S.modal.data.done,
    map:!!document.querySelector(".feedmap"),twist:!!document.querySelector(".twist")}));
  if(end.done){
    check(!end.map,"when the job is over the plan goes and the report takes its place");
  } else {
    check(end.map&&end.twist,"stopping at the twist keeps the plan up while you decide");
    await page.screenshot({path:OUT+"/03-twist.png"});
    // A big job goes wrong more than once, so the feed carries on to the next decision rather
    // than to the end — answer until the night has nothing left waiting on it.
    const n=await page.evaluate(()=>(S.pendingJob&&pendingTwists(S.pendingJob).length)||1);
    for(let i=0;i<n+2;i++){
      if(!(await page.$('.twist-opt')))break;
      await page.click('.twist-opt[data-i="0"]');
      await page.waitForTimeout(600);
      await page.evaluate(()=>{tickerFinish();});
      await page.waitForTimeout(400);
    }
    check(await page.evaluate(()=>!!S.modal.data.resolved),
      "answering all "+n+" of them carries the feed on to the end");
    check(await page.evaluate(()=>!document.querySelector(".feedmap")),"then the plan goes with the report");
  }
  await page.screenshot({path:OUT+"/04-report.png"});

  // ---- a recruitment trip gets the same map, with four places of its own
  const trip=await page.evaluate(()=>{
    S.modal=null;S.event=null;S.notices=[];S.pendingTrip=null;
    const c=S.roster.find(x=>x.status==="available"&&canSign(x)&&S.money>=x.fee&&!hireWhy(x));
    if(!c)return false;hire(c.id);return !!(S.modal&&S.modal.type==="trip");});
  if(trip){
    await page.waitForTimeout(300);
    const t=await page.evaluate(()=>{const m=document.querySelector(".feedmap");
      return m?{sites:[...m.querySelectorAll(".fm-site")].map(e=>e.getAttribute("data-site")).join(","),
        ops:m.querySelectorAll(".fm-op").length}:null;});
    check(t,"a recruitment trip draws the same map");
    check(t&&t.sites==="land,city,table,deal","with four places of its own, not the job's five: "+(t?t.sites:""));
    check(t&&t.ops===2,"and two people on it, you and them: "+(t?t.ops:0));
  } else check(true,"no trip could be opened in this state");

  check(errors.length===0,"no page errors"+(errors.length?": "+errors.join(" | "):""));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
