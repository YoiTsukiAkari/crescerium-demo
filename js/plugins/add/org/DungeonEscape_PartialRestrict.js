/*:
 * @target MZ
 * @plugindesc 1ターンに複数回行動できる敵が、凍結・怯み等で行動不能に
 * なった場合、そのターン丸ごとではなく行動1回分だけを消費するように
 * するプラグイン Ver9.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_PartialRestrict.js
 *
 * ------------------------------------------------------------------
 * ◆背景（判明した実際の仕組み）
 * ------------------------------------------------------------------
 * ・行動回数(_actions)は、そのバトラーの番が来る前の時点で、その時点の
 *   canMove()の状態を見て一括で作られる。「行動回数を作った時点」では
 *   まだ行動不能ではなく、その後（味方の先制攻撃などで）行動不能に
 *   なった場合、RPGツクールMZは自動でGame_Battler.prototype.onRestrict()
 *   を呼び、その中でclearActions()（その時点の行動キューを問答無用で
 *   全部空にする処理）を実行する。そのため、makeActions時点で複数回分
 *   の行動を確保しておいても、後から行動不能になった瞬間に全部消える。
 * ・「体勢を立て直した」等のステート解除メッセージは、行動制約由来の
 *   自動解除(removeByRestriction)ではなく、ステート本来の継続ターン数が
 *   ターン終了時に切れることで表示されていた。そのため何もしないと、
 *   ボスの残り行動がすべて終わった後（ターンの締めくくり）に表示される。
 *
 * ------------------------------------------------------------------
 * ◆このプラグインの効果
 * ------------------------------------------------------------------
 * 敵の本来の行動回数が2回以上の時に限り、行動不能状態でも「行動1回分
 * だけ」を消費し、残りの行動回数ぶんは行動不能を無視して通常通り
 * 行動します（行動回数が1回の敵は、今まで通りそのターン丸ごと
 * 行動不能のままです）。あわせて、1回分の消費と引き換えに、行動制約の
 * 原因ステート自体もその場で解除します。解除メッセージ（「体勢を
 * 立て直した！」等）は、味方の行動結果に混ざらないよう、ボス自身の
 * （1回分消費した後の）最初の行動が始まる直前に、独立した表示
 * ブロックとして表示します。
 *
 * 特別な設定・タグは不要です。導入するだけで、行動回数が2以上の
 * 敵すべてに適用されます。
 *
 * ------------------------------------------------------------------
 * ◆重要な仕様変更
 * ------------------------------------------------------------------
 * 行動制約の原因になっているステート（凍結・怯み等）は、1回分の行動を
 * 消費した時点で、そのステート本来の継続ターン数を待たず、その場で
 * 強制的に解除されます。これらのステートの継続ターン数の設定は、
 * 複数回行動できる敵に対しては実質的に意味を持たなくなります
 * （何ターンに設定していても、1回分の消費だけでその場で解除されます）。
 *
 * ------------------------------------------------------------------
 * ◆Ver6.0.0の変更点
 * ------------------------------------------------------------------
 * 同一ターン内で行動制約ステートが2つ以上、別々のタイミングで
 * 付与された場合、2つ目以降がbypassフラグによって専用処理から
 * 除外されてしまい、1つ目の分のメッセージしか表示されない不具合を
 * 修正。bypass済みかどうかに関わらず、行動制約が新たに発生する
 * たびに毎回この処理を通すようにし、それぞれ個別に1回分ずつ消費・
 * メッセージ表示するようにした。
 *
 * ------------------------------------------------------------------
 * ◆Ver7.0.0の変更点
 * ------------------------------------------------------------------
 * 行動制約の消費だけで行動回数がちょうど0になり、ボスがそのターン
 * 1回も行動できなかった場合、startAction自体が一度も呼ばれないため
 * 保留メッセージが永遠に表示されない不具合を修正。ボスの行動権が
 * （0回であっても）一通り終わったタイミング(onAllActionsEnd)でも、
 * 保留メッセージが残っていれば表示するようにした。
 *
 * ------------------------------------------------------------------
 * ◆Ver8.0.0の変更点【重大バグ修正】
 * ------------------------------------------------------------------
 * 敵を撃破した際、「立ち上がった！」と表示されて蘇生してしまい
 * 倒せなくなる不具合を修正。原因は、「戦闘不能」ステート自体にも
 * 行動制約(restriction>0)が設定されているため、敵のHPが0になって
 * 戦闘不能ステートが付与された瞬間、このプラグインが「新たな行動制約が
 * 発生した」と誤検知し、1回分消費の処理の対象に戦闘不能ステート自体を
 * 含めてしまっていたこと。対象のステートをremoveStateで解除する際、
 * RPGツクールMZの標準仕様でdeathStateIdの解除は自動的にrevive()を
 * 呼ぶため、倒したはずの敵が復活してしまっていた。
 * onRestrict・makeActions双方に、isDead()の場合は一切の独自処理を
 * 行わないガードを追加して修正した。
 *
 * ------------------------------------------------------------------
 * ◆Ver9.0.0の変更点【重大バグ修正】
 * ------------------------------------------------------------------
 * 行動回数が1回(複数回行動と無関係)の、ごく普通の敵に凍結・怯み等を
 * 与えた場合でも、onRestrict内の「行動制約の原因ステートをその場で
 * 強制解除する」処理が無条件に働いてしまい、本来の継続ターン数を
 * 待たずにステートが即座に解除されてしまう不具合を修正。
 * （例：凍結を与えても、1行動不能にさせた直後にステート自体が消えて
 * しまい、「凍結からの追撃コンボ」等が機能しなくなっていた）
 * makeActions側は元々actionTimes>1のガードがあったが、onRestrict側に
 * 同等のガード(savedActions.length>1)が抜けていたことが原因。
 * 行動回数が2回以上の場合のみ、この特別処理が働くよう修正した。
 * 行動回数1回の敵は、標準の挙動(そのターン丸ごと行動不能・ステートは
 * 本来の継続ターン数のまま)に戻る。
 */

