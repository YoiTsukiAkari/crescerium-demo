//=============================================================================
// DungeonEscape_DEBUG_BattleLogTracker.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 【調査用・一時的】バトルログにpushされた内容と発生元を
 * コンソールに記録します。原因特定後は削除してください。
 * @author DungeonEscape開発用（デバッグ用）
 *
 * @help DungeonEscape_DEBUG_BattleLogTracker.js
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 導入して戦闘をプレイし、問題が発生したら開発者ツール(F12、または
 * NW.jsのメニュー→開発者ツール)のコンソールを確認してください。
 *
 * 以下がフレーム番号付きで記録されます。
 * ・「=== startAction: 誰の行動か ===」「=== endAction ===」で行動の区切り
 * ・push()されたメソッド名・引数・呼び出し元のスタックトレース(先頭数行)
 * ・clear()が実際に実行された瞬間
 *
 * 「本来ならクリアされているはずの位置に文字が残っている」ような
 * 事象が起きた場合、ログを遡って「そのテキストがいつpushされたか」
 * 「その後clearは呼ばれたか」を確認することで、発生源のプラグインを
 * 特定できます。
 *
 * ------------------------------------------------------------------
 * ◆注意
 * ------------------------------------------------------------------
 * このプラグインは調査専用です。本番のプラグイン構成には含めず、
 * 原因が分かったタイミングで無効化・削除してください。
 */

(() => {
    "use strict";

    function frameCount() {
        return Graphics.frameCount;
    }

    function shortStack() {
        const stack = new Error().stack || "";
        // 呼び出し元(自分自身・push本体を除いた2〜4行目あたり)だけ抜き出す
        return stack.split("\n").slice(2, 5).map(s => s.trim()).join(" | ");
    }

    // ---- push() の記録 ----
    const _Window_BattleLog_push = Window_BattleLog.prototype.push;
    Window_BattleLog.prototype.push = function (methodName, ...args) {
        console.log(
            `[BattleLogDebug] frame=${frameCount()} push("${methodName}", ${JSON.stringify(args)}) <- ${shortStack()}`
        );
        _Window_BattleLog_push.call(this, methodName, ...args);
    };

    // ---- clear() が実際に実行された瞬間の記録 ----
    const _Window_BattleLog_clear = Window_BattleLog.prototype.clear;
    Window_BattleLog.prototype.clear = function () {
        console.log(`[BattleLogDebug] frame=${frameCount()} ★clear実行★ 直前の行: ${JSON.stringify(this._lines)}`);
        _Window_BattleLog_clear.call(this);
    };

    // ---- 行動の区切りの記録 ----
    const _BattleManager_startAction = BattleManager.startAction;
    BattleManager.startAction = function () {
        const subject = this._subject;
        console.log(`[BattleLogDebug] frame=${frameCount()} === startAction: ${subject ? subject.name() : "?"} ===`);
        _BattleManager_startAction.call(this);
    };

    const _BattleManager_endAction = BattleManager.endAction;
    BattleManager.endAction = function () {
        console.log(`[BattleLogDebug] frame=${frameCount()} === endAction ===`);
        _BattleManager_endAction.call(this);
    };
})();
