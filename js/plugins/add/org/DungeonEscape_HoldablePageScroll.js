//=============================================================================
// DungeonEscape_HoldablePageScroll.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc ページ送り(Q/Wキー、肩ボタン等)を押しっぱなしで連続動作させます Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_HoldablePageScroll.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * ツクールMZ標準では、上下左右のカーソル移動は押しっぱなしで連続的に
 * 動く(Input.isRepeated)一方、ページ送り(pagedown/pageup。Q/Wキーや
 * ゲームパッドの肩ボタンに割り当てられている)は1回押すごとに1回しか
 * 反応しない(Input.isTriggered)仕様になっている。
 *
 * このプラグインは Window_Selectable.prototype.processCursorMove を
 * 上書きし、ページ送り部分も上下左右と同じ Input.isRepeated に変更する。
 * これにより、件数の多いセーブ/ロード画面などで、Q/Wキーを押しっぱなし
 * にするだけで連続してページ送りできるようになる。
 *
 * この変更は特定の画面に限らず、ページ送り機能を使う全ての選択
 * ウィンドウに影響する(カーソル移動としてのページ送りのみが対象。
 * setHandler("pagedown", ...)等で個別にハンドラ登録されている
 * アクター切り替え等の動作には影響しない)。
 *
 * 導入するだけで動作します。読み込み順は特に指定なし。
 */

(() => {
    "use strict";

    Window_Selectable.prototype.processCursorMove = function () {
        if (this.isCursorMovable()) {
            const lastIndex = this.index();
            if (Input.isRepeated("down")) {
                this.cursorDown(Input.isTriggered("down"));
            }
            if (Input.isRepeated("up")) {
                this.cursorUp(Input.isTriggered("up"));
            }
            if (Input.isRepeated("right")) {
                this.cursorRight(Input.isTriggered("right"));
            }
            if (Input.isRepeated("left")) {
                this.cursorLeft(Input.isTriggered("left"));
            }
            // 以下2行のみ標準実装(isTriggered)から変更(isRepeated化)
            if (!this.isHandled("pagedown") && Input.isRepeated("pagedown")) {
                this.cursorPagedown();
            }
            if (!this.isHandled("pageup") && Input.isRepeated("pageup")) {
                this.cursorPageup();
            }
            if (this.index() !== lastIndex) {
                this.playCursorSound();
            }
        }
    };
})();
