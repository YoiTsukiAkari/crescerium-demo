/*:
 * @target MZ
 * @plugindesc ダメージを伴うスキルで、実際のダメージが0だった場合
 * (耐性等で無効化された場合)、そのスキルのステート付加・解除効果も
 * 発動しないようにする汎用プラグイン Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_ZeroDamageNoState.js
 *
 * ------------------------------------------------------------------
 * ◆背景
 * ------------------------------------------------------------------
 * RPGツクールMZ標準の仕様では、「ダメージ＋ステート付加/解除」という
 * 構成の技(例：フルメン＝雷ダメージ＋空中ステート解除)は、対象が
 * その属性に耐性を持っていて実際のダメージが0になった場合でも、
 * ステート付加・解除の効果は**ダメージ量と無関係に発動してしまう**。
 *
 * このプラグインは、ダメージ計算のある技(ダメージタイプが「HPダメージ」
 * または「MPダメージ」)に限り、実際のダメージが0だった場合、
 * その技に付随するステート付加・解除効果も発動しないようにする。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 導入するだけで、ゲーム内の全てのダメージ技に自動的に適用されます。
 * 特別なタグ設定は不要です。
 *
 * ダメージタイプが「なし」の技（ステート付加・解除のみを行う技。
 * 例：死兆の一撃、疫病の爪のうちダメージなし版など）には一切
 * 影響しません（それらは元々ダメージが存在しないため、この判定の
 * 対象外です）。
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・「回復」（マイナスダメージ）を伴う技には影響しません。
 * ・耐性等ではなく、単に威力設定などで元々ダメージが0になる技の
 *   場合も、同様にステート効果が発動しなくなります。
 */

(() => {
  "use strict";

  function isBlockedByZeroDamage(action, target) {
    const item = action.item();
    if (!item) return false;
    // ダメージタイプが「HPダメージ」または「MPダメージ」の技のみ対象
    if (item.damage.type !== 1 && item.damage.type !== 2) return false;

    const result = target.result();
    const damageValue =
      item.damage.type === 1 ? result.hpDamage : result.mpDamage;
    return damageValue === 0;
  }

  const _Game_Action_itemEffectAddState = Game_Action.prototype.itemEffectAddState;
  Game_Action.prototype.itemEffectAddState = function(target, effect) {
    if (isBlockedByZeroDamage(this, target)) return;
    _Game_Action_itemEffectAddState.call(this, target, effect);
  };

  const _Game_Action_itemEffectRemoveState = Game_Action.prototype.itemEffectRemoveState;
  Game_Action.prototype.itemEffectRemoveState = function(target, effect) {
    if (isBlockedByZeroDamage(this, target)) return;
    _Game_Action_itemEffectRemoveState.call(this, target, effect);
  };
})();
