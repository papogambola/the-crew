/* THE DRAWER: more than one game, and a way back to last week.

   SAVE_KEY held exactly one game and was overwritten constantly, so there was no second
   campaign and no way back from a night that went wrong. Two long games were lost this month
   and the only remedy on offer was a code the player had to have thought to copy out first.

   What this pins down is the behaviour somebody would actually notice:
     - a named file survives, and opening it gives back the same game, to the penny
     - carbons are taken once a week, without being asked, and roll
     - a carbon never pushes out a named file, however many weeks go by
     - opening a file takes a carbon of where you were FIRST, so the one move in the drawer
       that could lose a game does not
     - and the drawer survives a reload, because it is the point of it. */
const {chromium,CHROME,ROOT,GAME}=require("./env.js");
const path=require("path");
const FILE=path.resolve(__dirname,process.argv[2]||GAME);
const check=(c,m)=>{if(!c){console.error("FAIL: "+m);process.exitCode=1;}else console.log("ok  "+m);};

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  const errs=[];page.on("pageerror",e=>errs.push(String(e)));
  await page.goto("file://"+FILE);
  await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await page.reload();
  await page.click('[data-act="begin"]');await page.fill("#pname","Sasha Varga");
  await page.click('[data-act="confirm-create"]');
  await page.waitForSelector(".topbar");
  const drain=async()=>{for(let i=0;i<30;i++){
    if(await page.$('[data-act="crewname-later"]'))await page.click('[data-act="crewname-later"]');
    else if(await page.$('[data-act="notice-close"].btn'))await page.click('[data-act="notice-close"].btn');
    else if(await page.$('[data-act="loose"]'))await page.click('[data-act="loose"][data-i="0"]');
    else break;
    await page.waitForTimeout(60);}};
  if(await page.$('[data-act="tut-skip"]'))await page.click('[data-act="tut-skip"]');
  await drain();

  console.log("— a named file —");
  const made=await page.evaluate(()=>{
    S.week=58;S.money=1890000;S.rep=61;S.notices=[];S.modal=null;save();
    const id=slotPut("the good one",false);
    return {id:id,list:slotIndex().map(r=>({id:r.id,auto:r.auto,label:r.label,week:r.week,money:r.money,n:r.n}))};
  });
  check(!!made.id,"a game goes into the drawer");
  check(made.list.length===1&&!made.list[0].auto,"and the drawer lists it, as a file not a carbon");
  check(made.list[0].week===58&&made.list[0].money===1890000&&made.list[0].label==="the good one",
    "with what you need to recognise it: week "+made.list[0].week+", "+made.list[0].money+", \""+made.list[0].label+"\"");

  console.log("\n— and it comes back the same game —");
  const round=await page.evaluate(id=>{
    /* Measured against what the FILE holds, not against the live game before it was filed.
       Rendering a game that has teleported to week 58 pays out the career milestones it never
       collected on the way — $50K and a few points of ranking — so those move once, on the
       first draw, and always will. The file is the contract; the milestones are the game. */
    const f=slotRead(id);
    const was={week:f.week,money:f.money,rep:f.rep,seed:f.seed,crew:(f.crewIds||[]).slice(),n:f.player.n};
    S.week=99;S.money=1;S.rep=2;save();            // wreck the live game
    slotOpen(id);
    const now={week:S.week,money:S.money,rep:S.rep,seed:S.seed,crew:S.crewIds.slice(),n:S.player.n};
    const again=slotRead(id);
    return {was,now,unchanged:again&&again.week===f.week&&again.money===f.money};
  },made.id);
  check(round.now.week===round.was.week,"the week comes back: "+round.now.week);
  check(round.now.money>=round.was.money&&round.now.rep>=round.was.rep,
    "money and ranking come back at least whole: "+round.now.money+" / "+round.now.rep
    +" from "+round.was.money+" / "+round.was.rep
    +(round.now.money>round.was.money?"  (the difference is milestones this teleported week had never collected)":""));
  check(round.unchanged,"and opening a file does not rewrite it");
  check(round.now.seed===round.was.seed,"the same seed, so the same world");
  check(JSON.stringify(round.now.crew)===JSON.stringify(round.was.crew),
    "and the same "+round.now.crew.length+" people, by id");

  console.log("\n— the carbon taken on the way, so opening a file cannot lose one —");
  const saved=await page.evaluate(()=>slotIndex().filter(r=>r.auto&&/before opening/.test(r.label||"")).length);
  check(saved>=1,"the wrecked game was filed before it was replaced ("+saved+" carbon)");

  console.log("\n— carbons roll, files do not —");
  const roll=await page.evaluate(()=>{
    const before=slotIndex();
    for(let i=0;i<14;i++)slotCarbon();             // fourteen weeks of them
    const a=slotIndex();
    return {keep:CARBONS,max:FILES_MAX,
      autos:a.filter(r=>r.auto).length,files:a.filter(r=>!r.auto).length,
      fileWasThere:before.some(r=>!r.auto),
      stillThere:a.some(r=>!r.auto&&r.label==="the good one")};
  });
  check(roll.autos===roll.keep,"fourteen weeks leaves "+roll.autos+" carbons, the last "+roll.keep);
  check(roll.stillThere,"and \"the good one\" is still in the drawer, untouched by any of them");
  check(roll.files===1,"exactly "+roll.files+" named file, which is what was put there");

  console.log("\n— every carbon still opens —");
  const each=await page.evaluate(()=>slotIndex().filter(r=>r.auto)
    .map(r=>({id:r.id,ok:!!slotRead(r.id)})));
  check(each.every(x=>x.ok),each.length+" carbons, all of them readable");

  console.log("\n— and the drawer survives closing the tab —");
  await page.reload();
  await page.waitForTimeout(600);
  const after=await page.evaluate(()=>{
    const a=slotIndex();
    return {n:a.length,file:a.find(r=>!r.auto)||null};
  });
  check(after.n>0,"after a reload the drawer still has "+after.n+" in it");
  check(after.file&&after.file.label==="the good one","including the named one");

  console.log("\n— the panel a player actually sees —");
  // A reload lands on the title screen with the game waiting behind Continue. Press it, the
  // way a player would — the cabinet only offers to file a game when there is one.
  if(await page.$('[data-act="continue"]')){await page.click('[data-act="continue"]');await page.waitForTimeout(400);await drain();}
  check(await page.evaluate(()=>!!S),"Continue puts the game back after a reload");
  await page.click(".burger");await page.waitForSelector(".office");
  await page.click('[data-act="off-cabinet"]');
  await page.waitForTimeout(300);
  const ui=await page.evaluate(()=>{
    const b=document.querySelector(".modal-b");
    return {rows:document.querySelectorAll('[data-act="slot-open"]').length,
      drops:document.querySelectorAll('[data-act="slot-drop"]').length,
      put:!!document.querySelector('[data-act="slot-put"]'),
      name:!!document.getElementById("slotName"),
      text:b?b.innerText.replace(/\s+/g," ").slice(0,150):"",
      row:(()=>{const o=document.querySelector('[data-act="slot-open"]');
        const r=o&&o.closest(".check");
        return r?r.innerText.replace(/\s+/g," ").trim():"";})()};
  });
  check(ui.rows===after.n,"the cabinet lists all "+ui.rows+" of them with a way in");
  check(ui.drops===after.n,"and a way to take each one out");
  check(ui.put&&ui.name,"and a box to name this game and file it");
  check(/week \d+/.test(ui.row)&&/ranking/i.test(ui.row)&&/\$/.test(ui.row),
    "a row says which game it is: \""+ui.row.slice(0,110)+"\"");

  // Taking one out really takes it out, storage and all.
  const gone=await page.evaluate(()=>{
    const r=slotIndex().find(x=>x.auto);const id=r.id;
    slotDrop(id);
    return {stillIndexed:slotIndex().some(x=>x.id===id),
            stillStored:localStorage.getItem("thecrew_slot_"+id)!==null};
  });
  check(!gone.stillIndexed&&!gone.stillStored,"and taking one out removes the file too, not just the line");

  check(errs.length===0,"no page errors"+(errs[0]?" ("+errs[0]+")":""));
  await browser.close();
})();
