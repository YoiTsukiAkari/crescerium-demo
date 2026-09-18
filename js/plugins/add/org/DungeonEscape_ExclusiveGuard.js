//=============================================================================
// DungeonEscape_ExclusiveGuard.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 特定のステートを付与するスキルを、常に最大1体しか選択できないようにするプラグイン Ver3.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_ExclusiveGuard.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * スキルのメモ欄に以下のタグを記述してください。
 *
 * <exclusiveGuard:ステートID>
 *
 * 例: <exclusiveGuard:51>   → ステートID51(「庇う」)を指定
 *
 * このタグを持つスキルは、以下の**どちらか一方でも**当てはまる場合、
 * 行動パターンの候補から除外されます(自分自身が既にそのステートを
 * 持っている場合は除外されません＝継続して選び直せます)。
 *
 * ① 自分以外の生存メンバーが、既に指定したステートを持っている
 *    (複数ターンにまたがって、既に誰かが庇い中のケース)
 * ② 今ターン、既に他の個体がこのスキルの選択を確定させている
 *    (トループの行動は全員分まとめて決定されるため、①だけでは
 *     「まだ誰も発動していない決定フェーズ中」に複数体が同時に
 *     選んでしまうことがあり、それを防ぐための追加チェック)
 *
 * 例えば、リザードマンが複数体いるトループで「庇う」スキルに
 * このタグを付けておけば、常に1体だけが庇う状態になります。
 * その1体が戦闘不能になる、またはステートが解除されると、次に
 * 行動する個体が自然に引き継ぎます。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    let claimedStates = new Set();

    // ターンが切り替わるたびに、その回の「予約」をリセットする
    const _BattleManager_startInput = BattleManager.startInput;
    BattleManager.startInput = function () {
        claimedStates = new Set();
        _BattleManager_startInput.call(this);
    };

    const _Game_Enemy_isActionValid = Game_Enemy.prototype.isActionValid;
    Game_Enemy.prototype.isActionValid = function (action) {
        if (!_Game_Enemy_isActionValid.call(this, action)) return false;

        const skill = $dataSkills[action.skillId];
        if (skill && skill.meta.exclusiveGuard) {
            const stateId = Number(skill.meta.exclusiveGuard);

            // ①既に自分以外の誰かが、現にそのステートを持っている
            const someoneElseHasState = $gameTroop
                .members()
                .some(m => m.isAlive() && m !== this && m.isStateAffected(stateId));

            // ②今ターン、既に誰かがこのステートの枠を予約済み
            const claimedThisTurn = claimedStates.has(stateId);

            if (someoneElseHasState || claimedThisTurn) return false;
        }
        return true;
    };

    const _Game_Enemy_makeActions = Game_Enemy.prototype.makeActions;
    Game_Enemy.prototype.makeActions = function () {
        _Game_Enemy_makeActions.call(this);
        const action = this.currentAction();
        if (action && action.item()) {
            const skill = action.item();
            if (skill.meta.exclusiveGuard) {
                claimedStates.add(Number(skill.meta.exclusiveGuard));
            }
        }
    };
})();
