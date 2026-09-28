/*:
 * @target MZ
 * @plugindesc 複数回行動ボスの行動抽選を制御し、最低攻撃数・1ターン1回制限・最後に使う技を設定します Ver1.2.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_DemonActionSelect.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * 敵キャラのメモ欄タグで、その敵の行動抽選にだけ制約を追加します。
 * RPGツクールMZ標準の「行動条件」「レーティング」はそのまま利用します。
 *
 * ・指定した「攻撃系スキル」を、行動回数ごとに最低○回は選ぶ
 * ・指定したスキルは、1ターン中に最大1回までしか選ばない
 * ・指定したスキルは、抽選された場合その敵の行動列の最後へ移動する
 *
 * 行動回数そのものは変更しません。
 * DungeonEscape_ActionCountVariable.js などで決めた行動回数をそのまま使います。
 *
 * ------------------------------------------------------------------
 * ◆敵キャラのメモ欄
 * ------------------------------------------------------------------
 * このプラグインを適用したい敵に以下を記述してください。
 *
 *   <demonActionSelect>
 *
 * 攻撃系として扱うスキルID：
 *
 *   <demonAttackSkills:1,5,8,12>
 *
 * 1ターンに1回までにしたいスキルID：
 *
 *   <demonOnceSkills:20,21>
 *
 * 抽選された場合、その敵の行動列の最後へ移動したいスキルID：
 *
 *   <demonLastSkills:20>
 *
 * 行動回数ごとの「攻撃系スキルの最低数」：
 * 左から、1回行動・2回行動・3回行動・4回行動・5回行動…に対応します。
 *
 *   <demonMinAttacks:0,1,1,1,1>
 *
 * 上の例なら、
 *   1回行動 → 攻撃系の最低保証なし
 *   2回行動 → 攻撃系を最低1回
 *   3回行動 → 攻撃系を最低1回
 *   4回行動 → 攻撃系を最低1回
 *   5回行動 → 攻撃系を最低1回
 * となります。
 *
 * 奈落のデーモンを2～5回行動にする場合は、この設定が分かりやすいです。
 * 実際には1回行動にはならないため、先頭の「0」は予備設定になります。
 *
 * 行動回数の方が指定数より多い場合は、最後の値を使います。
 * 例：<demonMinAttacks:0,1,1,1,1> の敵が6回行動なら最低1回です。
 *
 * ------------------------------------------------------------------
 * ◆奈落の咆哮の設定例
 * ------------------------------------------------------------------
 * たとえば「奈落の咆哮」のスキルIDが20で、1ターン1回まで、かつ
 * 抽選された場合は必ずデーモン自身の最後の行動にしたい場合：
 *
 *   <demonOnceSkills:20>
 *   <demonLastSkills:20>
 *
 * 奈落の咆哮そのものに「攻撃力上昇ステートを付与」の効果を設定すれば、
 * デーモン自身の残り行動が無い状態でバフが付くため、実質的に
 * 「次ターンから攻撃が強化される」技として扱えます。
 *
 * ※これは「デーモン自身の行動列の最後」にする機能です。
 *   バトル全体で必ず最後に行動する、という意味ではありません。
 *
 * ------------------------------------------------------------------
 * ◆抽選ルール
 * ------------------------------------------------------------------
 * ・敵データベースに登録された行動候補のうち、その時点で行動条件を
 *   満たしているものだけを抽選対象にします。
 * ・候補内のレーティング差による重み付けは、MZ標準と同じ考え方で残します。
 * ・残り枠が「最低攻撃回数を満たすために全部攻撃にしないと間に合わない」
 *   状態になった時だけ、攻撃系候補から抽選します。
 * ・1ターン1回指定の技は、一度選ばれた後はそのターンの残り候補から
 *   除外します。
 * ・最後指定の技は、通常通り抽選した後でGame_Actionオブジェクト自体を
 *   行動列の末尾へ移します。再抽選は行いません。
 * ・候補不足で制約を満たせない場合は、行動が空にならないことを優先し、
 *   通常候補へフォールバックします。
 *
 * ------------------------------------------------------------------
 * ◆既存プラグインとの関係
 * ------------------------------------------------------------------
 * ・DungeonEscape_ActionCountVariable.js
 *   行動回数の決定には触れないため、そのまま併用できます。
 *
 * ・DungeonEscape_PartialRestrict.js
 *   このプラグインは「行動内容を最初に抽選する部分」だけを変更します。
 *   最後指定の並べ替えも、既に作成されたGame_Actionオブジェクトそのものを
 *   並べ替えるだけです。
 *   PartialRestrict側が保存・復元する抽選済みGame_Actionを作り直さないため、
 *   併用を前提にしています。
 *
 * 推奨配置：
 *   DungeonEscape_ActionCountVariable.js
 *   DungeonEscape_PartialRestrict.js
 *   DungeonEscape_DemonActionSelect.js
 *
 * ------------------------------------------------------------------
 * ◆Ver1.2.0
 * ------------------------------------------------------------------
 * ・2～5回行動の奈落のデーモン向けに、5回行動まで明示した設定例へ更新。
 * ・内部処理は元々5回以上の行動にも対応しており、指定値が足りない場合は
 *   最後の値を引き継ぐ仕様です。
 *
 * ------------------------------------------------------------------
 * ◆注意
 * ------------------------------------------------------------------
 * ・<demonAttackSkills:...> に指定したスキルが、そのターンの行動条件を
 *   満たしていない場合、そのスキルは最低攻撃回数の候補にはなりません。
 * ・攻撃候補自体が足りない場合、最低攻撃回数を満たせないことがあります。
 * ・<demonLastSkills:...> は「1ターン1回」を自動では付けません。
 *   1回までにしたい技は <demonOnceSkills:...> にも同じIDを指定してください。
 */

