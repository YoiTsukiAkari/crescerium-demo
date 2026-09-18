/*:
 * @target MZ
 * @plugindesc 物理攻撃を受けた際、特定のステートを持つ対象が
 * 攻撃者にステートを返す、または反撃スキルを発動するプラグイン (Ver1.6.0)
 * @help
 * ステートのメモ欄に以下のタグを記述してください。
 *
 * <counterState:X>          物理攻撃を受けるたびに、攻撃者にステートID Xを
 *                            即座に付与する。対象がその一撃で戦闘不能になった
 *                            場合でも発動する（粘毒の構え・罠など、
 *                            "体そのものの性質"としての反撃向け）
 * <counterStateIfAlive:X>   上と同じ効果だが、対象がその一撃で戦闘不能に
 *                            なった場合は発動しない（受け捌き・エルーシオなど、
 *                            "本人が意識的に行う反撃動作"向け）
 * <counterStateLastHit:X>   1回の行動(連続攻撃含む)の中で「最後にヒットした
 *                            対象」だけを見て、行動終了時に1回だけステートID Xを
 *                            付与する（セラの背面カウンターなど、連続攻撃の
 *                            途中経過は無視して最終的な結果だけを見たい用途向け）
 * <counterSkill:X>          物理攻撃を受けた時、攻撃者に対してスキルID Xを発動する
 *                            （攻撃者が blockPhysical タグ付きステートを持つ場合は無効）
 * <counterSkillIfAlive:X>   上と同じ効果だが、対象がその一撃で戦闘不能に
 *                            なった場合は発動しない
 *
 * counterState系は全て、攻撃側のスキルの命中タイプが「物理攻撃」の場合のみ発動します。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.6.0での変更点（他プラグインとの表示重複を修正）
 * ------------------------------------------------------------------
 * 使用者(subject)のresultオブジェクトは、対象(target)と違って行動ごとに
 * 自動クリアされない。このため、このプラグインが使用者にステートを
 * 付与してdisplayAddedStatesで表示した後、同じ行動内で別のプラグイン
 * （DungeonEscape_SelfEffects.jsのselfState等）が同じ使用者に別のステートを
 * 付与してdisplayAddedStatesを呼ぶと、このプラグインが表示済みのステートの
 * メッセージまで一緒に再表示されてしまう不具合があった。
 *
 * Ver1.6.0では、displayAddedStatesで表示した直後にsubject.result().addedStates
 * を空にすることで、表示済みの記録が他プラグインの表示に混入しないようにした。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.5.0での変更点（生存が必要なカウンターの追加）
 * ------------------------------------------------------------------
 * 反撃には性質が異なる2種類がある：
 * ・"体そのものの性質"としての反撃（粘毒の構え、罠など）
 *   → 対象が戦闘不能になっても、反撃自体は成立してよい
 * ・"本人が意識的に行う反撃動作"（受け捌き、エルーシオなど）
 *   → その一撃で倒されたなら、反撃する余地は無かったはず
 *
 * 従来の<counterState>・<counterSkill>は前者(常に発動)のまま残し、
 * 後者向けに<counterStateIfAlive>・<counterSkillIfAlive>を新設した。
 * 使い分けたいステートに応じて、どちらのタグを使うか選択すること。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.4.0での変更点（撃破時に発動しない不具合の修正）
 * ------------------------------------------------------------------
 * RPGツクールMZは、対象が戦闘不能になった瞬間に全てのステートを
 * 自動的にクリアします（Game_BattlerBase.prototype.die内のclearStates）。
 * 以前のバージョンは、ダメージ処理が完了した「後」に対象のステートを
 * 確認していたため、その一撃で相手を倒してしまった場合、既に構え等の
 * ステートが消えており、カウンターが発動しない不具合がありました。
 *
 * Ver1.4.0では、ダメージが加わる「前」の対象のステートを記録しておき、
 * その記録に対してカウンター判定を行うように修正しました（この記録自体は
 * IfAlive系のタグでも同様に使われるが、IfAlive系は加えて「対象が生存して
 * いるか」も判定条件に含める）。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.3.0での変更点
 * ------------------------------------------------------------------
 * 以前のバージョンで、連続攻撃時の重複対策として<counterState:X>自体を
 * 「最後のヒットだけを見る」方式に変更していましたが、これは受け捌きのような
 * 「毎回きっちり反撃したい」用途とは矛盾する変更でした。
 *
 * Ver1.3.0では<counterState:X>を元の「毎回即時発動」の挙動に戻し、
 * 「最後のヒットだけを見る」という挙動は<counterStateLastHit:X>という
 * 別のタグに切り出しました。既存の受け捌き等はタグの書き換え不要で
 * そのまま動作します。
 *
 * なお<counterState:X>についても、連続攻撃で同じ対象に複数回ヒットした
 * 場合、バトルログのメッセージ表示だけは同じ行動内で1回にまとめています
 * （ステートの付与自体は今まで通り毎回行われます）。
 */

