//=============================================================================
// DungeonEscape_ComboRequireAlly.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 連携技(QuickSkillタグ付きスキル)は、相方が行動不能な間は
 * 選択できないようにします
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_ComboRequireAlly.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * `<QuickSkill>`タグ（Torigoya_QuickSkill.js）が付いた連携技は、
 * クレイ・セラ二人で行うものなので、相方が戦闘不能・凍結・恐怖・混乱・
 * 睡眠など「行動できない状態」の間は選択できないようにします。
 *
 * 個別のステートIDを列挙するのではなく、RPGツクールMZ標準の
 * canMove()（行動制約のあるステート全般・戦闘不能をまとめて判定する
 * 関数）を使っているため、今後新しい行動不能系ステートが増えても
 * 個別対応は不要です。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 導入するだけで動作します。設定項目はありません。
 * パーティは常にクレイ・セラの2人固定という前提で、
 * 「連携技を使おうとしている本人以外の、生存中の仲間」が
 * canMove()を満たしているかを判定します。
 */

(() => {
  "use strict";

  const _Game_BattlerBase_meetsUsableItemConditions = Game_BattlerBase.prototype.meetsUsableItemConditions;
  Game_BattlerBase.prototype.meetsUsableItemConditions = function(item) {
    if (!_Game_BattlerBase_meetsUsableItemConditions.call(this, item)) return false;

    if (item && item.meta && "QuickSkill" in item.meta && this.isActor()) {
      const ally = $gameParty.members().find(m => m !== this);
      if (ally && !ally.canMove()) {
        return false;
      }
    }
    return true;
  };
})();