(() => {
  "use strict";

  const TAG_ENABLE = "demonActionSelect";
  const TAG_ATTACK_SKILLS = "demonAttackSkills";
  const TAG_ONCE_SKILLS = "demonOnceSkills";
  const TAG_MIN_ATTACKS = "demonMinAttacks";
  const TAG_LAST_SKILLS = "demonLastSkills";

  function parseNumberList(value) {
    if (value === undefined || value === null || value === true || value === "") {
      return [];
    }
    return String(value)
      .split(",")
      .map(v => Number(v.trim()))
      .filter(v => Number.isFinite(v));
  }

  function parseIdSet(value) {
    return new Set(parseNumberList(value).filter(v => v > 0).map(Math.floor));
  }

  function minAttackCountFor(enemyData, actionCount) {
    const values = parseNumberList(enemyData.meta[TAG_MIN_ATTACKS])
      .map(v => Math.max(0, Math.floor(v)));
    if (values.length === 0 || actionCount <= 0) return 0;
    const index = Math.min(actionCount - 1, values.length - 1);
    return Math.min(actionCount, values[index]);
  }

  // MZ標準selectActionと同じ考え方で、候補内の上位レーティングを重み付き抽選する。
  // 制約により候補が絞られた場合でも、その絞られた候補内でレーティングを再評価する。
  function selectWeightedAction(enemy, pool) {
    if (!pool || pool.length === 0) return null;

    const ratingMax = Math.max(...pool.map(a => a.rating));
    const ratingZero = ratingMax - 3;
    const ratedPool = pool.filter(a => a.rating > ratingZero);

    if (ratedPool.length === 0) {
      return pool[Math.randomInt(pool.length)];
    }
    return enemy.selectAction(ratedPool, ratingZero);
  }

  function moveLastSkillsToEnd(enemy, lastSkillIds) {
    if (!enemy._actions || enemy._actions.length <= 1 || lastSkillIds.size === 0) {
      return;
    }

    const normalActions = [];
    const lastActions = [];

    for (const action of enemy._actions) {
      const item = action && action.item ? action.item() : null;
      if (item && lastSkillIds.has(item.id)) {
        lastActions.push(action);
      } else {
        normalActions.push(action);
      }
    }

    // Game_Actionを作り直さず、配列の並びだけを変更する。
    // PartialRestrictが後から保存・復元する抽選済み行動を壊さないため。
    enemy._actions = normalActions.concat(lastActions);
  }

  const _Game_Enemy_selectAllActions = Game_Enemy.prototype.selectAllActions;
  Game_Enemy.prototype.selectAllActions = function(actionList) {
    const enemyData = this.enemy();
    if (!enemyData || !enemyData.meta[TAG_ENABLE]) {
      _Game_Enemy_selectAllActions.call(this, actionList);
      return;
    }

    const actionCount = this.numActions();
    if (actionCount <= 0 || !actionList || actionList.length === 0) {
      return;
    }

    const attackSkillIds = parseIdSet(enemyData.meta[TAG_ATTACK_SKILLS]);
    const onceSkillIds = parseIdSet(enemyData.meta[TAG_ONCE_SKILLS]);
    const lastSkillIds = parseIdSet(enemyData.meta[TAG_LAST_SKILLS]);
    const minAttacks = minAttackCountFor(enemyData, actionCount);

    const usedOnceSkills = new Set();
    let selectedAttacks = 0;

    for (let i = 0; i < actionCount; i++) {
      const slotsLeft = actionCount - i;
      const attacksStillNeeded = Math.max(0, minAttacks - selectedAttacks);

      // まず「1ターン1回」制約を反映した通常候補を作る。
      let available = actionList.filter(action => {
        return !(onceSkillIds.has(action.skillId) && usedOnceSkills.has(action.skillId));
      });

      // 残り全枠を攻撃にしないと最低数へ届かない場合のみ、攻撃候補に限定する。
      if (attacksStillNeeded >= slotsLeft) {
        const attackPool = available.filter(action => attackSkillIds.has(action.skillId));
        if (attackPool.length > 0) {
          available = attackPool;
        }
      }

      // 万一、1ターン1回制約で候補が完全に無くなった場合は、
      // 行動を空にしないことを優先して元候補へ戻す。
      if (available.length === 0) {
        available = actionList.slice();
      }

      const chosen = selectWeightedAction(this, available);
      if (!chosen) continue;

      this.action(i).setEnemyAction(chosen);

      if (attackSkillIds.has(chosen.skillId)) {
        selectedAttacks += 1;
      }
      if (onceSkillIds.has(chosen.skillId)) {
        usedOnceSkills.add(chosen.skillId);
      }
    }

    // 「最後に使う技」は抽選後に末尾へ移動する。
    // 抽選内容・レーティング・最低攻撃数には影響を与えない。
    moveLastSkillsToEnd(this, lastSkillIds);
  };
})();
