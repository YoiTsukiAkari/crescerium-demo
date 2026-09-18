/*:
 * @target MZ
 * @plugindesc ピクチャをスクロール可能にする簡易プラグイン（端で停止・方向修正・Shift倍速対応）
 * @author You
 *
 * @command start
 * @text スクロール開始
 * @desc 指定したピクチャをスクロール可能にします。
 *
 * @arg pictureId
 * @text ピクチャ番号
 * @type number
 * @default 1
 *
 * @arg offsetAdjust
 * @text 表示高さ補正
 * @type text
 * @default -10
 * @desc dispH 計算時に加算される補正値（数値を文字列で入力。負の値も可）
 *
 * @arg commonId
 * @text 到達で呼ぶコモンイベント
 * @type number
 * @default 0
 * @desc 0で無効
 *
 * @arg callOnce
 * @text 到達で一度だけ呼ぶ
 * @type boolean
 * @default true
 * @desc true のとき到達で一度だけコモンイベントを呼ぶ（離脱で再度呼べるかは resetOnLeave に依存）
 *
 * @arg debounceFrames
 * @text デバウンス（フレーム）
 * @type number
 * @default 60
 * @desc callOnce=false の場合や連続予約を抑止したいときの最小間隔（フレーム）。0で無効
 *
 * @arg triggerType
 * @text トリガー種別
 * @type text
 * @default bottom
 * @desc bottom / top / percent
 *
 * @arg triggerPercent
 * @text トリガー割合
 * @type number
 * @default 100
 * @desc triggerType が percent のときの閾値（0～100）
 *
 * @arg resetOnLeave
 * @text 閾値離脱でリセット（コモン呼び直し可）
 * @type boolean
 * @default false
 *
 * @arg resetOnStop
 * @text stop実行でリセット
 * @type boolean
 * @default false
 *
 * @command stop
 * @text スクロール停止
 * @desc スクロール処理を停止し、元の位置に戻します。
 *
 * @help
 * 使い方：
 *   1. ピクチャを表示する（座標・原点・拡大率は自由）
 *   2. プラグインコマンド「スクロール開始」でピクチャ番号を指定
 *   3. マウスホイール / 上下キー / Shift倍速 / 画面端でスクロール可能
 *
 * 到達時の動作:
 *   - commonId にコモンイベント番号を指定すると到達時に $gameTemp.reserveCommonEvent(commonId) を呼びます。
 *   - callOnce=true のときは一度だけ呼び、resetOnLeave=true のとき離脱で再度呼べるようになります。
 *   - callOnce=false のときは到達判定が true の間毎フレーム予約されるため、debounceFrames で連続呼び出しを抑止できます（0で無効）。
 */

