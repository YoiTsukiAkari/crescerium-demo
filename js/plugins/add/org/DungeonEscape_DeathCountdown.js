/*:
 * @target MZ
 * @plugindesc ステートのメモ欄タグで、そのステートを持ったまま指定ターン数の
 * ターン終了を迎えると戦闘不能になる効果を実装するプラグイン Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_DeathCountdown.js
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 対象のステートのメモ欄に、以下のタグを記述してください。
 *
 *   <deathCountdown:4>
 *
 * このステートが付与されると、そのターン（付与されたターン自身を
 * 1ターン目として含む）を含めて4回ぶんのターン終了を数え、
 * 4回目のターン終了時に戦闘不能になります。
 *
 * 例（死兆、付与されたターンを含めて4ターン後に死亡）:
 *   ステート「死兆」に <deathCountdown:4>
 *   → ターンNでこのステートが付与された場合、ターンN・N+1・N+2・N+3の
 *     4回のターン終了を経て、ターンN+3の終了時に戦闘不能になる
 *
 * このステート自体を先に解除（レスタリオ等）すれば、カウントダウンも
 * 一緒に無かったことになり、戦闘不能は発生しません。
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・このステート自体には、ツクール標準の「自動解除のタイミング」を
 *   設定しないでください（設定すると、カウントダウンが終わる前に
 *   標準機能の方で先に解除されてしまいます）。
 * ・カウントダウンは対象・ステートごとに個別管理されます。同じ対象が
 *   同時に複数のdeathCountdown系ステートを持つこともできます。
 * ・戦闘不能になった瞬間、ツクール標準の仕様により他のステートも
 *   すべて解除されます（die()の仕様）。
 */

(() => {
  "use strict";

  // 戦闘不能になった相手には、以降ステート解除メッセージ(「〇〇が解除された！」)を
  // 出さないようにする。die()自体は表示処理を伴わないため直接の原因では
  // ないが、他の処理と絡んで意図しないタイミングで出てしまうケースが
  // あったための対策。戦闘不能になった、という表示自体(displayAddedStates)
  // には影響しない。
  const _Window_BattleLog_displayRemovedStates = Window_BattleLog.prototype.displayRemovedStates;
  Window_BattleLog.prototype.displayRemovedStates = function(target) {
    if (target.isDead()) return;
    _Window_BattleLog_displayRemovedStates.call(this, target);
  };

  const _Game_Battler_addState = Game_Battler.prototype.addState;
  Game_Battler.prototype.addState = function(stateId) {
    const hadState = this.isStateAffected(stateId);
    _Game_Battler_addState.call(this, stateId);
    if (!hadState && this.isStateAffected(stateId)) {
      const state = $dataStates[stateId];
      const countdown = state && Number(state.meta.deathCountdown);
      if (countdown) {
        this._deathCountdowns = this._deathCountdowns || {};
        this._deathCountdowns[stateId] = countdown;
      }
    }
  };

  const _Game_Battler_removeState = Game_Battler.prototype.removeState;
  Game_Battler.prototype.removeState = function(stateId) {
    _Game_Battler_removeState.call(this, stateId);
    if (this._deathCountdowns) {
      delete this._deathCountdowns[stateId];
    }
  };

  const _Game_Battler_onTurnEnd = Game_Battler.prototype.onTurnEnd;
  Game_Battler.prototype.onTurnEnd = function() {
    _Game_Battler_onTurnEnd.call(this);

    if (this._deathCountdowns && this.hp > 0) {
      for (const key of Object.keys(this._deathCountdowns)) {
        const stateId = Number(key);
        if (!this.isStateAffected(stateId)) {
          delete this._deathCountdowns[stateId];
          continue;
        }
        this._deathCountdowns[stateId] -= 1;
        if (this._deathCountdowns[stateId] <= 0) {
          delete this._deathCountdowns[stateId];
          if (BattleManager._logWindow) {
            BattleManager._logWindow.push("addText", `死の刻印が${this.name()}を蝕んでいく！`);
          }
          this.addState(this.deathStateId()); // 標準仕様によりdie()が呼ばれHPが0になる
          if (BattleManager._logWindow) {
            BattleManager._logWindow.displayAddedStates(this); // 「戦闘不能になった」の標準メッセージ
            // 表示し終えた分をクリアしないと、この直後にBattleManager.
            // displayBattlerStatus()が同じ内容をもう一度表示してしまう
            this.result().addedStates = [];
          }
        } else if (BattleManager._logWindow) {
          BattleManager._logWindow.push("addText", `${this.name()}に死の気配が近付いている…。`);
          BattleManager._logWindow.push("wait");
          BattleManager._logWindow.push("clear");
        }
      }
    }
  };
})();
