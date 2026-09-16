// The parts of the handbook that are the game's own tables, rendered from gamedata.json so they
// cannot drift from the game. Prose lives in hb-text.js; this file is facts.
const D=require("./gamedata.json");
const esc=s=>String(s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const money=n=>{n=Math.round(n);if(n>=1e6)return "$"+(n/1e6).toFixed(n>=1e7?1:2).replace(/\.?0+$/,"")+"M";
  if(n>=1e3)return "$"+Math.round(n/1000)+"K";return "$"+n;};
const T=(head,rows,cls)=>'<table class="'+(cls||"")+'"><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join("")+'</tr></thead><tbody>'
  +rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join("")+'</tr>').join("")+'</tbody></table>';

const ATTR_WHAT={
  muscle:"Carrying, forcing, holding a door, going up the outside of a building or coming up under it.",
  brains:"Planning, numbers, locks, reading a room's paperwork, and knowing where the kit is before anybody asks.",
  tech:"Networks, cameras, charges, circuits — anything on the air or under the water that has to be made to behave.",
  charm:"Talking your way in, selling a lie, running the person on the inside, being the name in the room.",
  nerve:"Holding still when it goes wrong. Driving it, flying it, sailing it, diving it, or walking in as though invited.",
};
// Whose attribute it is comes off the trades themselves, so adding a trade cannot leave a
// sentence here quietly naming the wrong four.
const leansOn=a=>{const t=(D.TECHS_ALL||D.TECHS).filter(x=>x.a===a).map(x=>x.l);
  return t.length<2?(t.length?"The "+t[0]+"'s.":"") : "The "+t.slice(0,-1).join("'s, the ")+"'s and the "+t[t.length-1]+"'s.";};
exports.attrs=()=>T(["","Attribute","What it is for","Whose attribute it is"],
  D.ATTRS.map(a=>['<b class="mono">'+D.ATTR_ABBR[a]+'</b>',esc(a[0].toUpperCase()+a.slice(1)),
    esc(ATTR_WHAT[a]),'<span class="note">'+esc(leansOn(a))+'</span>']));

// The place a trade stands is the map's own label, lowercased, so the handbook and the mini map
// call it the same thing — and a site the game adds cannot leave a blank cell here.
const SITE_WORD={};(D.SITES||[]).forEach(s=>{SITE_WORD[s.k]=s.l.replace(/^The /,"the ");});
const techTable=list=>T(["Trade","Leans on","Comes with","What they do","On the map"],
  list.map(t=>['<b>'+esc(t.l)+'</b>','<span class="mono">'+D.ATTR_ABBR[t.a]+'</span>',esc(t.know),esc(t.d),
    '<span class="mono">'+esc(SITE_WORD[(D.TECH_SITE||{})[t.k]]||"")+'</span>']));
exports.techs=()=>techTable(D.TECHS);
exports.bigTechs=()=>techTable(D.TECHS_BIG||[]);

exports.exp=()=>T(["Rank","Experience needed","What it is worth"],
  D.EXP.map((e,i)=>['<b>'+esc(e)+'</b>', i===0?'—':D.BAL.xpSteps[i]+' xp',
    '+'+Math.round(i*11)+'% on the reckoning'+(i===4?' — and only a Respected name gets one to sign':'')]));

exports.know=()=>T(["Domain","What a job wants it for"],
  [["Finance","Ledgers, accounts, where money actually sits."],["Law","Papers, borders, what a warrant can and cannot do."],
   ["Networks","Systems, cameras, cold wallets."],["Logistics","Routes, shipping, how a thing gets from here to there."],
   ["Art","Provenance, what a thing is worth and to whom."],["Politics","Who to call, who owes whom."],
   ["Medicine","Bodies, drugs, what a hospital notices."],["Weapons","What is in the room and what it does."],
   ["Maritime","Ports, hulls, tides, manifests."],["Aviation","Aircraft, airfields, flight plans."]].map(r=>['<b>'+r[0]+'</b>',r[1]]));

exports.edu=()=>T(["Schooling","Counts for"],
  D.EDU.map((e,i)=>['<b>'+esc(e)+'</b>','+'+(i*1.2).toFixed(1)+' on a job that leans on Brains']));

exports.traits=()=>T(["Temperament","What it does"],D.TRAITS.map(t=>['<b>'+esc(t.l)+'</b>',esc(t.d)]));

exports.limits=()=>T(["Limit","Keeps them off"],
  D.LIMITS.map(l=>['<b>'+esc(l.l)+'</b>', l.tag?'any job tagged <span class="mono">'+esc(D.TAG_LABEL[l.tag]||l.tag)+'</span>'
    :(l.k==="eu"?"any job in the EU":l.k==="us"?"any job in the United States":l.k==="auth"?"any job under authoritarian rule":"nothing — but they will not sign for under 15%")]));

const catTable=list=>T(["Kind of job","What it leans on"],
  list.map(c=>['<b>'+esc(c.l)+'</b>',Object.keys(c.w).map(a=>'<span class="mono">'+D.ATTR_ABBR[a]+'</span>×'+c.w[a]).join("  ")
    +(c.lang?'  <span class="note">— and this one is all talk, so the language matters double</span>':'')]));
exports.cats=()=>catTable(D.CATS);
exports.bigCats=()=>catTable(D.BIG_CATS||[]);

