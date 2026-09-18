//=============================================================================
// DungeonEscape_BattleLogSpeed.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc バトルログの表示テンポを調整します（速度倍率・クリア前の決定ボタン待ち・巻き戻し無効化）
 * @author DungeonEscape開発用
 *
 * @param waitMultiplier
 * @text ウェイト倍率
 * @desc 行動中の各行のウェイト時間（フレーム数）を一律で伸縮します。
 * 1.0が標準速度。数値を上げるほどゆっくりになります（0.1〜5.0程度を想定）
 * @type number
 * @decimals 1
 * @min 0.1
 * @max 10
 * @default 1.5
 *
 * @param requireInputBeforeClear
 * @text クリア前に決定ボタンを要求する
 * @desc ONにすると、バトルログが画面から消える(クリアされる)直前に、
 * 決定ボタン(またはタップ/クリック)を押すまで停止するようになります。
 * @type boolean
 * @default false
 *
 * @param disablePopBaseLine
 * @text 途中経過の巻き戻しを無効化する
 * @desc ONにすると、標準機能が行っている「表示→少し待って途中経過を削除」
 * という巻き戻し処理を止め、clear()されるまで全ての行を積み上げ続けます。
 * @type boolean
 * @default false
 *
 * @param maxLinesBeforePop
 * @text 巻き戻しを再開する行数
 * @desc 「途中経過の巻き戻しを無効化する」がONの場合のみ有効。
 * 積み上がった行数がこの数値に達すると、その回だけ通常通り巻き戻しを行い、
 * 表示が際限なく増え続けるのを防ぎます。
 * @type number
 * @min 1
 * @default 10
 *
 * @help DungeonEscape_BattleLogSpeed.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * 【ウェイト倍率】
 * Window_BattleLogが行間の表示に使うウェイト時間（フレーム数）を、
 * 指定した倍率で一律に伸縮します。
 *
 * 【クリア前に決定ボタンを要求する】
 * バトルログが画面から消える直前だけをピンポイントで止め、
 * 決定ボタンを押すまでその場に文字を残し続けます。
 *
 * 【途中経過の巻き戻しを無効化する】
 * 標準のWindow_BattleLogは、pushBaseLine〜popBaseLineという仕組みで
 * 「1発ごとのダメージ表示などを、次の表示に移る前に一旦削除する」処理を
 * 随所で行っています（例:連続攻撃の1発目の表示が、2発目が出る前に消える）。
 * このオプションをONにすると、popBaseLineの中身を無効化し、削除処理自体を
 * 止めます。結果として、clear()が呼ばれるまで全ての行がそのまま積み上がって
 * 残り続けるようになります。
 *
 * ただし積み上げ続けると、バトルログウィンドウの表示可能行数を超えて
 * 画面からはみ出す可能性があります。「巻き戻しを再開する行数」で指定した
 * 行数に達した場合、その回だけ部分的な巻き戻しではなく画面を丸ごとクリア
 * します（普段は積み上げ、限界が近づいたタイミングでリセットする、という
 * 挙動です）。
 */

(() => {
    "use strict";
    const pluginName = "DungeonEscape_BattleLogSpeed";
    const params = PluginManager.parameters(pluginName);
    const waitMultiplier = Number(params.waitMultiplier || 1.5);
    const requireInputBeforeClear = params.requireInputBeforeClear === "true";
    const disablePopBaseLine = params.disablePopBaseLine === "true";
    const maxLinesBeforePop = Number(params.maxLinesBeforePop || 10);

    // ---- 行動中の各行のウェイト時間を一律で伸縮 ----
    const _Window_BattleLog_wait = Window_BattleLog.prototype.wait;
    Window_BattleLog.prototype.wait = function () {
        _Window_BattleLog_wait.call(this);
        this._waitCount = Math.round(this._waitCount * waitMultiplier);
    };

    // ---- クリアされる直前だけ、決定ボタンが押されるまで足止めする ----
    if (requireInputBeforeClear) {
        const _Window_BattleLog_clear = Window_BattleLog.prototype.clear;
        Window_BattleLog.prototype.clear = function () {
            if (Input.isTriggered("ok") || TouchInput.isTriggered()) {
                Input.clear();
                _Window_BattleLog_clear.call(this);
            } else {
                // まだ押されていなければ、クリア処理を次のフレームにもう一度回す
                this._methods.unshift({ name: "clear", params: [] });
            }
        };
    }

    // ---- 途中経過の巻き戻し(popBaseLine)を、行数が上限に達した時だけ「全消去」に置き換える ----
    if (disablePopBaseLine) {
        Window_BattleLog.prototype.popBaseLine = function () {
            if (this._lines.length >= maxLinesBeforePop) {
                // 上限に達していれば、部分的な巻き戻しではなく丸ごとクリアする
                this.clear();
            } else {
                // 上限未満なら、スタックの整合性だけ保ちつつ削除はしない
                if (this._baseLineStack.length > 0) {
                    this._baseLineStack.pop();
                }
            }
        };
    }
})();
