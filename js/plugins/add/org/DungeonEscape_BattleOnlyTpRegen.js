//=============================================================================
// DungeonEscape_BattleOnlyTpRegen.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 「TP再生効果」による自動TP回復を、戦闘中のみに制限します
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_BattleOnlyTpRegen.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * RPGツクールMZの標準仕様では、ステートの「TP再生効果」は戦闘中の
 * ターン終了時だけでなく、マップ上でも20歩ごとに自動で発動します
 * （HP再生効果・MP再生効果も同様です）。
 *
 * このプラグインを導入すると、TP再生効果はマップ上では発動せず、
 * 戦闘中のみ機能するようになります。HP再生効果・MP再生効果には
 * 影響しません。
 *
 * 導入するだけで動作します。設定項目はありません。
 */

(() => {
    "use strict";

    const _Game_Battler_regenerateTp = Game_Battler.prototype.regenerateTp;
    Game_Battler.prototype.regenerateTp = function () {
        if (!$gameParty.inBattle()) return;
        _Game_Battler_regenerateTp.call(this);
    };
})();