// What an operation is, beside the tier-4 work it sits above.
exports.bigVs=()=>T(["","A tier-4 job","An operation"],[
  ["In the field","4 to 5","<b>6 or 7</b> — and one that wants seven is <span class=\"mono\">+"+D.BAL.bigNeed7+"</span> on the difficulty"],
  ["Weeks on the ground",String(D.BAL.jobWeeks[4]),"3 to 5"],
  ["Trades named","1 to 2","3 to 5, most of them specialists"],
  ["Knowledge named","1","2 to 3"],
  ["Weeks you may case it",String(D.BAL.caseMax[4]),String(D.BAL.caseMax[5])],
  ["Base fee",money(D.BAL.payTier[4]),"<b>"+money(D.BAL.payTier[5])+"</b>"],
  ["Base difficulty","set by tier and country","<b>"+D.BAL.bigDiff+"</b> before country and name"],
  ["Heat it makes","by tier","<b>"+D.BAL.bigHeat+"</b>"],
  ["How many exist","as many as clients post","<b>"+D.BAL.bigCount+"</b>, and each is run once"],
]);

exports.ranks=()=>T(["Ranking","Name","Jobs pay","Postings up to","Will sign","Places","Heat","Loyalty drift"],
  D.RANKS.slice().sort((a,b)=>a[0]-b[0]).map(r=>[
    '<b class="mono">'+r[0]+'</b>','<b>'+esc(r[1])+'</b>',
    (r[2].pay>=1?'+':'−')+Math.abs(Math.round((r[2].pay-1)*100))+'%',
    'tier '+r[2].maxTier, esc(D.EXP[r[2].hireExp-1]||"anyone"), (1+r[2].seats),
    (r[2].heatMul>1?'+'+Math.round((r[2].heatMul-1)*100)+'%':'—'),
    (r[2].loyDrift>0?'+':'')+r[2].loyDrift+' a week']));

exports.verdicts=()=>T(["Verdict","The night","Pays","Ranking","Heat","Fallout"],
  [["CLEAN","above "+D.BAL.vClean,"the fee and 8% over","up, most","×0.5","nobody touched"],
   ["SUCCESS","above "+D.BAL.vSuccess,"the fee","up","×0.85","—"],
   ["MESSY","above "+D.BAL.vMessy,Math.round(D.BAL.messyPay*100)+"% of the fee","down a little","×1.25","loyalty −3"],
   ["BOTCHED","above "+D.BAL.vBotched,"nothing","down","×1.5","one hurt or held, loyalty −7"],
   ["DISASTER","below "+D.BAL.vBotched,"nothing","down hard","×1.9","two or three hurt or held, loyalty −13"]]
   .map(r=>['<b class="stamp">'+r[0]+'</b>','<span class="mono">'+r[1]+'</span>',r[2],r[3],'<span class="mono">'+r[4]+'</span>',r[5]]));

exports.retainers=()=>T(["Arrangement","A week","What it buys"],
  D.RETAINERS.map(r=>['<b>'+esc(r.l)+'</b>','<span class="mono">'+money(r.cost)+'</span>',esc(r.d)]));
exports.houses=()=>T(["Safe house","Once","What it buys"],
  D.SAFEHOUSES.map(h=>['<b>'+esc(h.l)+'</b>','<span class="mono">'+money(h.cost)+'</span>',esc(h.d)]));

exports.goals=()=>T(["Mark","What it takes","Pays"],
  D.GOALS.map(g=>['<b>'+esc(g.l)+'</b>',esc(g.d),
    [g.rep?'ranking +'+g.rep:'',g.money?money(g.money):''].filter(Boolean).join(' · ')||'—']));

exports.events=()=>T(["Between jobs","What happens"],
  D.WEEKLY.map(w=>['<b>'+esc(w.h.replace("{M}","Somebody").replace("{G}","An old face"))+'</b>',
    esc(w.text.replace(/\{M\}/g,"They").replace(/\{G\}/g,"They").replace(/\{L\}/g,"somebody").replace(/\{R\}/g,"another crew").replace(/\{B\}/g,"their boss").replace(/\{D\}/g,"a detective"))]));

exports.sites=()=>T(["On the plan","Who stands there"],
  D.SITES.map(p=>['<b>'+esc(p.l)+'</b>',
    D.TECHS.filter(t=>({wheelman:"exit",smuggler:"exit",cleaner:"exit",lookout:"watch",overwatch:"watch",hacker:"watch",launderer:"watch",fixer:"watch",forger:"door",grifter:"door",face:"door",infiltrator:"door",pickpocket:"door",safecracker:"inside",demolitions:"inside",enforcer:"inside"})[t.k]===p.k)
      .map(t=>esc(t.l)).join(", ")||'whoever the line is about']));

exports.pay=()=>T(["Tier","Postings called","Typical fee","Weeks on the ground","Weeks you may case it"],
  [1,2,3,4].map(t=>['<b class="mono">'+t+'</b>',
    esc(["","small","middling","big","the big rooms"][t]),
    '<span class="mono">'+money(D.BAL.payTier[t])+'</span> ×'+(1+D.BAL.payWeeks)+' per week',
    D.BAL.jobWeeks[t]+(D.BAL.jobWeeks[t]===1?' week':' weeks'),
    D.BAL.caseMax[t]]));

exports.D=D;exports.money=money;exports.esc=esc;exports.T=T;
