//=============================================================================
// DungeonEscape_ExtraNormalAttack.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc ステート中の敵に、通常行動終了後の追加通常攻撃を1回だけ行わせます Ver1.0.2
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_ExtraNormalAttack.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * ステートのメモ欄に以下のタグを記述してください。
 *
 *   <extraNormalAttack>
 *
 * このステートを持つ敵は、そのターンに予定されている通常の行動を
 * すべて終えた後、生存していれば通常攻撃を1回だけ追加で行います。
 *
 * ------------------------------------------------------------------
 * ◆仕様
 * ------------------------------------------------------------------
 * ・追加攻撃は1ターンにつき1回だけです。
 * ・敵が本来持っている行動回数とは独立して追加されます。
 * ・元の行動が複数回ある場合、それらをすべて終えた後に発動します。
 * ・追加されるのは、このプロジェクトの敵用通常攻撃スキル（ID 301）です。
 * ・対象決定はそのスキルの通常処理に従います。
 * ・追加攻撃の後に、さらに追加攻撃が発生することはありません。
 * ・戦闘不能の敵は追加攻撃を行いません。
 * ・アクターには効果しません。
 *
 * 残光Ⅴ・残光Ⅵなど、複数のステートに同じタグを付けても
 * 追加攻撃は1ターンに1回だけです。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.0.2
 * ------------------------------------------------------------------
 * 追加攻撃でRPGツクール標準の「攻撃」（スキルID 1）ではなく、
 * このプロジェクトの敵用通常攻撃（スキルID 301）を使用するよう修正。
 *
 * ◆Ver1.0.1
 * ------------------------------------------------------------------
 * Ver1.0.0では、最後の通常行動が終わった時点でBattleManagerが
 * 行動者を終了扱いにするため、追加攻撃を差し込めない場合がありました。
 * endActionの終了判定より前に追加攻撃を登録する方式へ修正しています。
 *
 * 利用規約：このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    const ENEMY_NORMAL_ATTACK_SKILL_ID = 301;

    function hasExtraNormalAttack(battler) {
        return battler.states().some(state =>
            state &&
            state.meta &&
            state.meta.extraNormalAttack !== undefined
        );
    }

    function canAddExtraNormalAttack(subject) {
        return (
            subject &&
            subject.isEnemy &&
            subject.isEnemy() &&
            subject.isAlive() &&
            !subject._extraNormalAttackUsed &&
            hasExtraNormalAttack(subject)
        );
    }

    function addExtraNormalAttack(subject) {
        subject._extraNormalAttackUsed = true;

        const action = new Game_Action(subject);
        action.setSkill(ENEMY_NORMAL_ATTACK_SKILL_ID);
        action.setTarget(-1);
        subject._actions.push(action);
    }

    // ターンごとに使用済みフラグをリセット。
    const _Game_Battler_makeActions = Game_Battler.prototype.makeActions;
    Game_Battler.prototype.makeActions = function() {
        _Game_Battler_makeActions.call(this);
        this._extraNormalAttackUsed = false;
    };

    // 通常の最後の行動が終了した直後、
    // BattleManagerが行動者を終了扱いにする「前」に追加攻撃を登録する。
    const _BattleManager_endAction = BattleManager.endAction;
    BattleManager.endAction = function() {
        const subject = this._subject;

        if (
            canAddExtraNormalAttack(subject) &&
            subject.numActions() === 0
        ) {
            addExtraNormalAttack(subject);
        }

        _BattleManager_endAction.call(this);
    };

    // 最後の行動が不発・無効などでendActionを通らなかった場合の保険。
    const _BattleManager_processTurn = BattleManager.processTurn;
    BattleManager.processTurn = function() {
        const subject = this._subject;

        if (
            canAddExtraNormalAttack(subject) &&
            !subject.currentAction()
        ) {
            addExtraNormalAttack(subject);
        }

        _BattleManager_processTurn.call(this);
    };
})();
