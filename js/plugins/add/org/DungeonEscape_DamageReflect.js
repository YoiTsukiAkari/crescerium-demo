//=============================================================================
// DungeonEscape_DamageReflect.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 物理反射・魔法反射ステートを追加します Ver1.0.4
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_DamageReflect.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * ステートのメモ欄に以下のタグを記述すると、そのステート中に受けた
 * 対応するHPダメージは通常通り受けたうえで、その同じダメージ量を
 * 攻撃者へ返します。
 *
 *   <physicalReflect>
 *     物理攻撃を反射します。
 *
 *   <magicalReflect>
 *     魔法攻撃を反射します。
 *
 * ------------------------------------------------------------------
 * ◆仕様
 * ------------------------------------------------------------------
 * ・反射対象となった側のHPダメージは0になります。
 * ・反射ダメージは「元の最終ダメージ値のコピー」ではありません。
 *   同じ攻撃を攻撃者自身が受けるものとして再計算します。
 *   そのため、元の対象側の防御・被ダメージ補正は持ち越さず、
 *   反射先（攻撃者）側の防御・被ダメージ補正が反映されます。
 * ・反射された攻撃の追加効果（ステート付与・解除、能力強化/弱体など）は
 *   すべて対象に適用されません。
 * ・物理反射は「命中タイプ：物理攻撃」のみ対象です。
 * ・魔法反射は「命中タイプ：魔法攻撃」のみ対象です。
 * ・必中攻撃、HP回復、MPダメージ、MP回復、HP/MP吸収は対象外です。
 * ・ミス／回避した攻撃は通常通りで、反射は発生しません。
 * ・反射ダメージそのものには再反射判定を行わないため、
 *   反射同士でループすることはありません。
 * ・ステートの継続ターンや解除タイミングはデータベース側で設定してください。
 *
 * ------------------------------------------------------------------
 * ◆使用例
 * ------------------------------------------------------------------
 * 「物理反射」ステート：
 *
 *   <physicalReflect>
 *
 * 「魔法反射」ステート：
 *
 *   <magicalReflect>
 *
 * それぞれのステートを付与するスキルを作れば、そのターンだけ
 * 物理または魔法を反射する行動として使用できます。
 *
 * 利用規約：このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    function hasPhysicalReflect(target) {
        return target.states().some(state =>
            state && state.meta && state.meta.physicalReflect !== undefined
        );
    }

    function hasMagicalReflect(target) {
        return target.states().some(state =>
            state && state.meta && state.meta.magicalReflect !== undefined
        );
    }

    function shouldReflect(action, target, value) {
        if (!action || !target || value < 0) {
            return false;
        }

        const item = action.item();
        if (!item || !item.damage || item.damage.type !== 1) {
            // HPダメージ(type 1)のみ。吸収(type 5)等は対象外。
            return false;
        }

        if (action.subject() === target) {
            return false;
        }

        if (action.isPhysical() && hasPhysicalReflect(target)) {
            return true;
        }

        if (action.isMagical() && hasMagicalReflect(target)) {
            return true;
        }

        return false;
    }

    const _Game_Action_executeDamage = Game_Action.prototype.executeDamage;
    Game_Action.prototype.executeDamage = function(target, value) {
        if (!shouldReflect(this, target, value)) {
            _Game_Action_executeDamage.call(this, target, value);
            return;
        }

        const subject = this.subject();

        // 反射された攻撃は対象側のダメージを0にし、
        // 追加効果も無効化するための印を付ける。
        target.result()._damageReflectTriggered = true;
        _Game_Action_executeDamage.call(this, target, 0);

        if (!subject) {
            return;
        }

        // 反射ダメージは、元の対象が受けた最終ダメージ値をコピーしない。
        // 同じ攻撃を「攻撃者自身が受ける」ものとして再計算することで、
        // 元の対象側の防御・被ダメージ補正を持ち越さず、
        // 反射先である攻撃者側の防御・被ダメージ補正を反映する。
        const reflectedValue = Math.max(
            0,
            this.makeDamageValue(subject, !!target.result().critical)
        );

        // 攻撃者側のResultを反射ダメージ表示専用にする。
        subject.clearResult();
        subject.gainHp(-reflectedValue);

        // 表示時に参照できるよう、反射元ターゲットのResultへ印を残す。
        target.result()._damageReflectSubject = subject;
        target.result()._damageReflectValue = reflectedValue;
    };

    // 反射された攻撃は、データベース上の追加効果を一切適用しない。
    // これによりステート付与・解除、バフ/デバフ等も無効になる。
    const _Game_Action_applyItemEffect = Game_Action.prototype.applyItemEffect;
    Game_Action.prototype.applyItemEffect = function(target, effect) {
        if (
            target &&
            target.result &&
            target.result()._damageReflectTriggered
        ) {
            return;
        }

        _Game_Action_applyItemEffect.call(this, target, effect);
    };

    const _Window_BattleLog_displayActionResults =
        Window_BattleLog.prototype.displayActionResults;

    Window_BattleLog.prototype.displayActionResults = function(subject, target) {
        _Window_BattleLog_displayActionResults.call(this, subject, target);

        const result = target ? target.result() : null;
        const reflectSubject = result ? result._damageReflectSubject : null;
        const reflectValue = result ? result._damageReflectValue : 0;

        if (reflectSubject && reflectValue > 0) {
            this.push("pushBaseLine");
            this.displayDamage(reflectSubject);
            this.displayAffectedStatus(reflectSubject);
            this.push("waitForNewLine");
            this.push("popBaseLine");

            result._damageReflectSubject = null;
            result._damageReflectValue = 0;
            result._damageReflectTriggered = false;
        }
    };
})();
