/*:
 * @target MZ
 * @plugindesc v1.0.0 メモ欄タグで、1つのスキルの後に指定スキルを順番に実行します。後続スキルの発光・使用ログ・開始アニメーションは省略します。
 * @author OpenAI
 *
 * @help
 * Crescerium_SkillSequence.js
 * ------------------------------------------------------------
 * 1つのスキルを「見た目・発動用の本体」とし、
 * その終了後に複数のスキルを順番に実行するためのプラグインです。
 *
 * RPGツクールMZ用。
 *
 * ------------------------------------------------------------
 * ■ 使い方
 * ------------------------------------------------------------
 *
 * 本体スキルのメモ欄に以下のように記入してください。
 *
 *   <連続スキル:368,369>
 *
 * または
 *
 *   <SequenceSkills:368,369>
 *
 * この場合、
 *
 *   本体スキル
 *      ↓
 *   スキル368
 *      ↓
 *   スキル369
 *
 * の順番で、同じ使用者が続けて行動します。
 *
 * ------------------------------------------------------------
 * ■ 「瘴毒の沼」の設定例
 * ------------------------------------------------------------
 *
 * 【瘴毒の沼・本体】
 * ・範囲：使用者
 * ・ダメージ：なし
 * ・アニメーション：瘴毒の沼の本アニメーション
 * ・メモ：
 *
 *      <連続スキル:368,369>
 *
 * 【スキル368】
 * ・クレイ／セラへの攻撃用
 * ・範囲：敵全体
 * ・通常のダメージ式、分散度、属性などを設定
 * ・アニメーションは「なし」推奨
 *
 * 【スキル369】
 * ・敵側全体への回復用
 * ・範囲：味方全体
 * ・HP回復、回復量、分散度などを設定
 * ・アニメーションは「なし」推奨
 *
 * ------------------------------------------------------------
 * ■ 後続スキルの見た目
 * ------------------------------------------------------------
 *
 * 本プラグインが追加した後続スキルでは、
 *
 * ・敵使用者の白い発光
 * ・「○○は△△を使った！」等の使用開始ログ
 * ・スキルに設定された開始アニメーション
 *
 * を省略します。
 *
 * ただし、攻撃・回復そのものはMZ標準の戦闘処理を使用するため、
 *
 * ・ダメージ計算
 * ・回復計算
 * ・分散度
 * ・属性
 * ・命中／回避
 * ・ステート付与
 * ・ダメージポップアップ
 * ・画面揺れ等の被ダメージ演出
 * ・「クレイは XX ダメージを受けた！」
 * ・「○○のHPが XX 回復した！」
 *
 * などの結果処理は通常スキルと同じです。
 *
 * ------------------------------------------------------------
 * ■ 注意
 * ------------------------------------------------------------
 *
 * ・後続スキルにも通常どおり使用条件・消費MP等が適用されます。
 *   隠し処理用なら消費MP 0 を推奨します。
 *
 * ・後続スキル自体にも <連続スキル:...> を書けば、
 *   さらに連続させることもできますが、通常は不要です。
 *
 * ・同じバトラーが複数回行動できる場合でも、
 *   後続スキルは元の行動の直後に挿入され、
 *   その後に残りの通常行動へ戻ります。
 *
 * ・BattleManager.endAction と Window_BattleLog.startAction を
 *   エイリアスして使用します。
 *
 * ・戦闘システムを大きく変更するプラグインがある場合は、
 *   競合確認が必要になる可能性があります。
 */

(() => {
    "use strict";

    const META_JP = "連続スキル";
    const META_EN = "SequenceSkills";

    function parseSequenceSkillIds(item) {
        if (!item || !item.meta) return [];

        const raw = item.meta[META_JP] ?? item.meta[META_EN];
        if (raw === undefined || raw === true || raw === null) {
            return [];
        }

        return String(raw)
            .split(",")
            .map(value => Number(value.trim()))
            .filter(skillId =>
                Number.isInteger(skillId) &&
                skillId > 0 &&
                $dataSkills &&
                $dataSkills[skillId]
            );
    }

    function makeFollowUpAction(subject, skillId) {
        const action = new Game_Action(subject, true);
        action.setSkill(skillId);
        action._cresceriumSequenceFollowUp = true;

        if (action.isForOne()) {
            action.decideRandomTarget();
        }

        return action;
    }

    const _BattleManager_endAction = BattleManager.endAction;
    BattleManager.endAction = function() {
        const subject = this._subject;
        const action = this._action;

        if (
            subject &&
            action &&
            !action._cresceriumSequenceQueued &&
            subject.isAlive &&
            subject.isAlive()
        ) {
            action._cresceriumSequenceQueued = true;

            const item = action.item();
            const skillIds = parseSequenceSkillIds(item);

            if (skillIds.length > 0) {
                const followUps = skillIds.map(skillId =>
                    makeFollowUpAction(subject, skillId)
                );
                subject._actions.unshift(...followUps);
            }
        }

        _BattleManager_endAction.call(this);
    };

    const _Window_BattleLog_startAction =
        Window_BattleLog.prototype.startAction;

    Window_BattleLog.prototype.startAction = function(subject, action, targets) {
        if (action && action._cresceriumSequenceFollowUp) {
            return;
        }

        _Window_BattleLog_startAction.call(this, subject, action, targets);
    };
})();
