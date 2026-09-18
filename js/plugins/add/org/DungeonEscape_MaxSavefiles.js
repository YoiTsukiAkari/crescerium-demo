//=============================================================================
// DungeonEscape_MaxSavefiles.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc セーブファイルの最大件数を変更します Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @param maxSavefiles
 * @text 最大セーブ件数
 * @desc セーブ画面に表示・使用可能なセーブファイルの最大件数(標準は20)
 * @type number
 * @min 1
 * @default 100
 *
 * @help DungeonEscape_MaxSavefiles.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * ツクールMZ標準の DataManager.maxSavefiles() は固定で20を返しますが、
 * このプラグインを導入すると、プラグインパラメータ「最大セーブ件数」の
 * 値に差し替えられます。
 *
 * 導入するだけで動作します。読み込み順は特に指定なし。
 *
 * ------------------------------------------------------------------
 * ◆注意
 * ------------------------------------------------------------------
 * 件数を大きくすると、セーブ/ロード画面の一覧スクロールが長くなります。
 * 見た目・操作感が気になる場合は、Scene_File系のウィンドウ構成を
 * 別途調整してください(このプラグインは最大件数のみを変更します)。
 */

(() => {
    "use strict";
    const pluginName = "DungeonEscape_MaxSavefiles";
    const params = PluginManager.parameters(pluginName);
    const maxSavefiles = Number(params.maxSavefiles || 100);

    DataManager.maxSavefiles = function () {
        return maxSavefiles;
    };
})();
