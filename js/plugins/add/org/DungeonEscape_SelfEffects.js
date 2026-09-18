/*:
 * @target MZ
 * @plugindesc スキルのメモ欄タグで、使用者自身への即時効果（ステート付与・解除）と
 * パーティ全体への即時TP増減を、スキル本来の効果がすべて終わった後に適用するプラグイン
 * @help
 * 以下のメモ欄タグが使えます（複数併記可）。
 *
 * <selfState:X>   使用者にステートID Xを付与
 * <selfRemoveState:X>  使用者自身が持つステートID Xを解除する（カンマ区切りで複数指定可）
 * <partyTp:X>      パーティ全体のTPをX増減（マイナス可）
 * <partyTpMessage:文言>  <partyTp:X>と併用。TP増減後にバトルログへ
 *                         その文言をそのまま1行表示する（任意・省略可）
 * <partyTpOnHit:X> 命中した場合のみ、パーティ全体のTPをX増減
 * <partyTpOnHitState:ステートID,TP量>  命中し、かつ命中時に対象が指定ステートを
 *                                       持っていた場合のみ、パーティ全体のTPを増減
 * <partyTpOnSelfState:ステートID,TP量>  命中し、かつ使用時に自分(使用者)が指定
 *                                        ステートを持っていた場合のみ、パーティ
 *                                        全体のTPを増減
 * <allyState:X>    使用者以外の生存中の味方にステートID Xを付与
 * <tpOnHealTarget:アクターID,TP量>      指定アクターを回復した場合のみ、
 *                                        パーティ全体のTPを増減
 *
 * ステートのメモ欄タグ:
 * <tpOnPhysicalHit:X>  このステートを持つ対象に物理攻撃が命中した場合、
 *                       パーティ全体のTPをX増減（ステート側で管理）
 * <tpOnDamageTaken:X>  このステートを持つ対象が、誰から・どんな攻撃で
 *                       であっても攻撃を受けた場合、パーティ全体の
 *                       TPをX増減する汎用版。`Cover.js`の肩代わりで
 *                       身代わりになった場合も、対象がこのステートを
 *                       持っていれば同様に発動する（肩代わりの発生
 *                       自体を条件にしないため、「たまたま自分が
 *                       狙われた時だけ発動する」という運の要素が
 *                       無くなる）。実際のダメージが0(無効化・完全
 *                       ガード等)であっても、命中はしていれば発動する
 *                       （hpDamageでなくhpAffectedで判定するため）
 *
 * 例:
 * <selfState:12>
 * <selfRemoveState:20>
 * <partyTp:10>
 *
 * ------------------------------------------------------------------
 * ◆重複実行防止
 * ------------------------------------------------------------------
 * 何らかの理由でBattleManager.endAction()が同じ行動に対して複数回
 * 呼ばれてしまうケースがあり、その場合selfState等がその都度再実行され、
 * バトルログに同じステート付与メッセージが重複表示される・ステートの
 * 残りターン数が意図せずリセットされる、という問題が起きていた。
 *
 * 対策として、行動(Game_Action)オブジェクトごとに一度だけ処理する
 * ようフラグ(_dungeonEscapeSelfEffectsDone)を立て、2回目以降の
 * endAction呼び出しではこのプラグインの処理をスキップするようにした。
 * endActionが複数回呼ばれる根本原因が別途あっても、実害（重複表示・
 * ステートの巻き戻り）はこれで防げる。
 *
 * ------------------------------------------------------------------
 * ◆allyStateの対象修正（今回の修正）
 * ------------------------------------------------------------------
 * <allyState:X>が$gameParty.battleMembers()に固定されていたため、
 * 敵（プレイグ等）がこのタグを使うと、本来対象にすべき「使用者の
 * 仲間（他の敵）」ではなく、パーティ（クレイ・セラ）にステートが
 * 付与されてしまっていた。
 * subject.friendsUnit()（使用者がアクターなら$gameParty、敵なら
 * $gameTroopを返す標準メソッド）を使うよう修正し、アクター側の
 * スキルでも敵側のスキルでも正しく「使用者以外の生存中の味方」を
 * 対象にできるようにした。あわせて、対象が複数いる場合に1人目にしか
 * 表示されなかったバトルログも、全員分表示されるよう修正した。
 *
 * ------------------------------------------------------------------
 * ◆displayAddedStates後のクリア処理（今回の修正）
 * ------------------------------------------------------------------
 * 使用者(subject)のresultオブジェクトは、対象(target)と違って行動ごとに
 * 自動クリアされない。このため、このプラグインが使用者にステートを
 * 付与してdisplayAddedStatesで表示した後、同じ行動内で別のプラグイン
 * （DungeonEscape_Counter.jsのcounterState等）が同じ使用者に既に別の
 * ステートを付与・表示済みだった場合、そのメッセージまで一緒に
 * 再表示されてしまう不具合があった（逆方向、このプラグインが後から
 * 呼ばれるケースでも同様）。
 *
 * displayAddedStatesで表示した直後にsubject（またはally）のresult().addedStates
 * を空にすることで、表示済みの記録が他プラグインの表示に混入しないようにした。
 */

