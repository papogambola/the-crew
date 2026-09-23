/* The week's paper opens over everything whenever a week begins, and its scrim swallows clicks —
   a drive that does not put it down times out on the next thing it presses, wherever that is,
   which reads as a failure in whatever the drive was actually about. And it is not once: every
   week the drive advances raises it again.

   So the paper is read and put down automatically for the whole run, through the game's own
   newsClose(), the way a player does before looking at anything else. Nothing is hidden by this:
   the paper queues ahead of the milestone boxes and the questions the game asks about your own
   crew, and those are what these drives are about. The drive that is about the paper itself
   closes it by clicking, like a reader. */
module.exports=async function putDownPaper(page,opts){
  /* Two of the same trade on one crew raises an argument that HAS to be answered before the game
     can be touched again — so a drive that hires four people and then tries to click something is
     blocked until it answers. Every drive that is not about the argument answers it by taking the
     first thing on the list, which is what the hook below does. The drive that IS about it passes
     {clash:false} and answers it properly, like a player. */
  const settleClash=!opts||opts.clash!==false;
  await page.evaluate(()=>{
    if(window.__paperPutDown)return;
    window.__paperPutDown=true;
    if(typeof render!=="function")return;
    const _r=render;
    render=function(){
      _r.apply(null,arguments);
      if(typeof S!=="undefined"&&S&&S.modal&&S.modal.type==="news"){
        if(typeof newsClose==="function")newsClose(); else S.modal=null;
        _r.apply(null,arguments);
      }
      // Only when it is the thing in the way. clashClose() clears S.modal, which is right when
      // the argument is what is on screen and very wrong when a job report is — settling it
      // blindly on every render was closing whatever modal the drive had just opened.
      if(window.__settleClash&&typeof S!=="undefined"&&S&&S.clash&&(!S.modal||S.modal.type==="clash")){
        if(!S.clash.outcome&&typeof clashApply==="function"){
          // Take the first answer that does not change the shape of the crew: several of them
          // cut somebody loose, bench them or send them to the second crew, and a drive that is
          // about something else should not quietly lose a soldier to a question it did not ask.
          const sc=CLASH_BY_K[S.clash.k];
          const keeps=o=>{const e=o.eff||{},b=o.badEff||{};
            return !(e.goneA||e.goneB||e.benchB||e.sendB||e.hurtA||b.goneA||b.goneB||b.benchB||b.sendB||b.hurtA);};
          let took=-1;
          for(let i=0;i<sc.opts.length;i++)if(clashCan(sc.opts[i])&&keeps(sc.opts[i])){took=i;break;}
          if(took<0)for(let i=0;i<sc.opts.length;i++)if(clashCan(sc.opts[i])){took=i;break;}
          if(took>=0)clashApply(took);
        }
        if(typeof clashClose==="function")clashClose(); else S.clash=null;
        _r.apply(null,arguments);
      }
    };
    if(typeof S!=="undefined"&&S&&S.modal&&S.modal.type==="news"){
      if(typeof newsClose==="function")newsClose(); else S.modal=null;
      render();
    }
  },undefined);
  await page.evaluate(v=>{window.__settleClash=v;},settleClash);
  await page.waitForTimeout(120);
};
