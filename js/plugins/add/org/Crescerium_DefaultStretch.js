/*:
 * @target MZ
 * @plugindesc ブラウザ版を含め、ゲーム起動時のStretch（拡大表示）を常にONにします。
 * @author ChatGPT
 *
 * @help
 * ■概要
 * ゲーム起動時の画面ストレッチを常にONにします。
 * これにより、PCブラウザ版でも最初から拡大表示で始まります。
 *
 * ■特徴
 * ・Windows版 / ブラウザ版 / スマホ版を問わず初期状態をStretch ONにする
 * ・F3によるON/OFF切り替えはそのまま使える
 * ・パラメータなし
 *
 * ■使い方
 * このファイルを js/plugins/ に入れ、
 * プラグイン管理で有効化してください。
 */

(() => {
    "use strict";

    // 起動時のデフォルトStretch設定を常にONにする
    Graphics._defaultStretchMode = function() {
        return true;
    };

    // 念のため、ブート開始時にもStretchをONにして反映する
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        Graphics._stretchEnabled = true;
        if (Graphics._updateAllElements) {
            Graphics._updateAllElements();
        }
        _Scene_Boot_start.call(this);
    };
})();