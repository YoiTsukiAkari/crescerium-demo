//=============================================================================
// DungeonEscape_TpGainMessage.js
//=============================================================================

/*:ja
 * @target MZ
 * @plugindesc 行動の結果、味方のTPが上昇していた場合にバトルログへメッセージを表示します (Ver1.2.0)
 * @author DungeonEscape開発用
 *
 * @param tpGainText
 * @text 表示するテキスト
 * @desc TP上昇時にバトルログへ表示する文言です。空欄にすると表示されません
 * @default TPが上昇した！
 *
 * @help DungeonEscape_TpGainMessage.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * 1つの行動(スキル・アイテムの使用)が終わった時点で、味方
 * (アクター)のTPが行動前より1でも上昇していれば、バトルログに
 * メッセージを表示します。
 *
 * TP上昇の発生源(庇う・回復・弱点コンボ・その他DungeonEscape_
 * SelfEffects.js経由のタグなど)を個別に判定しているわけではなく、
 * 「行動前後でTPの値が実際に増えたかどうか」だけを見ているので、
 * どんな手段によるTP上昇でも共通して拾うことができます。
 *
 * 複数の味方が同時にTP上昇した場合(パーティ全体TP上昇など)でも、
 * メッセージは1行だけ表示されます。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.1.0での変更点
 * ------------------------------------------------------------------
 * 標準のBattleManager.endActionは、内部で「バトルログのクリア」を
 * 予約してから処理が終わります。以前のバージョンはその後にTP上昇
 * メッセージを追加していたため、「攻撃のログがクリアされた後に、
 * 何もない画面にTPメッセージだけが表示される」という順序になって
 * いました。
 *
 * TP判定自体は今まで通り「全ての処理が完了した後」に行いますが
 * （DungeonEscape_SelfEffects.js等、他プラグインによるTP付与が
 * 確実に終わった状態で正しく判定するため）、表示する位置だけは
 * 通常のpush（キュー末尾に追加）ではなく、キューの先頭に割り込ませる
 * 形にしました。これにより、TP判定の正確さを保ったまま、表示は
 * クリアの予約より前（攻撃結果と同じ画面内）に割り込ませています。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.2.0での変更点（重複表示防止）
 * ------------------------------------------------------------------
 * 何らかの理由でBattleManager.endAction()が同じ行動に対して複数回
 * 呼ばれてしまうケースがあり、その場合「TPが上昇した！」がもう一度
 * 単独で表示されてしまう問題があった。
 *
 * 原因は、TP判定の基準となるtpBeforeSnapshot(行動前のTP)が
 * startActionの時点で1回しか記録されないため、endActionが2回目に
 * 呼ばれた際も「最初の行動前」との比較になってしまい、1回目の
 * endActionで既に上昇済みのTPと比較して再び「上昇した」と判定
 * されてしまうことだった。
 *
 * 対策として、1つの行動(startAction)につき1回だけメッセージ判定を
 * 行うようフラグ(tpGainProcessed)を追加し、2回目以降のendAction
 * 呼び出しでは判定・表示処理自体をスキップするようにした。
 * このフラグはGame_Actionオブジェクトではなくプラグイン内部の変数で
 * 管理しているため、Torigoya_QuickSkill.js等がGame_Actionオブジェクトを
 * 使い回すケースの影響も受けない。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 導入してONにするだけで動作します。
 * 表示するテキストは、プラグインパラメータでいつでも変更できます。
 * 空欄にすれば、メッセージ自体を出さないようにもできます。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";
    const pluginName = "DungeonEscape_TpGainMessage";
    const params = PluginManager.parameters(pluginName);
    const tpGainText = String(params.tpGainText || "");

    let tpBeforeSnapshot = {};
    let tpGainProcessed = false;

    const _BattleManager_startAction = BattleManager.startAction;
    BattleManager.startAction = function () {
        tpBeforeSnapshot = {};
        tpGainProcessed = false;
        for (const actor of $gameParty.members()) {
            tpBeforeSnapshot[actor.actorId()] = actor.tp;
        }
        _BattleManager_startAction.call(this);
    };

    const _BattleManager_endAction = BattleManager.endAction;
    BattleManager.endAction = function () {
        // 先に本来のendActionを呼ぶ（SelfEffects等によるTP付与も含めて全て完了させる）
        _BattleManager_endAction.call(this);

        // 同じ行動(startAction)に対する2回目以降のendActionでは、
        // 判定・表示処理自体をスキップする(重複表示防止)
        if (tpGainProcessed) return;
        tpGainProcessed = true;

        if (!tpGainText || !this._logWindow) return;

        let tpIncreased = false;
        for (const actor of $gameParty.members()) {
            const before = tpBeforeSnapshot[actor.actorId()];
            if (before !== undefined && actor.tp > before) {
                tpIncreased = true;
                break;
            }
        }

        if (tpIncreased) {
            // 通常のpush(末尾に追加)ではなく、キューの先頭に割り込ませる。
            // これにより「TP判定は全処理完了後」のまま、「表示はクリアの予約より前」を両立する。
            this._logWindow._methods.unshift({ name: "addText", params: [tpGainText] });
        }
    };
})();