(() => {
  "use strict";

  // ①行動回数を作る時点で、既に行動不能だった場合の対処
  const _Game_Battler_makeActions = Game_Battler.prototype.makeActions;
  Game_Battler.prototype.makeActions = function() {
    this._partialRestrictBypass = false;

    if (this.isEnemy() && !this.isDead() && !this.canMove()) {
      const actionTimes = this.makeActionTimes();
      if (actionTimes > 1) {
        this.clearActions();
        this._actions = [];
        for (let i = 0; i < actionTimes - 1; i++) {
          this._actions.push(new Game_Action(this));
        }
        this._partialRestrictBypass = true;
        this.setActionState("waiting");
        return;
      }
    }

    _Game_Battler_makeActions.call(this);
  };

  // ②行動回数を作った後、途中で行動不能になった場合の対処
  // (onRestrict内のclearActions()で行動キューが消される前に、既に技が
  //  割り振られている元の行動オブジェクトを保存しておき、消された直後に
  //  最初の1つだけ捨てて残りをそのまま復元する。新しい空の行動を作ると
  //  技が設定されないまま実行されず終わってしまうため、必ず元の
  //  オブジェクトを使い回す)
  const _Game_Battler_onRestrict = Game_Battler.prototype.onRestrict;
  Game_Battler.prototype.onRestrict = function() {
    // 戦闘不能(HP0)によって呼ばれた場合はこのプラグインの対象外。
    // 「戦闘不能」ステート自体にも行動制約(restriction>0)が設定されて
    // いるため、これを対象に含めてしまうと、倒した敵のステートを
    // removeStateで解除する処理が働き、RPGツクールMZの標準仕様
    // (deathStateIdをremoveStateすると自動でrevive()される)により、
    // 敵が「立ち上がった！」と表示されて蘇生してしまう重大な不具合が
    // あったため、isDead()の場合は一切の独自処理を行わず元の処理のみ通す
    if (this.isEnemy() && !this.isDead()) {
      const savedActions = this._actions ? this._actions.slice() : [];

      // 行動回数が元々1回(またはそれ以下)の、ごく普通の敵はこの
      // プラグインの対象外とし、標準の挙動(そのターン丸ごと行動不能・
      // ステートは本来の継続ターン数のまま)をそのまま維持する。
      // このチェックが無いと、複数回行動とは無関係な通常の敵の凍結・
      // 怯みまで、行動制約の原因ステートがその場で強制解除されてしまい、
      // 「凍結からの追撃コンボ」等が機能しなくなる不具合があった
      if (savedActions.length <= 1) {
        _Game_Battler_onRestrict.call(this);
        return;
      }

      // bypass済みかどうかに関わらず、行動制約が新たに発生するたびに
      // 毎回この処理を通す（同じターン内で2つ以上の行動制約ステートが
      // 別々に付与された場合、それぞれ個別に1回分ずつ消費するため）
      const restrictingStates = this.states().filter(
        s => s.restriction > 0 && s.id !== this.deathStateId()
      );

      _Game_Battler_onRestrict.call(this); // ここでclearActions()が行動キューを空にする

      this._pendingRestrictRecoveryMessages = this._pendingRestrictRecoveryMessages || [];
      for (const state of restrictingStates) {
        if (state.message4) {
          this._pendingRestrictRecoveryMessages.push(state.message4.format(this.name()));
        }
        this.removeState(state.id);
      }
      this.result().removedStates = [];

      if (savedActions.length > 1) {
        this._actions = savedActions.slice(1); // 最初の1つだけ消費し、残りは元のまま復元
        this._partialRestrictBypass = true;
      }
      return;
    }
    _Game_Battler_onRestrict.call(this);
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

  // ケース1：ボスに行動が1回以上残っている場合、最初の行動が始まる
  // 直前に独立した表示ブロックとして出す
  const _BattleManager_startAction = BattleManager.startAction;
  BattleManager.startAction = function() {
    flushPendingRestrictMessages(this._subject);
    _BattleManager_startAction.call(this);
  };

  // ケース2：行動制約の消費だけで行動回数が0になり、ボスが1回も
  // 行動できなかった場合の保険。この場合startActionが一度も呼ばれない
  // ため、行動権が一通り終わったタイミング(onAllActionsEnd)でも
  // 保留メッセージが残っていれば表示する
  const _Game_Battler_onAllActionsEnd = Game_Battler.prototype.onAllActionsEnd;
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
