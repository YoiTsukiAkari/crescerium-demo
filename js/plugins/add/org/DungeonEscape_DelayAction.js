//=============================================================================
// DungeonEscape_DelayAction.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 特定のステートを持つバトラーの行動を、そのステートが続く間ずっと1ターン遅延させるプラグイン Ver2.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_DelayAction.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * ステートのメモ欄に以下のタグを記述してください。
 *
 * <delayAction>
 *
 * このステートを持つバトラーは、行動の選択自体は毎ターン通常通り
 * 行いますが、実際に発動するタイミングが常に「1ターン遅れ」になります。
 *
 * 例(ステートの継続ターン数を3に設定した場合):
 *   1ターン目: 行動Aを選択 → 発動せず、Aをストック
 *   2ターン目: 行動Bを選択 → Aが発動する。Bは次に回ってストック
 *   3ターン目: 行動Cを選択 → Bが発動する。Cは次に回ってストック
 *   4ターン目: ステートが自然解除される → Cが発動して終了
 *
 * ステート自体の解除(継続ターン数)は、データベース側の通常の設定に
 * 完全に任せてください。このプラグインはステートを自分で消したり
 * しません。ステートが切れた後も、最後にストックされていた行動は
 * 1回だけ遅れて発動します。
 *
 * ------------------------------------------------------------------
 * ◆注意
 * ------------------------------------------------------------------
 * ・行動を持ち越す間は、ログウィンドウ側の演出は選択したターンでは
 *  表示されません(発動するターンにまとめて表示されます)。
 * ・複数の行動(行動回数+の特性等)を同時に持つバトラーの場合、最初の
 *  行動だけが持ち越し対象になります。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    function isDelayed(battler) {
        return battler.states().some(s => s.meta.delayAction);
    }

    const _BattleManager_processTurn = BattleManager.processTurn;

    BattleManager.processTurn = function () {
        const subject = this._subject;
        const action = subject ? subject.currentAction() : null;

        if (subject && action && !action._forcing) {
            const affected = isDelayed(subject);
            const stashed = subject._delayedAction || null;

            if (affected || stashed) {
                // 今回選んだ行動は、まだ効果が続く間は次回に回す。
                // 効果が既に切れていれば、今回で持ち越しを終える。
                subject._delayedAction = affected ? action : null;

                if (stashed) {
                    // 前回ストックしておいた行動を、今回実行する
                    subject._actions = [stashed];
                    _BattleManager_processTurn.call(this);
                } else {
                    // まだ何もストックが無い最初のターン: 何もせず終える
                    subject.clearActions();
                    this.endBattlerActions(subject);
                    this._subject = null;
                }
                return;
            }
        }

        _BattleManager_processTurn.call(this);
    };
})();
