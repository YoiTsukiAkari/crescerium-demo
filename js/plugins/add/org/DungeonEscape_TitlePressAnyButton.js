//=============================================================================
// DungeonEscape_TitlePressAnyButton.js
//=============================================================================

/*:ja
 * @target MZ
 * @plugindesc タイトル画面に「Press Any Button」演出を追加し、コマンドウィンドウの枠を完全に透過します Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @param pressAnyButtonText
 * @text 表示テキスト
 * @desc 最初に表示する案内テキスト
 * @default Press Any Button
 *
 * @param fontSize
 * @text フォントサイズ
 * @type number
 * @default 28
 *
 * @param textOffsetY
 * @text 表示Y座標の微調整
 * @desc コマンドウィンドウ位置(エディタのタイトル画面設定)を基準に、そこからさらにずらしたい場合の微調整値
 * @type number
 * @min -9999
 * @default 0
 *
 * @param blinkSpeed
 * @text 点滅の速さ
 * @desc 数値が大きいほどゆっくり点滅します(フレーム数)
 * @type number
 * @default 60
 *
 * @param hideCommandFrame
 * @text コマンド枠を完全に透過
 * @desc ONにすると、データベースの背景設定(ウィンドウ/暗くする/透明)に関わらず、枠線・暗転塗りつぶしの両方を含めて強制的に完全透明にします
 * @type boolean
 * @default false
 *
 * @help DungeonEscape_TitlePressAnyButton.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * タイトル画面で、最初は「ニューゲーム/コンティニュー/オプション」の
 * コマンドウィンドウを表示せず、代わりに点滅する案内テキスト
 * (「Press Any Button」等、プラグインパラメータで変更可)を表示します。
 * キーボード・マウス・タッチ、いずれかの入力があった時点で案内テキストを
 * 消し、コマンドウィンドウを表示します。
 *
 * また、コマンドウィンドウの枠線・暗転塗りつぶしを、データベースの
 * 背景設定に関わらず「コマンド枠を完全に透過」ONで強制的に消し、
 * 文字だけが浮いて見える状態にできます。項目ごとに標準で描画される
 * 読みやすさ用の背景矩形(drawBackgroundRect)も、このタイトル
 * コマンドウィンドウに限り無効化します(他のウィンドウには影響しません)。
 *
 * 案内テキストの表示位置は、データベース→システム→タイトル画面で
 * 設定したコマンドウィンドウのオフセット(位置)を自動で参照します。
 * さらに微調整したい場合は「表示Y座標の微調整」を使ってください。
 *
 * 一度コマンドウィンドウを表示した後でも、キャンセルボタン(Esc等)を
 * 押すと再び「Press Any Button」表示に戻り、絵をじっくり見返せます。
 *
 * ------------------------------------------------------------------
 * ◆注意
 * ------------------------------------------------------------------
 * 「コマンド枠を完全に透過」はプラグイン側で強制的に処理するため、
 * データベースの背景設定(ウィンドウ/暗くする/透明)がどれであっても
 * 同じ見た目(完全透明)になります。データベース側の設定を使い分けたい
 * 場合は、このパラメータをOFFにしてください。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";
    const pluginName = "DungeonEscape_TitlePressAnyButton";
    const params = PluginManager.parameters(pluginName);

    const pressAnyButtonText = String(params.pressAnyButtonText || "Press Any Button");
    const fontSize = Number(params.fontSize || 28);
    const textOffsetY = Number(params.textOffsetY || 0);
    const blinkSpeed = Number(params.blinkSpeed || 60);
    const hideCommandFrame = String(params.hideCommandFrame || "true") === "true";

    const _Scene_Title_create = Scene_Title.prototype.create;
    Scene_Title.prototype.create = function () {
        _Scene_Title_create.call(this);

        if (hideCommandFrame) {
            this._commandWindow.opacity = 0;
            this._commandWindow.frameVisible = false;
            this._commandWindow.hideBackgroundDimmer();
            // 項目ごとに描画される読みやすさ用の背景矩形も、このウィンドウに限り無効化する
            this._commandWindow.drawBackgroundRect = function (/*rect*/) {
                // 何もしない
            };
            this._commandWindow.refresh();
        }

        this._commandWindow.hide();
        this._commandWindow.deactivate();
        this._titleStarted = false;
        this._titleInputBound = null;
        this._commandWindow.setHandler("cancel", this.commandCancelToPressAnyButton.bind(this));

        this.createPressAnyButtonSprite();
    };

    Scene_Title.prototype.createPressAnyButtonSprite = function () {
        const width = Graphics.width;
        const height = fontSize + 16;
        const sprite = new Sprite(new Bitmap(width, height));
        sprite.bitmap.fontFace = $gameSystem.mainFontFace();
        sprite.bitmap.fontSize = fontSize;
        sprite.bitmap.outlineColor = "black";
        sprite.bitmap.outlineWidth = 6;
        sprite.bitmap.drawText(pressAnyButtonText, 0, 0, width, height, "center");
        sprite.x = 0;

        // コマンドウィンドウの実際の配置(エディタのオフセット込み)を基準に、
        // その中央あたりに表示する
        const rect = this.commandWindowRect();
        sprite.y = rect.y + (rect.height - height) / 2 + textOffsetY;

        this._pressAnyButtonSprite = sprite;
        this.addChild(sprite);
    };

    Scene_Title.prototype.updatePressAnyButtonBlink = function () {
        if (!this._pressAnyButtonSprite) return;
        const t = Graphics.frameCount % blinkSpeed;
        const half = blinkSpeed / 2;
        const phase = t < half ? t / half : (blinkSpeed - t) / half;
        this._pressAnyButtonSprite.opacity = 128 + Math.floor(127 * phase);
    };

    Scene_Title.prototype.startCommandSelection = function () {
        if (this._titleStarted) return;
        this._titleStarted = true;

        if (this._pressAnyButtonSprite) {
            this.removeChild(this._pressAnyButtonSprite);
            this._pressAnyButtonSprite = null;
        }
        this._commandWindow.show();
        this._commandWindow.open();
        // 「Press Any Button」を解除した入力そのものが、そのまま決定操作
        // として二重に処理されてしまわないよう、有効化を少し遅らせる
        this._commandActivateDelay = 10;

        this.removeAnyInputListener();
    };

    Scene_Title.prototype.commandCancelToPressAnyButton = function () {
        this._titleStarted = false;

        this._commandWindow.deactivate();
        this._commandWindow.hide();

        if (!this._pressAnyButtonSprite) {
            this.createPressAnyButtonSprite();
        }
    };

    Scene_Title.prototype.addAnyInputListener = function () {
        if (this._titleInputBound) return;
        this._titleInputBound = () => {
            this.startCommandSelection();
        };
        document.addEventListener("keydown", this._titleInputBound);
        document.addEventListener("mousedown", this._titleInputBound);
        document.addEventListener("touchstart", this._titleInputBound);
    };

    Scene_Title.prototype.removeAnyInputListener = function () {
        if (!this._titleInputBound) return;
        document.removeEventListener("keydown", this._titleInputBound);
        document.removeEventListener("mousedown", this._titleInputBound);
        document.removeEventListener("touchstart", this._titleInputBound);
        this._titleInputBound = null;
    };

    const _Scene_Title_update = Scene_Title.prototype.update;
    Scene_Title.prototype.update = function () {
        if (!this._titleStarted) {
            Scene_Base.prototype.update.call(this);
            this.updatePressAnyButtonBlink();
            if (!this.isBusy()) {
                this.addAnyInputListener();
            }
            return;
        }
        if (this._commandActivateDelay > 0) {
            this._commandActivateDelay--;
            if (this._commandActivateDelay <= 0) {
                this._commandWindow.activate();
            }
            Scene_Base.prototype.update.call(this);
            return;
        }
        _Scene_Title_update.call(this);
    };

    const _Scene_Title_terminate = Scene_Title.prototype.terminate;
    Scene_Title.prototype.terminate = function () {
        this.removeAnyInputListener();
        _Scene_Title_terminate.call(this);
    };
})();
