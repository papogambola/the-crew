"""The private side. One page and one JSON endpoint, both behind `admin_page`.

Served by the API rather than from the site, which is the opposite of how `reset.html` works and
is deliberate. A page on playthecrew.com is a file on GitHub Pages: it can be fetched by anybody,
so the most it could ever be is a login box in front of protected data. The requirement was that
the dashboard itself be server-protected, so it has to come from the thing that can refuse to
serve it — and that is here.

The page carries no data. It asks for it, with the credentials the browser is already holding for
this origin after the Basic prompt, so there is no token to paste and no second sign-in."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.analytics import RANGES, summarise
from app.database import get_db
from app.deps import admin_page
from app.models import Player

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/analytics/data")
def analytics_data(window: str = Query("7d"), db: Session = Depends(get_db),
                   _: Player = Depends(admin_page)) -> dict:
    """Every number on the page, in one call. An unknown window falls back to a week rather than
    erroring: the only caller is the page itself, and a dashboard that shows an error because a
    query string was fiddled with is a dashboard that looks broken when it is not."""
    return summarise(db, window if window in RANGES else "7d")


@router.get("/analytics", response_class=HTMLResponse)
def analytics_page(_: Player = Depends(admin_page)) -> HTMLResponse:
    # no-store: this is the one page on the server whose contents are nobody else's business, and
    # a shared proxy caching it is the one way it could become somebody else's.
    return HTMLResponse(PAGE, headers={"Cache-Control": "no-store, max-age=0",
                                       "Referrer-Policy": "no-referrer",
                                       "X-Robots-Tag": "noindex, nofollow"})


# ============================== THE PAGE ==============================
#
# Black ink on white paper, like the game, and for the same reason: there is one house style and a
# dashboard that looks like a different product is a dashboard that feels like somebody else's.
#
# NO CHART LIBRARY, matching the rest of this project — the game is 14,000 lines with no
# dependencies and this is not the place to start. The charts are inline SVG built from the JSON.
#
# HOW IDENTITY IS ENCODED, since there is no colour to spare: new against returning is the only
# two-series chart here, and the two are told apart by FILL — solid ink against a hatch — with a
# legend and a direct label on each. Never by shade alone, which is the one thing a monochrome
# chart must not do: two greys are indistinguishable in print, at a glance, and to a good share of
# the people who would read it.
PAGE = r"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<!-- An empty data: icon, so the browser does not ask this API for /favicon.ico and get a 404 it
     then prints in the console of the one page where a red line looks like a broken dashboard. -->
<link rel="icon" href="data:,">
<title>The Crew — playtime</title>
<style>
  :root{--ink:#111010;--ink-2:#55514e;--ink-3:#8d8882;--paper:#fff;--rule:#e2ddd6;--hair:#f0ece6}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);
       font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
       -webkit-font-smoothing:antialiased}
  .wrap{max-width:1180px;margin:0 auto;padding:28px 20px 80px}
  h1{font-size:19px;letter-spacing:.14em;text-transform:uppercase;margin:0}
  .sub{color:var(--ink-3);font-size:12px;margin-top:6px}
  .bar{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;
       border-bottom:2px solid var(--ink);padding-bottom:14px;margin-bottom:22px}
  .ranges{display:flex;gap:6px}
  .ranges a{display:block;padding:6px 12px;border:1px solid var(--rule);color:var(--ink-2);
            text-decoration:none;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
  .ranges a[aria-current]{background:var(--ink);border-color:var(--ink);color:#fff}
  .ranges a:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
  /* The rules are drawn on the TILES, not by letting a grey container show through a 1px gap.
     The gap trick needs the tile count to divide the column count exactly, and the moment an
     eleventh tile was worth having it left a grey rectangle where the twelfth would go. Borders
     on the tiles mean a short last row is simply short. */
  .tiles{display:grid;grid-template-columns:repeat(4,1fr);background:var(--paper);
         border-top:1px solid var(--rule);margin-bottom:28px}
  @media(max-width:900px){.tiles{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:520px){.tiles{grid-template-columns:1fr}}
  .t{background:var(--paper);padding:14px 16px;
     border-bottom:1px solid var(--rule);border-left:1px solid var(--rule)}
  .t:last-child{border-right:1px solid var(--rule)}
  .t .k{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
  .t .v{font-size:27px;line-height:1.15;margin-top:7px;font-variant-numeric:tabular-nums}
  .t .n{font-size:11px;color:var(--ink-3);margin-top:3px}
  .live .v{position:relative;padding-left:16px}
  .live .v::before{content:"";position:absolute;left:0;top:11px;width:8px;height:8px;
                   border-radius:50%;background:var(--ink)}
  section{margin-bottom:34px}
  h2{font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2);
     margin:0 0 12px;padding-bottom:7px;border-bottom:1px solid var(--rule)}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:28px}
  @media(max-width:820px){.grid2{grid-template-columns:1fr}}
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  th{text-align:left;font-weight:400;font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;
     color:var(--ink-3);padding:0 10px 7px 0;border-bottom:1px solid var(--rule);white-space:nowrap}
  td{padding:7px 10px 7px 0;border-bottom:1px solid var(--hair);
     font-variant-numeric:tabular-nums;white-space:nowrap}
  td.num,th.num{text-align:right}
  .tag{font-size:10px;letter-spacing:.07em;text-transform:uppercase;border:1px solid var(--ink);
       padding:1px 6px}
  .tag.new{background:var(--ink);color:#fff}
  .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--ink);
       margin-right:6px;vertical-align:1px}
  .legend{display:flex;gap:18px;font-size:11px;color:var(--ink-2);margin:0 0 10px}
  .legend i{display:inline-block;width:11px;height:11px;margin-right:6px;vertical-align:-1px;
            border:1px solid var(--ink)}
  .legend i.solid{background:var(--ink)}
  .legend i.hatch{background:var(--paper)}
  .empty{color:var(--ink-3);font-size:12.5px;padding:20px 0}
  svg{display:block;width:100%;height:auto;overflow:visible}
  svg text{font:10px ui-monospace,monospace;fill:var(--ink-3)}
  svg text.lab{fill:var(--ink-2)}
  .foot{margin-top:40px;padding-top:14px;border-top:1px solid var(--rule);
        font-size:11px;color:var(--ink-3);line-height:1.7}
  .foot b{color:var(--ink-2);font-weight:400}
</style>
</head><body>
<div class="wrap">
  <div class="bar">
    <div><h1>Playtime</h1><div class="sub" id="sub">reading…</div></div>
    <nav class="ranges" id="ranges" aria-label="Date range">
      <a href="?window=today" data-w="today">Today</a>
      <a href="?window=7d" data-w="7d">7 days</a>
      <a href="?window=30d" data-w="30d">30 days</a>
      <a href="?window=all" data-w="all">All time</a>
    </nav>
  </div>
  <div id="body"></div>
  <div class="foot">
    <b>What this knows about anybody:</b> an anonymous id the browser made up, when a sitting
    started, when it last checked in, and how many milliseconds of it were play. No account, no
    email, no address, no location, no device. A cleared cache is a new player here.<br>
    <b>Active playtime</b> accrues only while the tab is visible and somebody is touching it; it
    stops after 90 seconds of nothing and a gap of 30 minutes starts a new sitting. A session with
    no goodbye is worth what its last checkpoint said, never more.
  </div>
</div>
<script>
(function(){
  var W=new URLSearchParams(location.search).get("window")||"7d";
  if(["today","7d","30d","all"].indexOf(W)<0)W="7d";
  [].forEach.call(document.querySelectorAll("#ranges a"),function(a){
    if(a.dataset.w===W)a.setAttribute("aria-current","page");});

  var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});};
  /* Durations read as a person would say them. 0 is "—" rather than "0s": a dash is obviously
     nothing, and 0s invites a second look at whether the number is broken. */
  var dur=function(ms){
    ms=Math.max(0,Math.round(ms||0));
    if(!ms)return "—";
    var s=Math.round(ms/1000);
    if(s<60)return s+"s";
    var m=Math.floor(s/60);
    if(m<60)return m+"m "+(s%60?(s%60)+"s":"");
    return Math.floor(m/60)+"h "+(m%60)+"m";
  };
  var clock=function(iso){
    if(!iso)return "—";
    var d=new Date(iso);
    return d.toLocaleDateString(undefined,{month:"short",day:"numeric"})+" "
      +d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
  };
  var day=function(k){var d=new Date(k+"T00:00:00Z");
    return d.toLocaleDateString(undefined,{month:"short",day:"numeric",timeZone:"UTC"});};

  /* ---- the charts. Inline SVG, no library, and every one of them a form that fits its job:
     a magnitude over time is a line, a count per named bucket is a bar, and a number with no
     shape to it is a tile and not a chart at all. ---- */
  var H=150, PAD={l:38,r:10,t:10,b:22};

  /* A TOP THAT IS A ROUND NUMBER, and as many gridlines as divide it into whole ones.
     The first version took the data's max and cut it in three, so a chart whose highest value was
     1 was labelled "0, 0, 1, 1" — the same number twice, and a third of a player. An axis that
     cannot be read is worse than no axis. */
  function nice(max){
    if(max<=0)return {top:1,n:1};
    if(max<=5)return {top:Math.ceil(max),n:Math.ceil(max)};
    var p=Math.pow(10,Math.floor(Math.log(max)/Math.LN10)),u=max/p;
    var top=(u<=2?2:u<=5?5:10)*p;
    return {top:top,n:(top/p)%4===0?4:(top/p)%3===0?3:2};
  }
  function axis(w,h,max,fmt){
    var N=nice(max),out="",i,y,v;
    for(i=0;i<=N.n;i++){
      v=N.top*i/N.n; y=PAD.t+(h-PAD.t-PAD.b)*(1-i/N.n);
      out+='<line x1="'+PAD.l+'" x2="'+(w-PAD.r)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)
        +'" stroke="'+(i?"var(--hair)":"var(--rule)")+'" stroke-width="1"/>';
      out+='<text x="'+(PAD.l-6)+'" y="'+(y+3.5).toFixed(1)+'" text-anchor="end">'
        +esc(fmt?fmt(v):String(Math.round(v)))+'</text>';
    }
    return out;
  }
  /* Dates under a chart, thinned so they never collide — the label step is computed from how many
     will fit rather than fixed, because 7 days and 370 days go through the same code. */
  function dates(days,w,h){
    var inner=w-PAD.l-PAD.r;
    var step=Math.max(1,Math.ceil(days.length/Math.max(2,Math.floor(inner/58))));
    var at=[],i;
    for(i=0;i<days.length;i+=step)at.push(i);
    /* The last date is always worth drawing — it is the one anybody looks for. But it lands
       wherever the window ends rather than on the step, so it can arrive a pixel after a stepped
       label and print "Sep 30Oct 2" on top of it. If it is too close, the stepped one gives way. */
    var last=days.length-1;
    if(at[at.length-1]!==last){
      if(last-at[at.length-1]<step*0.7)at.pop();
      at.push(last);
    }
    return at.map(function(i){
      var x=PAD.l+(days.length<2?inner/2:inner*i/(days.length-1));
      return '<text x="'+x.toFixed(1)+'" y="'+(h-6)+'" text-anchor="middle">'
        +esc(day(days[i].day))+'</text>';
    }).join("");
  }
  function line(days,pick,fmt){
    var w=560,h=H,inner=w-PAD.l-PAD.r,ih=h-PAD.t-PAD.b;
    var vals=days.map(pick), max=nice(Math.max(1,Math.max.apply(null,vals))).top;
    var X=function(i){return PAD.l+(days.length<2?inner/2:inner*i/(days.length-1));};
    var Y=function(v){return PAD.t+ih*(1-v/max);};
    var d=vals.map(function(v,i){return (i?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1);}).join("");
    var pts=vals.map(function(v,i){
      return '<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="4" fill="var(--ink)">'
        +'<title>'+esc(day(days[i].day))+" · "+esc(fmt?fmt(v):v)+'</title></circle>';}).join("");
    /* The last point gets its value written beside it and the others do not. A number on every
       point is a table pretending to be a chart. */
    var last=vals.length?('<text class="lab" x="'+(X(vals.length-1)+8)+'" y="'+(Y(vals[vals.length-1])+3.5)
      +'">'+esc(fmt?fmt(vals[vals.length-1]):vals[vals.length-1])+'</text>'):"";
    return '<svg viewBox="0 0 '+w+' '+h+'" role="img">'+axis(w,h,max,fmt)
      +'<path d="'+d+'" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>'
      +pts+last+dates(days,w,h)+'</svg>';
  }
  /* New against returning. Two series, so: a legend, a direct label on each, and the two told
     apart by FILL rather than by shade — solid ink and a hatch survive a photocopier, a
     projector and colour blindness, and two greys do not. 2px of paper between the stacked
     halves so the join is a join and not a smudge. */
  function stack(days){
    var w=560,h=H,inner=w-PAD.l-PAD.r,ih=h-PAD.t-PAD.b;
    var max=nice(Math.max(1,Math.max.apply(null,
      days.map(function(d){return d.new+d.returning;})))).top;
    var bw=Math.max(2,Math.min(26,inner/days.length-3)),out="";
    days.forEach(function(d,i){
      var x=PAD.l+inner*(i+0.5)/days.length-bw/2;
      var hn=ih*d.new/max, hr=ih*d.returning/max;
      var yr=PAD.t+ih-hr, yn=yr-hn;
      if(d.returning)out+='<rect x="'+x.toFixed(1)+'" y="'+yr.toFixed(1)+'" width="'+bw.toFixed(1)
        +'" height="'+Math.max(0,hr-(d.new?2:0)).toFixed(1)+'" fill="url(#hatch)" stroke="var(--ink)"'
        +' stroke-width="1" rx="2"><title>'+esc(day(d.day))+" · "+d.returning+' returning</title></rect>';
      if(d.new)out+='<rect x="'+x.toFixed(1)+'" y="'+yn.toFixed(1)+'" width="'+bw.toFixed(1)
        +'" height="'+Math.max(0,hn).toFixed(1)+'" fill="var(--ink)" rx="2">'
        +'<title>'+esc(day(d.day))+" · "+d.new+' new</title></rect>';
    });
    return '<svg viewBox="0 0 '+w+' '+h+'" role="img">'
      +'<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" '
      +'patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--paper)"/>'
      +'<line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" stroke-width="2"/></pattern></defs>'
      +axis(w,h,max)+out+dates(days,w,h)+'</svg>';
  }
  /* Named buckets in a fixed order, so: horizontal bars, labels read left to right, value written
     at the end of each. Never a pie — seven slices of one is a puzzle. */
  function bars(rows,label,value,note){
    var max=Math.max(1,Math.max.apply(null,rows.map(value)));
    return '<table><tbody>'+rows.map(function(r){
      var v=value(r),pc=100*v/max;
      return '<tr><td style="width:116px;color:var(--ink-2)">'+esc(label(r))+'</td>'
        +'<td style="width:100%;padding-right:0">'
        +'<div style="height:13px;background:var(--hair);position:relative">'
        +'<div style="position:absolute;inset:0 auto 0 0;width:'+pc.toFixed(1)+'%;'
        +'background:var(--ink);border-radius:0 2px 2px 0"></div></div></td>'
        +'<td class="num" style="width:74px">'+v+(note?'<span style="color:var(--ink-3)"> '
        +esc(note(r))+'</span>':'')+'</td></tr>';
    }).join("")+'</tbody></table>';
  }

  function tile(k,v,n,cls){
    return '<div class="t '+(cls||"")+'"><div class="k">'+esc(k)+'</div><div class="v">'+esc(v)
      +'</div>'+(n?'<div class="n">'+esc(n)+'</div>':'')+'</div>';
  }

  function draw(d){
    var t=d.totals,n=d.recent.length,sum=0;
    document.getElementById("sub").textContent=
      t.sessions+" sitting"+(t.sessions===1?"":"s")+" · "+t.players+" player"
      +(t.players===1?"":"s")+" · read "+new Date(d.generated_at).toLocaleTimeString();
    d.distribution.forEach(function(b){sum+=b.n;});

    var html=
      '<div class="tiles">'
      +tile("Unique players",t.players)
      +tile("Sessions",t.sessions)
      +tile("Playing now",t.live,"in the last 2 min","live")
      +tile("Hours played",t.hours)
      +tile("Average session",dur(t.avg_ms))
      +tile("Median session",dur(t.median_ms))
      +tile("Longest session",dur(t.longest_ms))
      /* Three numbers rather than two, because "new vs returning" and "did anybody come back" are
         different questions and one field cannot answer both. New and Returning partition the
         window by whether somebody existed before it; Came back counts anybody who sat down a
         second time, inside it or across it, and so overlaps New on purpose. */
      +tile("New players",t.new_players,"first ever sitting")
      +tile("Returning",t.returning_players,"were here before this window")
      +tile("Came back",t.came_back,t.return_rate+"% played more than once")
      +tile("Sessions per player",t.sessions_per_player)
      +'</div>';

    if(!t.sessions){
      html+='<div class="empty">Nothing in this window yet. Open the game, play for a minute, '
        +'and reload this page.</div>';
      document.getElementById("body").innerHTML=html;
      return;
    }

    html+='<div class="grid2">'
      +'<section><h2>Players by day</h2>'+line(d.days,function(x){return x.players;})+'</section>'
      +'<section><h2>Sessions by day</h2>'+line(d.days,function(x){return x.sessions;})+'</section>'
      /* Plotted in milliseconds and WRITTEN as a duration, rather than plotted in whole minutes.
         Rounding to minutes first made every day of a game people play for forty seconds read as
         a flat zero — a chart that says the thing it exists to measure never happens. */
      +'<section><h2>Average playtime by day</h2>'
        +line(d.days,function(x){return x.avg_ms;},function(v){return v?dur(v):"0";})
      +'</section>'
      +'<section><h2>New and returning, by day</h2>'
        +'<p class="legend"><span><i class="solid"></i>New</span>'
        +'<span><i class="hatch" style="background:repeating-linear-gradient('
        +'45deg,var(--ink) 0 2px,var(--paper) 2px 6px)"></i>Returning</span></p>'
        +stack(d.days)
      +'</section>'
      +'</div>';

    html+='<div class="grid2">'
      +'<section><h2>How long a sitting lasts</h2>'
        +bars(d.distribution,function(r){return r.label;},function(r){return r.n;},
              function(r){return sum?"("+Math.round(100*r.n/sum)+"%)":"";})
      +'</section>'
      +'<section><h2>Sittings that got past</h2>'
        +bars(d.milestones,function(r){return r.minutes<60?r.minutes+" min":(r.minutes/60)+" hour"
              +(r.minutes>60?"s":"");},function(r){return r.sessions;},
              function(r){return t.sessions?"("+Math.round(100*r.sessions/t.sessions)+"%)":"";})
      +'</section>'
      +'</div>';

    html+='<section><h2>Recent sessions</h2><table>'
      +'<thead><tr><th>Player</th><th>Started</th><th>Ended</th>'
      +'<th class="num">Active playtime</th><th>New / returning</th></tr></thead><tbody>'
      +d.recent.map(function(r){
        return '<tr><td>'+(r.live?'<span class="dot" title="playing now"></span>':'')
          +esc(r.anon)+'</td>'
          +'<td>'+esc(clock(r.started))+'</td>'
          +'<td>'+(r.live?'<span style="color:var(--ink-3)">still playing</span>':esc(clock(r.ended)))+'</td>'
          +'<td class="num">'+esc(dur(r.active_ms))+'</td>'
          +'<td><span class="tag'+(r.is_new?" new":"")+'">'+(r.is_new?"New":"#"+r.session_no)+'</span></td></tr>';
      }).join("")+'</tbody></table></section>';

    document.getElementById("body").innerHTML=html;
  }

  /* The browser is already holding the Basic credentials for this origin, so this call carries
     them with no token to paste. A 401 here means the sign-in was dropped; reloading puts the
     prompt back up. */
  fetch("/admin/analytics/data?window="+encodeURIComponent(W),{credentials:"same-origin"})
    .then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json();})
    .then(draw)
    .catch(function(e){
      document.getElementById("sub").textContent="";
      document.getElementById("body").innerHTML='<div class="empty">Could not read the numbers ('
        +esc(e.message)+'). Reload to sign in again.</div>';
    });
})();
</script>
</body></html>
"""
