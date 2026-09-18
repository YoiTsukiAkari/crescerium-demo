/*:
 * @target MZ
 * @plugindesc 敵キャラのメモ欄タグで、指定したゲーム変数の値を線形補間し、
 * 端数ぶんを「確率」ではなく「決定的な周期」で配分して行動回数を
 * 決めるプラグイン Ver3.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_ActionCountVariable.js
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 敵キャラのメモ欄に、以下のタグを記述してください。
 *
 *   <actionCountVariable:変数ID,変数の最小値,変数の最大値,最小行動回数,最大行動回数>
 *
 * 例（難易度変数がID:1、1〜7の範囲、行動回数を1〜4回にしたい場合）:
 *   <actionCountVariable:1,1,7,1,4>
 *
 * ------------------------------------------------------------------
 * ◆Ver3.0.0の変更点（確率→決定的な周期に変更）
 * ------------------------------------------------------------------
 * 以前のVer2.0.0は、端数ぶんを「確率」で切り上げ/切り捨てしていたため、
 * 例えば理想値2.5(端数0.5)の場合、運が悪いと同じ回数(2回、または3回)が
 * 何ターンも連続することがあった。
 *
 * Ver3.0.0では「累積誤差法」（直線を綺麗なドット列で描く時などにも
 * 使われる考え方）を使い、ランダム性を排除して、端数の割合ぶんを
 * できるだけ均等な周期で配分するようにした。
 *
 * 例（理想値2.5、端数0.5）:
 *   1ターン目:2回 → 2ターン目:1回 → 3ターン目:2回 → 4ターン目:1回…
 *   （必ず1ターンおきに切り替わる、運の要素なし）
 *
 * 例（理想値2.33...、端数0.33...）:
 *   1ターン目:2回 → 2ターン目:1回 → 3ターン目:1回 → 4ターン目:2回…
 *   （3ターットに1回だけ多い回数になる、という周期になる）
 *
 * 累積値は敵1体ごとに保持され、戦闘開始時（Game_Enemyが新しく
 * 作られた時）にリセットされます。
 */

(() => {
  "use strict";

  const _Game_Battler_makeActionTimes = Game_Battler.prototype.makeActionTimes;
  Game_Battler.prototype.makeActionTimes = function() {
    if (this.isEnemy()) {
      const tag = this.enemy().meta.actionCountVariable;
      if (tag) {
        const [varId, minVar, maxVar, minActions, maxActions] = String(tag)
          .split(",")
          .map(Number);
        const varValue = $gameVariables.value(varId);
        const varRange = maxVar - minVar;
        const rate = varRange > 0 ? (varValue - minVar) / varRange : 1;
        const clampedRate = Math.max(0, Math.min(1, rate));

        const target = minActions + clampedRate * (maxActions - minActions);
        const floorVal = Math.floor(target);
        const frac = target - floorVal;

        if (this._actionCountAccumulator === undefined) {
          // 端数がある場合のみ「前借り」して1ターン目から切り上げ側を
          // 反映させる。端数がちょうど0の場合は前借りしない
          // （前借りしてしまうと、本来ボーナスが一切無いはずの
          // ターンでも誤って+1されてしまう）
          this._actionCountAccumulator = frac > 0 ? 1 - frac : 0;
        }

        this._actionCountAccumulator += frac;
        if (this._actionCountAccumulator >= 1 - 1e-9) {
          this._actionCountAccumulator -= 1;
          return floorVal + 1;
        }
        return floorVal;
      }
    }
    return _Game_Battler_makeActionTimes.call(this);
  };
})();