(() => {

    let scrolling = false;
    let pictureId = 1;
    let offsetY = 0; // 「ピクチャの表示」で指定した位置からの相対移動量
    let offsetAdjust = -10;

    // コモンイベント関連
    let watchCommonId = 0;
    let callOnce = true;
    let calledOnce = false;
    let debounceFrames = 60;
    let debounceCounter = 0;

    let triggerType = 'bottom';
    let triggerPercent = 100;
    let resetOnLeave = false;
    let resetOnStop = false;

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (scrolling) updateScrollInput();
        if (debounceCounter > 0) debounceCounter--;
    };

    function updateScrollInput() {
        const pic = $gameScreen.picture(pictureId);
        if (!pic) return;

        const spriteset = SceneManager._scene && SceneManager._scene._spriteset;
        if (!spriteset || !spriteset._pictureContainer) return;

        const sprite = spriteset._pictureContainer.children
            .find(s => s._pictureId === pictureId);
        if (!sprite || !sprite.bitmap) return;

        const imgHeight = sprite.bitmap.height;
        const screenH = Graphics.height;

        // 表示上の高さ（拡大率込み）
        const scaleY = pic._scaleY / 100;
        const dispH = imgHeight * scaleY + offsetAdjust;

        // 画像が画面より小さい場合はスクロール不要
        if (dispH <= screenH) {
            applyScroll(pic, 0);
            // 小さい場合は閾値判定も行う（top==0/minTop==screenH-dispH）
            checkTriggers(0, screenH - dispH, 0);
            return;
        }

        const base = 4;
        const fast = Input.isPressed("shift") ? base * 2 : base;

        // ホイール：下回転で「下へスクロール」（＝画像を上に動かす）
        const wheel = TouchInput.wheelY;
        if (wheel !== 0) {
            offsetY -= wheel * 0.5;
        }

        // 上下キー：上キー＝上方向を見る（画像を下へ）
        if (Input.isPressed("up")) offsetY += fast;
        if (Input.isPressed("down")) offsetY -= fast;

        // 「ピクチャの表示」で指定した位置から見た、画像の表示上端を計算
        const baseTop = (pic._origin === 1)
            ? pic._originY - dispH / 2   // 原点：中央
            : pic._originY;              // 原点：左上

        // 現在の表示上端
        let top = baseTop + offsetY;

        // 画面上での上下限
        const minTop = screenH - dispH;  // 画像を最大限上に（下端が画面下に揃う）
        const maxTop = 0;                // 画像を最大限下に（上端が画面上に揃う）

        if (top < minTop) top = minTop;
        if (top > maxTop) top = maxTop;

        // clamp 後の top から offsetY を再計算
        offsetY = top - baseTop;

        applyScroll(pic, offsetY);

        // 到達判定とアクション（コモンイベント）
        checkTriggers(top, minTop, maxTop);
    }

    function checkTriggers(top, minTop, maxTop) {
        let reached = false;
        // 許容誤差（ピクセル）
        const EPS = 1.0;

        if (triggerType === 'bottom') {
            if (Math.abs(top - minTop) <= EPS) reached = true;
        } else if (triggerType === 'top') {
            if (Math.abs(top - maxTop) <= EPS) reached = true;
        } else if (triggerType === 'percent') {
            const denom = (minTop - maxTop);
            const progress = denom === 0 ? 0 : (top - maxTop) / denom;
            if (progress >= (triggerPercent / 100) - 0.005) reached = true;
        }

        // --- コモンイベント処理 ---
        if (watchCommonId && watchCommonId > 0) {
            if (reached) {
                // デバウンス中ならスキップ
                if (debounceCounter > 0) {
                    return;
                }
                // callOnce が true の場合は既に呼んでいたらスキップ
                if (callOnce) {
                    if (!calledOnce) {
                        reserveCommonEventImmediately(watchCommonId);
                        calledOnce = true;
                        if (debounceFrames > 0) debounceCounter = debounceFrames;
                    }
                } else {
                    // 毎回到達時に呼ぶ（ただしデバウンスで間隔を確保）
                    reserveCommonEventImmediately(watchCommonId);
                    if (debounceFrames > 0) debounceCounter = debounceFrames;
                }
            } else {
                // 到達を離れたら calledOnce をリセット（resetOnLeave が true の場合）
                if (resetOnLeave && calledOnce) calledOnce = false;
            }
        }
    }

    function reserveCommonEventImmediately(watchCommonId) {
        // 即時実行（割り込み）版
        if ($dataCommonEvents && $dataCommonEvents[watchCommonId]) {
            const list = $dataCommonEvents[watchCommonId].list;
            // マップのインタプリタに直接セットして実行（現在のイベントを割り込ませる）
            $gameMap._interpreter.setup(list, 0);
        }
    }

    function applyScroll(pic, offY) {
        pic._y = pic._originY + offY;
    }

    // ピクチャ表示時に元位置を保存
    const _Game_Picture_show = Game_Picture.prototype.show;
    Game_Picture.prototype.show = function(name, origin, x, y, scaleX, scaleY, opacity, blendMode) {
        _Game_Picture_show.call(this, name, origin, x, y, scaleX, scaleY, opacity, blendMode);
        this._originY = y;
    };

    PluginManager.registerCommand("PictureScroll", "start", args => {
        pictureId = Number(args.pictureId || 1);

        // offsetAdjust は text 型で受け取るため文字列を数値化
        const parsed = Number(args.offsetAdjust);
        offsetAdjust = Number.isFinite(parsed) ? parsed : -10;

        // コモンイベント関連
        watchCommonId = Number(args.commonId || 0);
        callOnce = (args.callOnce === true || args.callOnce === 'true');
        calledOnce = false; // start 時は未呼び状態にリセット

        debounceFrames = Number(args.debounceFrames ?? debounceFrames) || 0;
        debounceCounter = 0;

        triggerType = (args.triggerType || 'bottom').toString();
        triggerPercent = Number(args.triggerPercent ?? 100);
        resetOnLeave = (args.resetOnLeave === true || args.resetOnLeave === 'true');
        resetOnStop = (args.resetOnStop === true || args.resetOnStop === 'true');

        scrolling = true;
        offsetY = 0;
        const pic = $gameScreen.picture(pictureId);
        if (pic) applyScroll(pic, 0);
    });

    PluginManager.registerCommand("PictureScroll", "stop", () => {
        const pic = $gameScreen.picture(pictureId);
        if (pic && pic._originY != null) {
            applyScroll(pic, 0);
        }
        offsetY = 0;
        scrolling = false;

        // stop 時のリセット（コモン関連）
        if (watchCommonId && watchCommonId > 0 && resetOnStop) {
            calledOnce = false;
            debounceCounter = 0;
        }
    });

})();
