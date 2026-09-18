/*:
 * @target MZ
 * @plugindesc 「庇う」ステートを持つバトラーがいる場合、指定した対象への
 * あらゆる攻撃（物理・魔法・全体攻撃含む）を強制的に肩代わりするプラグイン
 * @help
 * ステートのメモ欄に以下のタグを記述してください。
 *
 * <guardTarget:X>       Xは守りたい対象のアクターID（アクター専用）
 * <guardTargetTp:X>     肩代わりが発生するたびに、パーティ全体のTPをX増加させる
 * <guardAll>            トループ全員を庇う（敵専用。特定の対象IDは指定不要。
 *                       ステートのメモ欄。使用した時だけ発動する想定）
 *
 * 敵キャラ（データベースの「敵キャラ」自体）のメモ欄には以下のタグを
 * 記述してください（ステートではなく敵キャラ本体のメモ欄）。
 *
 * <guardEnemyId:X>      Xは守りたい特定の敵のenemyId。このタグを持つ敵が
 *                       1体でも生きていれば、その敵ID(X)への攻撃を常時
 *                       肩代わりする（guardAllと違い、スキル使用等の
 *                       トリガー不要の常時発動型。guardAllを持つ敵が
 *                       いる場合はそちらが優先される）
 *
 * 例: セラ（アクターID:10）を守り、肩代わりの度にTP2上昇 → <guardTarget:10><guardTargetTp:2>
 * 例: 敵がトループ全員を庇う → <guardAll>
 * 例: 召喚体が敵ID99番(オーブ)を常に庇う → 召喚体の敵キャラメモ欄に<guardEnemyId:99>
 *
 * 全体攻撃を受けた場合、対象になっていた人数分だけ庇う側が個別に
 * 肩代わりするため、重複してダメージを受けます（guardTarget・guardAll・
 * guardEnemyId共通の仕様）。
 */

(() => {
  const _Game_Action_makeTargets = Game_Action.prototype.makeTargets;

  Game_Action.prototype.makeTargets = function() {
    const targets = _Game_Action_makeTargets.call(this);
    const item = this.item();

    if (item && this.isForOpponent()) {
      return targets.map(target => {
        if (target.isActor()) {
          // アクター向け：guardTargetで指定された対象だけを庇う
          const guardianState = $gameParty.members().flatMap(m =>
            m.states().filter(s => {
              const tag = s.meta.guardTarget;
              return tag && Number(tag) === target.actorId();
            }).map(s => ({ member: m, state: s }))
          )[0];

          if (guardianState && guardianState.member !== target && guardianState.member.isAlive()) {
            const tpTag = guardianState.state.meta.guardTargetTp;
            if (tpTag) {
              const tpValue = Number(tpTag);
              for (const member of $gameParty.battleMembers()) {
                member.gainSilentTp(tpValue);
              }
            }
            return guardianState.member;
          }
        } else if (target.isEnemy()) {
          // 敵向け：guardAllを持つ敵がいれば、トループ全員分を肩代わり
          const guardCandidates = $gameTroop.members().map(m => ({
            name: m.name(),
            alive: m.isAlive(),
            states: m.states().map(s => s.name),
            hasGuardAll: m.states().some(s => s.meta.guardAll)
          }));
          console.log(
            `[GuardAllDebug] item="${item.name}" target=${target.name()} ` +
            `候補一覧=${JSON.stringify(guardCandidates)}`
          );

          const guardian = $gameTroop.members().find(m =>
            m.isAlive() && m.states().some(s => s.meta.guardAll)
          );
          console.log(
            `[GuardAllDebug] guardian=${guardian ? guardian.name() : "なし"} ` +
            `guardian===target : ${guardian === target}`
          );
          if (guardian && guardian !== target) {
            return guardian;
          }

          // guardEnemyId: 特定の敵ID(target)を常時庇う敵が1体でも
          // 生きていれば、そちらが肩代わりする(guardAllが無い場合のみ)
          const specificGuardian = $gameTroop.members().find(m => {
            if (!m.isAlive() || m === target) return false;
            const tag = m.enemy().meta.guardEnemyId;
            return tag && Number(tag) === target.enemyId();
          });
          if (specificGuardian) {
            return specificGuardian;
          }
        }
        return target;
      });
    }
    return targets;
  };
})();