(() => {
  let displayedThisAction = new Map();       // <counterState:X> のメッセージ重複排除用
  let lastHitCandidate = new Map();          // <counterStateLastHit:X> の最終判定用

  const _BattleManager_startAction = BattleManager.startAction;
  BattleManager.startAction = function() {
    displayedThisAction = new Map();
    lastHitCandidate = new Map();
    _BattleManager_startAction.call(this);
  };

  function addCounterState(battleManager, subject, stateTag) {
    subject.addState(stateTag);

    if (!displayedThisAction.has(subject)) {
      displayedThisAction.set(subject, new Set());
    }
    const shownStates = displayedThisAction.get(subject);
    if (!shownStates.has(stateTag)) {
      shownStates.add(stateTag);
      battleManager._logWindow.displayAddedStates(subject);
      // 表示し終えた分はここでクリアしておく。使用者(subject)のresultは
      // 対象(target)と違って行動ごとに自動クリアされないため、放置すると
      // 他のプラグイン(DungeonEscape_SelfEffects.js等)が後で同じsubjectに
      // 別のステートを付与した際、ここで付けた分まで一緒に再表示されてしまう
      subject.result().addedStates = [];
    }
  }

  const _BattleManager_invokeNormalAction = BattleManager.invokeNormalAction;

  BattleManager.invokeNormalAction = function(subject, target) {
    // ダメージが加わる前(戦闘不能でステートが消える前)の状態を記録しておく
    const preDamageStates = target.states().slice();

    console.log(
      `[CounterDebug] invokeNormalAction 呼び出し subject=${subject.name()} ` +
      `target=${target.name()} item=${this._action ? this._action.item().name : "?"} ` +
      `targetStates(付与前)=[${preDamageStates.map(s => s.id).join(",")}]`
    );

    _BattleManager_invokeNormalAction.call(this, subject, target);

    const action = this._action;
    const item = action.item();
    if (item && item.hitType === 1 && target.result().isHit()) {
      const targetSurvived = target.isAlive();

      // ---- <counterState:X> : 生死を問わず毎回即時発動 ----
      for (const state of preDamageStates) {
        const stateTag = state.meta.counterState;
        if (stateTag) {
          console.log(`[CounterDebug] counterState発動 対象ステートID=${state.id}(${state.name}) 付与先=${Number(stateTag)} subject=${subject.name()}`);
          addCounterState(this, subject, Number(stateTag));
        }
      }

      // ---- <counterStateIfAlive:X> : 対象が生存している場合のみ発動 ----
      if (targetSurvived) {
        for (const state of preDamageStates) {
          const stateTag = state.meta.counterStateIfAlive;
          if (stateTag) {
            console.log(`[CounterDebug] counterStateIfAlive発動 対象ステートID=${state.id}(${state.name}) 付与先=${Number(stateTag)} subject=${subject.name()}`);
            addCounterState(this, subject, Number(stateTag));
          }
        }
      }

      // ---- <counterStateLastHit:X> : このヒットの結果で毎回上書き記録 ----
      const lastHitTags = [];
      for (const state of preDamageStates) {
        const stateTag = state.meta.counterStateLastHit;
        if (stateTag) lastHitTags.push(Number(stateTag));
      }
      if (lastHitTags.length > 0) {
        lastHitCandidate.set(subject, lastHitTags);
      } else {
        lastHitCandidate.delete(subject);
      }

      // ---- <counterSkill:X> : 生死を問わず毎回即時発動 ----
      for (const state of preDamageStates) {
        const skillTag = state.meta.counterSkill;
        if (skillTag) invokeCounterSkill(this, subject, target, Number(skillTag));
      }

      // ---- <counterSkillIfAlive:X> : 対象が生存している場合のみ発動 ----
      if (targetSurvived) {
        for (const state of preDamageStates) {
          const skillTag = state.meta.counterSkillIfAlive;
          if (skillTag) invokeCounterSkill(this, subject, target, Number(skillTag));
        }
      }
    }
  };

  function invokeCounterSkill(battleManager, subject, target, skillId) {
    const isSubjectAirborne = subject.states().some(s => s.meta.blockPhysical);
    if (!isSubjectAirborne) {
      const counterAction = new Game_Action(target);
      counterAction.setSkill(skillId);
      const originalAction = battleManager._action;
      battleManager._action = counterAction;
      battleManager.invokeNormalAction(target, subject);
      battleManager._action = originalAction;
    }
  }

  const _BattleManager_endAction = BattleManager.endAction;
  BattleManager.endAction = function() {
    // <counterStateLastHit:X> : 行動が完全に終わった時点で、最後のヒット結果に基づき1回だけ付与・表示
    for (const [subject, stateTags] of lastHitCandidate) {
      for (const stateTag of stateTags) {
        subject.addState(stateTag);
      }
      if (this._logWindow) {
        this._logWindow.displayAddedStates(subject);
        subject.result().addedStates = []; // 理由はaddCounterState内のコメント参照
      }
    }
    lastHitCandidate = new Map();

    _BattleManager_endAction.call(this);
  };
})();
