/*:
 * @target MZ
 * @plugindesc 複数回行動する敵の凍結・怯み等を「次の行動1回分だけ消費」にし、
 * 一部ステートは解除せず残せるようにします Ver10.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_PartialRestrict.js
 *
 * ------------------------------------------------------------------
 * ◆基本仕様
 * ------------------------------------------------------------------
 * 1ターンに複数回行動できる敵が、凍結・怯み等の「行動不能ステート」を
 * 受けた場合、そのターン丸ごとを失うのではなく、
 * 「次に来る行動権を1回分だけ」消費します。
 *
 * 例：
 * ・まだ3回行動が残っている時に凍結
 *   → 次の1回を消費し、残り2回は通常行動
 *
 * ・そのターンの行動をすべて終えた後に凍結
 *   → 次ターンの最初の1回を消費
 *
 * 行動回数が1回だけの通常敵は、従来どおりRPGツクールMZ標準の
 * 行動不能処理を使用します。
 *
 * ------------------------------------------------------------------
 * ◆Ver10.0.0：凍結コンボ対応
 * ------------------------------------------------------------------
 * 従来版では、複数回行動する敵の行動を1回消費した直後に
 * 行動不能ステート自体を強制解除していました。
 *
 * そのため、
 *
 *   アクア → グラキエス → 凍結 → クレイの物理追撃
 *
 * のような「凍結中の敵を攻撃するコンボ」が、
 * 複数回行動ボスに対して成立しない問題がありました。
 *
 * Ver10では、残しておきたいステートのメモ欄に
 *
 *   <partialRestrictKeep>
 *
 * を記述すると、
 *
 * ・次の行動権は1回分だけ消費
 * ・ステート自体は解除せず残す
 * ・同じステートが残っている間は、行動権を二重に消費しない
 * ・そのステートが解除され、再度付与された場合は、再び1回分消費
 *
 * という動作になります。
 *
 * 「凍結」ステートにこのタグを付けることを想定しています。
 *
 * ------------------------------------------------------------------
 * ◆タグを付けない行動不能ステート
 * ------------------------------------------------------------------
 * <partialRestrictKeep> が無い行動不能ステートは、Ver9までと同じです。
 *
 * ・次の行動権を1回分消費
 * ・その場でステートを解除
 * ・解除メッセージは敵の次の行動直前に独立表示
 *
 * 怯みなど、「1回止めたら即解除したい」ステートはこちらのまま使えます。
 *
 * ------------------------------------------------------------------
 * ◆重要：次ターンへ持ち越す場合
 * ------------------------------------------------------------------
 * デーモンがそのターンの行動をすべて終えた後で凍結した場合など、
 * まだ消費できる行動権が無ければ、その場では消費しません。
 *
 * その凍結は未消費のまま保持され、
 * 次ターンの最初の行動権を1回分消費します。
 *
 * したがって、「凍結した瞬間に現在ターンの行動回数を単純に-1する」
 * 処理ではありません。
 */

