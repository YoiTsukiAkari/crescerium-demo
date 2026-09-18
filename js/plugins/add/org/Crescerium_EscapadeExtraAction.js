/*:
 * @target MZ
 * @plugindesc v1.1.0 相反のエスカペード用：セラのそのターンの行動枠を最大2枠にします。
 * @author OpenAI
 *
 * @help
 * Crescerium_EscapadeExtraAction.js
 * ------------------------------------------------------------
 * 「相反のエスカペード」の即時発動処理から呼び出し、
 * 対象アクター（セラ）のそのターンの行動枠を最大2枠にします。
 *
 * 【v1.1.0】
 * 即時発動プラグインとの併用を想定し、
 * BattleManager.isInputting() の制限を削除しました。
 * 即時発動中に一時的に action フェーズ等へ移っていても、
 * セラの既存 action 配列へ2枠目を追加できます。
 *
 * 想定フロー：
 *   1. クレイが「相反のエスカペード」を即時発動
 *   2. クレイへ「庇う＋70%カット＋行動不能」を付与
 *   3. 本プラグインの「追加行動を付与」を呼ぶ
 *   4. 即時発動処理終了後、通常の入力へ復帰
 *   5. セラの1枠目を入力
 *   6. MZ標準の複数行動入力により、続けて2枠目を入力
 *
 * 【重要】
 * ・本プラグインは追加行動枠だけを担当します。
 * ・何度呼んでも最大2枠までです。3回行動にはなりません。
 * ・次ターンはMZ標準の makeActions() で行動枠が作り直されます。
 * ・標準ターン制戦闘を想定しています。TPBは対象外です。
 * ・BattleManager / Scene_Battle の標準メソッドは上書きしません。
 *
 * 【プラグインコマンド】
 * 「追加行動を付与」
 * 対象アクターにセラを指定してください。
 *
 * 【スクリプト/API】
 * CresceriumEscapadeExtraAction.grant(セラのアクターID);
 *
 * 成功時 true、条件不成立または既に2枠なら false。
 *
 * @param defaultActorId
 * @text 既定の対象アクター
 * @desc プラグインコマンドで対象を省略した場合に使用。セラを指定してください。
 * @type actor
 * @default 0
 *
 * @param maxActions
 * @text 最大行動数
 * @desc 通常は2のまま使用してください。
 * @type number
 * @min 2
 * @max 9
 * @default 2
 *
 * @param debugLog
 * @text デバッグログ
 * @desc テスト中はON推奨。開発者コンソールへ処理結果を表示します。
 * @type boolean
 * @on ON
 * @off OFF
 * @default true
 *
 * @command GrantExtraAction
 * @text 追加行動を付与
 * @desc 対象アクターのそのターンの行動枠を最大行動数まで増やします。
 *
 * @arg actorId
 * @text 対象アクター
 * @desc 0ならプラグインパラメータ「既定の対象アクター」を使用します。
 * @type actor
 * @default 0
 */

(() => {
    "use strict";

    const currentScript = document.currentScript;
    const pluginName = currentScript && currentScript.src
        ? decodeURIComponent(currentScript.src).match(/([^/]+)\.js$/)?.[1] || "Crescerium_EscapadeExtraAction"
        : "Crescerium_EscapadeExtraAction";

    const params = PluginManager.parameters(pluginName);
    const defaultActorId = Number(params.defaultActorId || 0);
    const configuredMaxActions = Math.max(2, Number(params.maxActions || 2));
    const debugLog = String(params.debugLog ?? "true") === "true";

    function log(...args) {
        if (debugLog) {
            console.log(`[${pluginName}]`, ...args);
        }
    }

    function warn(...args) {
        if (debugLog) {
            console.warn(`[${pluginName}]`, ...args);
        }
    }

    function grantExtraAction(actorId, maxActions = configuredMaxActions) {
        const id = Number(actorId || defaultActorId);
        const limit = Math.max(2, Number(maxActions || configuredMaxActions));

        log("追加行動付与処理を呼び出しました。", {
            actorId: id,
            phase: BattleManager._phase,
            currentActor: typeof BattleManager.actor === "function" && BattleManager.actor()
                ? BattleManager.actor().name()
                : null
        });

        if (!$gameParty || !$gameParty.inBattle()) {
            warn("戦闘中ではないため追加しませんでした。");
            return false;
        }

        if (typeof BattleManager.isTpb === "function" && BattleManager.isTpb()) {
            warn("TPB戦闘は対象外です。");
            return false;
        }

        if (!Number.isInteger(id) || id <= 0) {
            warn("対象アクターIDが未設定です。", id);
            return false;
        }

        const actor = $gameActors.actor(id);
        if (!actor) {
            warn(`アクターID ${id} が見つかりません。`);
            return false;
        }

        if (!actor.isBattleMember()) {
            warn(`${actor.name()} は戦闘メンバーではありません。`);
            return false;
        }

        // canInput() は即時発動中の一時的な状態変化や他プラグインの制御で
        // false になる可能性があるため、ここでは追加条件に使用しません。
        // 実際の入力可否はMZ本体へ任せます。

        const before = actor.numActions();

        if (before >= limit) {
            log(`${actor.name()} は既に ${before} 行動枠あります。上限 ${limit} のため変更なし。`);
            return false;
        }

        while (actor.numActions() < limit) {
            actor.setAction(actor.numActions(), new Game_Action(actor));
        }

        const after = actor.numActions();
        log(`${actor.name()} の行動枠を ${before} → ${after} にしました。`);
        return after > before;
    }

    PluginManager.registerCommand(pluginName, "GrantExtraAction", args => {
        const actorId = Number(args.actorId || 0) || defaultActorId;
        grantExtraAction(actorId, configuredMaxActions);
    });

    globalThis.CresceriumEscapadeExtraAction = Object.freeze({
        grant: grantExtraAction,
        version: "1.1.0"
    });

    log("プラグインを読み込みました。v1.1.0");
})();
