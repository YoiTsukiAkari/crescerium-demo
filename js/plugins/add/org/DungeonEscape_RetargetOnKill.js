/*:
 * @target MZ
 * @plugindesc 指定した敵への複数回攻撃で、対象を倒したら残りの攻撃をランダムな生存中の敵に自動的に向けるプラグイン
 * @help
 * スキルのメモ欄に <retargetOnKill> と記述してください。
 * scope（範囲）は「敵単体」、repeats（連続回数）は3などお好みの回数に設定します。
 * 各ヒットの直前に対象が戦闘不能かどうかを判定し、戦闘不能ならその時点で
 * ランダムな生存中の敵に切り替えます。
 */

(() => {
  const _BattleManager_invokeAction = BattleManager.invokeAction;

  BattleManager.invokeAction = function(subject, target) {
    const action = this._action;
    if (
      action &&
      action.item() &&
      action.item().meta.retargetOnKill &&
      action.isForOpponent() &&
      target.isDead()
    ) {
      const alive = action.opponentsUnit().aliveMembers();
      if (alive.length > 0) {
        target = alive[Math.floor(Math.random() * alive.length)];
      }
    }
    _BattleManager_invokeAction.call(this, subject, target);
  };
})();