(() => {
  "use strict";

  function isKeepState(state) {
    return !!(
      state &&
      state.meta &&
      Object.prototype.hasOwnProperty.call(state.meta, "partialRestrictKeep")
    );
  }

  function restrictingStates(battler) {
    return battler.states().filter(
      state => state.restriction > 0 && state.id !== battler.deathStateId()
    );
  }

  function consumedKeepMap(battler) {
    battler._partialRestrictConsumedKeepStates =
      battler._partialRestrictConsumedKeepStates || {};
    return battler._partialRestrictConsumedKeepStates;
  }

  function isKeepConsumed(battler, stateId) {
    return !!consumedKeepMap(battler)[stateId];
  }

  function markKeepConsumed(battler, stateId) {
    consumedKeepMap(battler)[stateId] = true;
  }

  function queueRecoveryMessage(battler, state) {
    if (!state || !state.message4) return;
    battler._pendingRestrictRecoveryMessages =
      battler._pendingRestrictRecoveryMessages || [];
    battler._pendingRestrictRecoveryMessages.push(
      state.message4.format(battler.name())
    );
  }

  function removeNonKeepRestriction(battler, state) {
    queueRecoveryMessage(battler, state);
    battler.removeState(state.id);
  }

  function handleRestrictionCost(battler, states) {
    for (const state of states) {
      if (isKeepState(state)) {
        if (!isKeepConsumed(battler, state.id)) {
          markKeepConsumed(battler, state.id);
        }
      } else {
        removeNonKeepRestriction(battler, state);
      }
    }

    battler.result().removedStates = [];
  }

  const _Game_Battler_makeActions = Game_Battler.prototype.makeActions;

  Game_Battler.prototype.makeActions = function() {
    this._partialRestrictBypass = false;
    this._partialRestrictInitialActionCount = 0;

    if (this.isEnemy() && !this.isDead()) {
      const activeRestrictions = restrictingStates(this);

      if (activeRestrictions.length > 0) {
        const allAreConsumedKeepStates = activeRestrictions.every(
          state => isKeepState(state) && isKeepConsumed(this, state.id)
        );

        if (allAreConsumedKeepStates) {
          this._partialRestrictBypass = true;
          _Game_Battler_makeActions.call(this);
          this._partialRestrictInitialActionCount =
            this._actions ? this._actions.length : 0;
          return;
        }
      }

      if (!this.canMove()) {
        const actionTimes = this.makeActionTimes();
        this._partialRestrictInitialActionCount = actionTimes;

        if (actionTimes > 1) {
          this.clearActions();
          this._actions = [];

          for (let i = 0; i < actionTimes - 1; i++) {
            this._actions.push(new Game_Action(this));
          }

          const active = restrictingStates(this);
          handleRestrictionCost(this, active);

          this._partialRestrictBypass = true;
          this.setActionState("waiting");
          return;
        }

        _Game_Battler_makeActions.call(this);
        return;
      }
    }

    _Game_Battler_makeActions.call(this);
    this._partialRestrictInitialActionCount =
      this._actions ? this._actions.length : 0;
  };

  const _Game_Battler_onRestrict = Game_Battler.prototype.onRestrict;

  Game_Battler.prototype.onRestrict = function() {
    if (this.isEnemy() && !this.isDead()) {
      const savedActions = this._actions ? this._actions.slice() : [];
      const wasMultiActionTurn =
        (this._partialRestrictInitialActionCount || 0) > 1;

      if (wasMultiActionTurn && savedActions.length > 0) {
        const activeRestrictions = restrictingStates(this);
        const relevantRestrictions = activeRestrictions.filter(
          state => !isKeepState(state) || !isKeepConsumed(this, state.id)
        );

        _Game_Battler_onRestrict.call(this);

        handleRestrictionCost(this, relevantRestrictions);

        this._actions = savedActions.slice(1);
        this._partialRestrictBypass = true;
        return;
      }
    }

    _Game_Battler_onRestrict.call(this);
  };

  const _Game_Battler_addState = Game_Battler.prototype.addState;

  Game_Battler.prototype.addState = function(stateId) {
    const hadState = this.isStateAffected(stateId);

    _Game_Battler_addState.call(this, stateId);

    if (
      hadState ||
      !this.isEnemy() ||
      this.isDead() ||
      !this.isStateAffected(stateId)
    ) {
      return;
    }

    const state = $dataStates[stateId];

    if (
      !state ||
      state.restriction <= 0 ||
      state.id === this.deathStateId()
    ) {
      return;
    }

    if (isKeepState(state) && isKeepConsumed(this, state.id)) {
      return;
    }

    const wasMultiActionTurn =
      (this._partialRestrictInitialActionCount || 0) > 1;

    if (
      wasMultiActionTurn &&
      this._actions &&
      this._actions.length > 0
    ) {
      this._actions = this._actions.slice(1);
      handleRestrictionCost(this, [state]);
      this._partialRestrictBypass = true;
    }
  };

  const _Game_Battler_removeState = Game_Battler.prototype.removeState;

  Game_Battler.prototype.removeState = function(stateId) {
    _Game_Battler_removeState.call(this, stateId);

    if (
      this._partialRestrictConsumedKeepStates &&
      !this.isStateAffected(stateId)
    ) {
      delete this._partialRestrictConsumedKeepStates[stateId];
    }
  };

  function flushPendingRestrictMessages(subject) {
    if (
      !subject ||
      !subject.isEnemy() ||
      !subject._pendingRestrictRecoveryMessages ||
      subject._pendingRestrictRecoveryMessages.length === 0
    ) {
      return;
    }

    if (BattleManager._logWindow) {
      for (const message of subject._pendingRestrictRecoveryMessages) {
        BattleManager._logWindow.push("clear");
        BattleManager._logWindow.push("addText", message);
        BattleManager._logWindow.push("wait");
        BattleManager._logWindow.push("clear");
      }
    }

    subject._pendingRestrictRecoveryMessages = [];
  }

  const _BattleManager_startAction = BattleManager.startAction;

  BattleManager.startAction = function() {
    flushPendingRestrictMessages(this._subject);
    _BattleManager_startAction.call(this);
  };

  const _Game_Battler_onAllActionsEnd =
    Game_Battler.prototype.onAllActionsEnd;

  Game_Battler.prototype.onAllActionsEnd = function() {
    _Game_Battler_onAllActionsEnd.call(this);
    flushPendingRestrictMessages(this);
  };

  const _Game_BattlerBase_canMove = Game_BattlerBase.prototype.canMove;

  Game_BattlerBase.prototype.canMove = function() {
    if (this._partialRestrictBypass) return true;
    return _Game_BattlerBase_canMove.call(this);
  };
})();
