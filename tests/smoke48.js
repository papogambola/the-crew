// EVERY ANTHEM IS THE LENGTH OF THE CARD, AND AT THE LEVEL OF THE MUSIC.
//
// browser84 used to check this by building the anthem note by note through an OfflineAudioContext
// and comparing its peak with the city cue's. That was the right test when the anthem was a melody
// played on an oscillator — it is what caught the thing being mixed 15 dB under the cue, which is
// inaudible rather than underneath.
//
// The anthem is a recording now, so the question is a question about the FILE, and ffmpeg answers
// it exactly where a browser can only approximate: seven seconds, one channel, and the -14 LUFS the
// rest of the game's music is mastered to. Asked of all of them, not of a sample — the files come
// from forty-odd different recordings by different bands in different decades, and loudnorm can
// fail on any one of them without the other forty-five noticing.
//
// A clip that is too long is the visible failure: the card is up for ESTAB_MS and then goes, and an
// anthem still playing under the first line of the night is the old bug wearing a different hat.
const fs = require("fs"), path = require("path"), cp = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "music", "anthems");
let fails = 0;
const check = (c, m) => { if (!c) { console.error("FAIL: " + m); fails++; } else console.log("ok  " + m); };

// The card's length, read out of the game rather than typed here, so the two can never drift.
const game = fs.readFileSync(path.join(ROOT, "play.html"), "utf8");
const ms = Number((game.match(/const ESTAB_MS=(\d+);/) || [])[1]);
check(ms > 0, "the card is " + ms + " ms, and that is what a clip should be");

if (!fs.existsSync(DIR)) {
  console.log("skip  no music/anthems/ yet — python3 tools/anthem-audio.py --fetch");
  process.exit(0);
}
const files = fs.readdirSync(DIR).filter(f => f.endsWith(".mp3")).sort();
check(files.length > 0, files.length + " anthems on disk");

function ffprobe(f) {
  const out = cp.execFileSync("ffprobe", ["-v", "error",
    "-show_entries", "format=duration", "-show_entries", "stream=channels,sample_rate",
    "-of", "json", f], { encoding: "utf8" });
  const j = JSON.parse(out);
  return { dur: Number(j.format.duration), ch: j.streams[0].channels, hz: j.streams[0].sample_rate };
}
function loudness(f) {
  // ebur128 writes its summary to stderr; the integrated figure is the one that matters.
  const r = cp.spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", f, "-af", "ebur128=peak=true",
    "-f", "null", "-"], { encoding: "utf8" });
  const txt = (r.stderr || "");
  const i = txt.lastIndexOf("Integrated loudness");
  const lufs = Number((txt.slice(i).match(/I:\s*(-?[\d.]+)\s*LUFS/) || [])[1]);
  const peak = Number((txt.slice(i).match(/Peak:\s*(-?[\d.]+)\s*dBFS/) || [])[1]);
  return { lufs, peak };
}

const longAt = ms / 1000 + 0.35;      // mp3 frames do not land on an exact boundary
const shortAt = ms / 1000 - 1.0;      // a recording shorter than the card is a clip that ran out
const bad = { len: [], ch: [], loud: [], clip: [] };
for (const f of files) {
  const p = path.join(DIR, f);
  const a = ffprobe(p), l = loudness(p);
  if (!(a.dur <= longAt && a.dur >= shortAt)) bad.len.push(f + " " + a.dur.toFixed(2) + "s");
  if (a.ch !== 1) bad.ch.push(f + " " + a.ch + "ch");
  // Generous, because loudnorm is a single pass over real performances rather than a limiter: what
  // this has to catch is a file that is plainly not at the same level as the others.
  if (!(l.lufs >= -20 && l.lufs <= -9)) bad.loud.push(f + " " + l.lufs + " LUFS");
  if (!(l.peak <= -0.2)) bad.clip.push(f + " peak " + l.peak + " dBFS");
}
check(bad.len.length === 0, "every one is the card's length" + (bad.len.length ? " — except " + bad.len.slice(0, 4).join(", ") : " (" + (ms / 1000) + "s)"));
check(bad.ch.length === 0, "every one is mono" + (bad.ch.length ? " — except " + bad.ch.slice(0, 4).join(", ") : ""));
check(bad.loud.length === 0, "every one sits near -14 LUFS with the rest of the music" + (bad.loud.length ? " — except " + bad.loud.slice(0, 4).join(", ") : ""));
check(bad.clip.length === 0, "and none of them clips" + (bad.clip.length ? " — " + bad.clip.slice(0, 4).join(", ") : ""));

// The manifest and the disk agree, for the same reason ART_HAVE has to: the card decides whether to
// play an anthem or the cue BEFORE it starts, so a name listed without a file is seven seconds of
// silence over the skyline.
const listed = (game.match(/\/\* anthem-audio\.py:have \*\/const ANTHEM_HAVE=\[([^\]]*)\];/) || [])[1];
const names = listed ? (listed.match(/"([^"]+)"/g) || []).map(s => s.slice(1, -1)) : [];
const onDisk = files.map(f => f.slice(0, -4));
const listedNotThere = names.filter(n => onDisk.indexOf(n) < 0);
const thereNotListed = onDisk.filter(n => names.indexOf(n) < 0);
check(listedNotThere.length === 0, "every name in ANTHEM_HAVE has a file" + (listedNotThere.length ? " — missing " + listedNotThere.slice(0, 4).join(", ") : " (" + names.length + " listed)"));
check(thereNotListed.length === 0, "and every file is listed, or nothing would ever play it" + (thereNotListed.length ? " — unlisted " + thereNotListed.slice(0, 4).join(", ") : ""));

if (fails) { console.error(fails + " FAILED"); process.exitCode = 1; }
else console.log("ALL OK");