(() => {
  // Torigoya_QuickSkill.jsは連携技使用後、同じGame_Actionオブジェクトを
  // clear()して次のコマンド入力に使い回す。clear()はツクール標準の
  // プロパティしかリセットしないため、このプラグインが独自に付与した
  // カスタムプロパティ(二重実行防止フラグ等)が前の使用分から残ってしまい、
  // 使い回された直後の行動でこのプラグインの処理が誤ってスキップされる
  // 不具合があった。clear()自体をフックしてこれらも一緒にリセットする。
  const _Game_Action_clear = Game_Action.prototype.clear;
  Game_Action.prototype.clear = function() {
    _Game_Action_clear.call(this);
    this._dungeonEscapeSelfEffectsDone = false;
    this._lastHitSuccess = false;
    this._lastHitTarget = null;
    this._preDamageStates = null;
    this._hadTargetState = false;
    this._hadSelfState = false;
  };

  const _Game_Action_apply = Game_Action.prototype.apply;
  Game_Action.prototype.apply = function(target) {
    const item = this.item();
    if (item && item.meta.partyTpOnHitState) {
      const stateId = Number(String(item.meta.partyTpOnHitState).split(",")[0]);
      this._hadTargetState = target.isStateAffected(stateId);
    }
    if (item && item.meta.partyTpOnSelfState) {
      const stateId = Number(String(item.meta.partyTpOnSelfState).split(",")[0]);
      this._hadSelfState = this.subject().isStateAffected(stateId);
    }

    // ダメージ処理前に、対象が持っている全ステートのtpOnPhysicalHitタグを記録
    this._preDamageStates = target.states().slice();

    _Game_Action_apply.call(this, target);
    this._lastHitSuccess = target.result().isHit();
    this._lastHitTarget = target;
  };

  const _BattleManager_endAction = BattleManager.endAction;
  BattleManager.endAction = function() {
    const action = this._action;
    // 同じ行動インスタンスに対する二重実行を防ぐ(重複表示・ステート巻き戻り対策)
    if (action && !action._dungeonEscapeSelfEffectsDone) {
      action._dungeonEscapeSelfEffectsDone = true;
      const item = action.item();
      if (item) {
        const subject = action.subject();

        if (item.meta.selfState) {
          const stateIds = String(item.meta.selfState).split(",").map(Number);
          console.log(
            `[SelfStateDebug] item.id=${item.id} name="${item.name}" ` +
            `isSkill=${DataManager.isSkill(item)} isItem=${DataManager.isItem(item)} ` +
            `stateIds=[${stateIds.join(",")}] subject=${subject.name()}`
          );
          for (const stateId of stateIds) {
            subject.addState(stateId);
          }
          this._logWindow.displayAddedStates(subject);
          // 表示し終えた分をクリア。使用者(subject)のresultは対象(target)と
          // 違って行動ごとに自動クリアされないため、放置するとDungeonEscape_Counter.js
          // 等が同じ使用者に既に付与・表示済みのステートまで、ここで一緒に
          // 再表示されてしまう
          subject.result().addedStates = [];
        }

        // 使用者自身のステートを解除
        if (item.meta.selfRemoveState) {
          const stateIds = String(item.meta.selfRemoveState).split(",").map(Number);
          for (const stateId of stateIds) {
            subject.removeState(stateId);
          }
        }

        if (item.meta.partyTp) {
          const tpValue = Number(item.meta.partyTp);
          for (const member of $gameParty.battleMembers()) {
            member.gainSilentTp(tpValue);
          }
          if (item.meta.partyTpMessage && this._logWindow) {
            this._logWindow.push("addText", item.meta.partyTpMessage);
          }
        }

        if (item.meta.partyTpOnHit && action._lastHitSuccess) {
          const tpValue = Number(item.meta.partyTpOnHit);
          for (const member of $gameParty.battleMembers()) {
            member.gainSilentTp(tpValue);
          }
        }

        // 命中し、かつ命中時に対象が指定ステートを持っていた場合のみTP上昇
        if (item.meta.partyTpOnHitState && action._lastHitSuccess && action._hadTargetState) {
          const tpValue = Number(String(item.meta.partyTpOnHitState).split(",")[1]);
          for (const member of $gameParty.battleMembers()) {
            member.gainSilentTp(tpValue);
          }
        }

        // 命中し、かつ使用時に自分(使用者)が指定ステートを持っていた場合のみTP上昇
        if (item.meta.partyTpOnSelfState && action._lastHitSuccess && action._hadSelfState) {
          const tpValue = Number(String(item.meta.partyTpOnSelfState).split(",")[1]);
          for (const member of $gameParty.battleMembers()) {
            member.gainSilentTp(tpValue);
          }
        }

        // 仲間にステートを追加（使用者がアクターなら$gameParty、敵なら$gameTroopが対象）
        if (item.meta.allyState) {
          const stateId = Number(item.meta.allyState);
          const allies = subject
            .friendsUnit()
            .aliveMembers()
            .filter(m => m !== subject);
          for (const ally of allies) {
            ally.addState(stateId);
          }
          for (const ally of allies) {
            this._logWindow.displayAddedStates(ally);
            ally.result().addedStates = []; // 理由はselfState内のコメント参照
          }
        }

        // 自分以外の味方を回復した場合（汎用タグ）
        if (item.meta.tpOnAllyHeal) {
          const healedTarget = action._lastHitTarget;
          if (healedTarget && healedTarget.isActor() && healedTarget !== subject) {
            const tpValue = Number(item.meta.tpOnAllyHeal);
            for (const member of $gameParty.battleMembers()) {
              member.gainSilentTp(tpValue);
            }
          }
        }

        // 特定ステートへの物理攻撃によるTP上昇
        if (action._lastHitSuccess && item.damage && item.damage.elementId === 1 && subject.isActor() && subject.actorId() === 9) {
          const preStates = action._preDamageStates || [];
          for (const state of preStates) {
            const tag = state.meta.tpOnPhysicalHit;
            if (tag) {
              const tpValue = Number(tag);
              for (const member of $gameParty.battleMembers()) {
                member.gainSilentTp(tpValue);
              }
            }
          }
        }

        // 特定ステートを持つ対象が、誰から・どんな攻撃でダメージを
        // 受けても(肩代わりされた分・無効化されて0になった分含む)
        // TP上昇する、汎用版
        if (action._lastHitSuccess && action._lastHitTarget) {
          const hitTarget = action._lastHitTarget;
          const wasAffected = hitTarget.result().hpAffected;
          if (wasAffected) {
            const preStates = action._preDamageStates || [];
            for (const state of preStates) {
              const tag = state.meta.tpOnDamageTaken;
              if (tag) {
                const tpValue = Number(tag);
                for (const member of $gameParty.battleMembers()) {
                  member.gainSilentTp(tpValue);
                }
              }
            }
          }
        }
      }
    }
    _BattleManager_endAction.call(this);
  };
})();
