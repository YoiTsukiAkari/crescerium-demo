/*:
 * @target MZ
 * @plugindesc v0.7 Mobile gestures: flick/hold, double-tap OK, two-finger Cancel, instant two-finger dash.
 * @author OpenAI
 *
 * @help
 * Crescerium_MobileGesture.js
 *
 * Mobile only:
 * - Single-finger flick: one directional input
 * - Single-finger swipe + hold: hold direction
 * - Direction changes use the latest turn point as a new anchor
 * - Double tap: OK
 * - Stationary two-finger short tap: Cancel
 * - While moving, add a second finger: Dash after a very short hold
 * - Put one finger down, then move the second finger: Dash in the
 *   second finger's direction
 * - During second-finger dash, that finger controls direction changes
 * - Release the second finger: Dash ends; remaining finger can continue
 *   normal movement
 * - Map tap-to-destination movement: disabled
 *
 * v0.7:
 * - Dash now starts immediately when a second finger is added during movement.
 * - Touches are tracked by identifier.
 * - The second finger can become the movement finger and start a dash.
 * - MZ built-in multi-touch Cancel remains suppressed; this plugin
 *   decides whether a two-finger gesture means Cancel or Dash.
 *
 * PC/non-mobile behavior is unchanged.
 */
(() => {
"use strict";
if (!Utils.isMobileDevice()) return;

// ---- Tuning values ----------------------------------------------------
const DIR_THRESHOLD = 24;
const FLICK_MAX_MS = 280;
const TAP_MOVE_TOLERANCE = 14;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_DISTANCE = 36;
const TWO_TAP_MAX_MS = 280;
const TWO_TAP_MOVE = 18;
// -----------------------------------------------------------------------

const g = {
    active: false,
    primaryId: null,
    moveId: null,
    sx: 0, sy: 0, x: 0, y: 0,
    anchorX: 0, anchorY: 0,
    start: 0,
    dir: null,
    held: null,

    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,

    twoActive: false,
    secondId: null,
    twoStartedWhileMoving: false,
    twoStartTime: 0,
    twoStartPoints: new Map(),
    twoMoved: false,
    secondTimer: 0,
    dash: false
};

const codes = {
    left: 37, up: 38, right: 39, down: 40,
    ok: 13, cancel: 27, shift: 16
};

function p(t) {
    return {
        x: Graphics.pageToCanvasX(t.pageX),
        y: Graphics.pageToCanvasY(t.pageY)
    };
}
function distance(a,b) {
    return Math.hypot(b.x-a.x, b.y-a.y);
}
function touchById(list,id) {
    if (id == null) return null;
    for (let i=0;i<list.length;i++) {
        if (list[i].identifier===id) return list[i];
    }
    return null;
}
function dirFrom(dx,dy) {
    if (Math.abs(dx)<DIR_THRESHOLD && Math.abs(dy)<DIR_THRESHOLD) return null;
    if (Math.abs(dx)>Math.abs(dy)) return dx>0 ? "right" : "left";
    return dy>0 ? "down" : "up";
}
function symbol(name) {
    return Input.keyMapper[codes[name]];
}
function keyDown(name) {
    const s=symbol(name);
    if (s) Input._currentState[s]=true;
}
function keyUp(name) {
    const s=symbol(name);
    if (s) Input._currentState[s]=false;
}
function holdDirection(name) {
    if (g.held===name) return;
    if (g.held) keyUp(g.held);
    g.held=name;
    if (name) keyDown(name);
}
function setDash(on) {
    if (g.dash===on) return;
    g.dash=on;
    if (on) keyDown("shift");
    else keyUp("shift");
}
function pulse(name) {
    const s=symbol(name);
    if (!s) return;
    Input._currentState[s]=true;
    setTimeout(()=>{ Input._currentState[s]=false; },50);
}
function clearSecondTimer() {
    if (g.secondTimer) {
        clearTimeout(g.secondTimer);
        g.secondTimer=0;
    }
}
function beginMoveFinger(t, preserveStart=false) {
    const q=p(t);
    g.moveId=t.identifier;
    if (!preserveStart) {
        g.sx=q.x; g.sy=q.y;
        g.start=performance.now();
    }
    g.x=q.x; g.y=q.y;
    g.anchorX=q.x; g.anchorY=q.y;
    g.dir=null;
}
function resetTwo() {
    clearSecondTimer();
    setDash(false);
    g.twoActive=false;
    g.secondId=null;
    g.twoStartedWhileMoving=false;
    g.twoStartPoints.clear();
    g.twoMoved=false;
}
function resetAll() {
    holdDirection(null);
    resetTwo();
    g.active=false;
    g.primaryId=null;
    g.moveId=null;
    g.dir=null;
}

// Disable map destination auto-walk.
Scene_Map.prototype.processMapTouch = function() {};

// Suppress MZ's immediate built-in multi-touch Cancel.
// This plugin decides Cancel vs Dash.
const _TouchInput_onTouchStart = TouchInput._onTouchStart;
TouchInput._onTouchStart = function(event) {
    if (event.touches && event.touches.length>=2) {
        const touch=event.changedTouches && event.changedTouches[0];
        if (touch) {
            const x=Graphics.pageToCanvasX(touch.pageX);
            const y=Graphics.pageToCanvasY(touch.pageY);
            if (Graphics.isInsideCanvas(x,y)) this._onMove(x,y);
        }
        return;
    }
    _TouchInput_onTouchStart.call(this,event);
};

document.addEventListener("touchstart", e=>{
    if (e.touches.length===1) {
        const t=e.touches[0];
        g.active=true;
        g.primaryId=t.identifier;
        beginMoveFinger(t);
    } else if (e.touches.length===2) {
        const first=touchById(e.touches,g.primaryId) || e.touches[0];
        const second=(e.touches[0].identifier===first.identifier) ? e.touches[1] : e.touches[0];

        g.twoActive=true;
        g.secondId=second.identifier;
        g.twoStartedWhileMoving=!!(g.active && (g.dir || g.held));
        g.twoStartTime=performance.now();
        g.twoStartPoints.clear();
        for (let i=0;i<e.touches.length;i++) {
            g.twoStartPoints.set(e.touches[i].identifier,p(e.touches[i]));
        }
        g.twoMoved=false;

        if (g.twoStartedWhileMoving) {
            // Existing movement + second finger = immediate dash.
            setDash(true);
        }
    }
}, {passive:true});

document.addEventListener("touchmove", e=>{
    if (!g.active || e.touches.length<1) return;

    // Track whether either finger moved enough to stop being a 2-finger tap.
    if (g.twoActive) {
        for (let i=0;i<e.touches.length;i++) {
            const t=e.touches[i];
            const start=g.twoStartPoints.get(t.identifier);
            if (start && distance(start,p(t))>TWO_TAP_MOVE) {
                g.twoMoved=true;
            }
        }

        // If the gesture began stationary and the SECOND finger is the one
        // intentionally moved, make it the movement controller and dash.
        if (!g.twoStartedWhileMoving && !g.dash) {
            const second=touchById(e.touches,g.secondId);
            const secondStart=g.twoStartPoints.get(g.secondId);
            if (second && secondStart) {
                const q=p(second);
                const d=dirFrom(q.x-secondStart.x,q.y-secondStart.y);
                if (d) {
                    g.moveId=g.secondId;
                    g.x=q.x; g.y=q.y;
                    g.anchorX=q.x; g.anchorY=q.y;
                    g.dir=d;
                    holdDirection(d);
                    setDash(true);
                    g.twoMoved=true;
                }
            }
        }
    }

    // Current movement controller: normally first finger, but in the
    // "first finger rests + second finger moves" case it is the second.
    const mt=touchById(e.touches,g.moveId);
    if (!mt) return;

    const q=p(mt);
    g.x=q.x; g.y=q.y;

    const d=dirFrom(g.x-g.anchorX,g.y-g.anchorY);
    if (d && d!==g.dir) {
        g.dir=d;
        holdDirection(d);
        g.anchorX=g.x;
        g.anchorY=g.y;
    }
}, {passive:true});

document.addEventListener("touchend", e=>{
    const now=performance.now();

    if (g.twoActive && e.touches.length<2) {
        const duration=now-g.twoStartTime;
        const cancelGesture=
            !g.twoStartedWhileMoving &&
            !g.twoMoved &&
            duration<=TWO_TAP_MAX_MS;

        clearSecondTimer();
        setDash(false);

        if (cancelGesture) pulse("cancel");

        const remaining=e.touches.length===1 ? e.touches[0] : null;
        const releasedMoveFinger = remaining && g.moveId!==remaining.identifier;

        g.twoActive=false;
        g.secondId=null;
        g.twoStartedWhileMoving=false;
        g.twoStartPoints.clear();
        g.twoMoved=false;

        if (remaining && g.active) {
            // Whichever finger remains becomes normal-movement control.
            // Reset the anchor to avoid a direction jump.
            if (releasedMoveFinger) {
                holdDirection(null);
                g.dir=null;
            }
            g.moveId=remaining.identifier;
            g.primaryId=remaining.identifier;
            const q=p(remaining);
            g.x=q.x; g.y=q.y;
            g.anchorX=q.x; g.anchorY=q.y;
            return;
        }
    }

    if (e.touches.length===0 && g.active) {
        const elapsed=now-g.start;
        const moved=Math.hypot(g.x-g.sx,g.y-g.sy);
        const d=g.dir;

        holdDirection(null);
        setDash(false);

        if (d && elapsed<=FLICK_MAX_MS) pulse(d);

        // Double tap = OK. Single tap remains standard MZ touch behavior.
        if (!d && moved<=TAP_MOVE_TOLERANCE) {
            const near=Math.hypot(g.x-g.lastTapX,g.y-g.lastTapY)<=DOUBLE_TAP_DISTANCE;
            if (g.lastTapTime>0 &&
                now-g.lastTapTime<=DOUBLE_TAP_MS &&
                near) {
                pulse("ok");
                g.lastTapTime=0;
            } else {
                g.lastTapTime=now;
                g.lastTapX=g.x;
                g.lastTapY=g.y;
            }
        }

        g.active=false;
        g.primaryId=null;
        g.moveId=null;
        g.dir=null;
    }
}, {passive:true});

document.addEventListener("touchcancel",resetAll,{passive:true});
window.addEventListener("blur",resetAll);
})();
