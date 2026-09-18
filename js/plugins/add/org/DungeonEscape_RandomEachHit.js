//=============================================================================
// DungeonEscape_RandomEachHit.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc スキルのメモ欄タグで、連続回数(repeats)を持つスキルの対象を
 * ヒットごとに再抽選するプラグイン
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_RandomEachHit.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * RPGツクールMZの標準仕様では、スコープ「敵1体(ランダム)」+連続回数Nの
 * スキルは、「最初に1回だけランダムに対象を選び、同じ相手にN回ヒットさせる」
 * という挙動になります(対象はヒットのたびに再抽選されません)。
 *
 * このプラグインを使うと、ヒットのたびに独立して対象を再抽選できます。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * スキルのメモ欄に <randomEachHit> と記述してください。
 * スコープは「敵1体(ランダム)」のまま、連続回数を設定してください。
 *
 * 例: ワーグの「ランページ」(連続回数4)の場合
 *   <randomEachHit>
 *   → 4回のヒットそれぞれが独立して対象をランダムに選ぶようになります
 *     (同じ相手に連続でヒットすることもあれば、ばらけることもあります)
 *
 * 味方が使うスキル(スコープ「敵1体」でパーティが敵を狙う場合)にも同様に
 * 使用できます。
 *
 * ------------------------------------------------------------------
 * ◆連続ヒット中に対象が倒れる場合について
 * ------------------------------------------------------------------
 * このプラグイン単体では、対象は「行動が始まる前」にN回ぶんまとめて
 * 決定されるため、序盤のヒットで倒しきった敵を、後続のヒットが
 * 引き続き狙ってしまい不発になることがあります。
 *
 * これを防ぐには、同じスキルに DungeonEscape_RetargetOnKill.js の
 * <retargetOnKill> タグも一緒に付けてください。そちらが「各ヒットの
 * 直前に対象が戦闘不能かどうかを判定し、戦闘不能ならランダムな
 * 生存中の敵に切り替える」処理を担当します。このプラグイン
 * (RandomEachHit)は「ヒットごとに対象をばらけさせる」役割、
 * RetargetOnKillは「倒した相手を狙い続けない」役割、と
 * 分担して組み合わせて使う想定です。
 */

(() => {
  'use strict';

  const _Game_Action_repeatTargets = Game_Action.prototype.repeatTargets;

  Game_Action.prototype.repeatTargets = function(targets) {
    const item = this.item();
    if (item && item.meta.randomEachHit) {
      const unit = this.isForOpponent() ? this.opponentsUnit() : this.friendsUnit();
      const repeats = this.numRepeats();
      const repeatedTargets = [];
      for (let i = 0; i < repeats; i++) {
        const target = unit.randomTarget();
        if (target) repeatedTargets.push(target);
      }
      return repeatedTargets;
    }
    return _Game_Action_repeatTargets.call(this, targets);
  };
})();
