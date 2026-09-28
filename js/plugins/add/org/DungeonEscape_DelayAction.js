//=============================================================================
// DungeonEscape_DelayAction.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 特定のステートを持つバトラーの行動を、そのステートが続く間ずっと1ターン遅延させるプラグイン Ver2.2.0
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
 *   4ターン目: ステートが自然解除される
 *              → まずCが発動し、その後4ターン目に選んだ行動Dも発動
 *
 * ステート自体の解除(継続ターン数)は、データベース側の通常の設定に
 * 完全に任せてください。このプラグインはステートを自分で消したり
 * しません。ステートが切れたターンでは、最後にストックされていた行動を
 * 先に発動し、その後そのターンに選んだ通常行動も続けて発動します。
 *
 * ------------------------------------------------------------------
 * ◆注意
 * ------------------------------------------------------------------
 * ・行動を持ち越す間は、ログウィンドウ側の演出は選択したターンでは
 *  表示されません(発動するターンにまとめて表示されます)。
 * ・複数の行動(行動回数+の特性等)を同時に持つバトラーの場合、最初の
 *  行動だけが持ち越し対象になります。
 * ・<QuickSkill> / <ターン消費なし> / <ターン消費無し> のスキルは
 *  遅延の影響を受けず、その場で通常どおり即時発動します。
 * ・QuickSkill使用時、すでに持ち越している遅延行動は消去・上書きせず、
 *  そのまま保持します。
 *
 * ------------------------------------------------------------------
 * ◆Ver2.2.0
 * ------------------------------------------------------------------
 * 連携技などのQuickSkillを遅延対象外にしました。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    function isDelayed(battler) {
        return battler.states().some(s => s.meta.delayAction);
    }

    function isQuickSkill(action) {
        const item = action ? action.item() : null;
        return !!(
            item &&
            item.meta &&
            (
                item.meta.QuickSkill ||
                item.meta["ターン消費なし"] ||
                item.meta["ターン消費無し"]
            )
        );
    }

    const _BattleManager_processTurn = BattleManager.processTurn;

    BattleManager.processTurn = function () {
        const subject = this._subject;
        const action = subject ? subject.currentAction() : null;

        // 連携技などのQuickSkillは遅延対象外。
        // すでに _delayedAction に保持されている行動には一切触れず、
        // QuickSkillだけをその場で通常どおり発動させる。
        if (subject && action && isQuickSkill(action)) {
            _BattleManager_processTurn.call(this);
            return;
        }

        if (subject && action && !action._forcing) {
            const affected = isDelayed(subject);
            const stashed = subject._delayedAction || null;

            if (affected || stashed) {
                // 効果中は今回選んだ行動を次回へ回す。
                // 効果が切れたターンでは持ち越しを終了する。
                subject._delayedAction = affected ? action : null;

                if (stashed) {
                    if (affected) {
                        // 効果継続中：
                        // 前回ストックしておいた行動だけを今回実行し、
                        // 今回選んだ行動は次ターンへ持ち越す。
                        subject._actions = [stashed];
                    } else {
                        // 効果解除ターン：
                        // 前回ストックしておいた行動を先に実行し、
                        // 続けて今回選んだ通常行動も同じターンに実行する。
                        subject._actions = [stashed, action];
                    }
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
