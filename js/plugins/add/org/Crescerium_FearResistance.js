/*:
 * @target MZ
 * @plugindesc v1.2.0 「恐怖」の再付与による延長を防ぎ、解除後に「恐怖耐性」を付与します。
 * @author OpenAI
 *
 * @help
 * Crescerium_FearResistance.js
 * ------------------------------------------------------------
 * 「恐怖」ステートについて、以下の2つを行います。
 *
 * 1. すでに恐怖中なら、恐怖の再付与を無効化
 *    → 残りターンがリセット・延長されません。
 *
 * 2. 恐怖が解除されたら、自動で「恐怖耐性」を付与
 *    → 耐性中は恐怖そのものを無効化できます。
 *
 * 【想定される流れ】
 *
 *   テラーアサルト
 *      ↓
 *   恐怖（攻撃コマンド封印）
 *      ↓
 *   恐怖中に再びテラーアサルト
 *      ↓
 *   ダメージは受けるが、恐怖の残りターンは延長されない
 *      ↓
 *   恐怖解除
 *      ↓
 *   恐怖耐性
 *      ↓
 *   一定ターン、恐怖を完全無効化
 *
 * ------------------------------------------------------------
 * 【データベース側の設定】
 *
 * ■「恐怖」ステート
 * ・現在使用している攻撃コマンド封印効果を設定
 * ・希望する持続ターン数をエディタ側で設定
 *   例：1ターンなら 1～1
 *
 * ■「恐怖耐性」ステート
 * ・特徴 → ステート無効化 → 「恐怖」
 * ・自動解除のタイミング → ターン終了時
 * ・継続ターン数 → エディタ側で設定
 *   例：
 *      1ターン耐性 → 1～1
 *      2ターン耐性 → 2～2
 * ・戦闘終了時に解除 → ON 推奨
 *
 * 本プラグインは耐性の継続ターン数には干渉しません。
 *
 * ------------------------------------------------------------
 * 【仕様】
 *
 * ・恐怖中に恐怖を再付与しようとしても、何もしません。
 * ・そのため、恐怖の残りターンは更新されません。
 * ・テラーアサルト自体のダメージには影響しません。
 * ・恐怖が自然解除されても、治療などで解除されても耐性を付与します。
 * ・戦闘中のみ耐性付与処理を行います。
 * ・死亡中には耐性を付与しません。
 * ・耐性のターン管理はRPGツクールMZ標準仕様に任せます。
 *
 * ------------------------------------------------------------
 * 【競合について】
 *
 * Game_Battler.prototype.addState
 * Game_Battler.prototype.removeState
 *
 * の2つをエイリアスして使用します。
 * 元の処理を呼ぶ方式で、標準メソッドを完全置換しません。
 *
 * ステート付与・解除処理を独自に完全置換するプラグインがある場合は、
 * プラグイン順や競合確認が必要になる可能性があります。
 *
 * ------------------------------------------------------------
 *
 * @param fearStateId
 * @text 恐怖ステート
 * @desc テラーアサルトで付与する「恐怖」ステートを指定してください。
 * @type state
 * @default 0
 *
 * @param resistanceStateId
 * @text 恐怖耐性ステート
 * @desc 「恐怖」を無効化する耐性ステートを指定してください。
 * @type state
 * @default 0
 *
 * @param debugLog
 * @text デバッグログ
 * @desc ONにすると、恐怖の再付与防止・解除・耐性付与をF8コンソールへ表示します。
 * @type boolean
 * @on ON
 * @off OFF
 * @default false
 */

(() => {
    "use strict";

    const currentScript = document.currentScript;
    const pluginName = currentScript && currentScript.src
        ? decodeURIComponent(currentScript.src).match(/([^/]+)\.js$/)?.[1] || "Crescerium_FearResistance"
        : "Crescerium_FearResistance";

    const params = PluginManager.parameters(pluginName);
    const fearStateId = Number(params.fearStateId || 0);
    const resistanceStateId = Number(params.resistanceStateId || 0);
    const debugLog = String(params.debugLog || "false") === "true";

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

    function validSettings() {
        return fearStateId > 0 &&
               resistanceStateId > 0 &&
               fearStateId !== resistanceStateId;
    }

    function inBattle() {
        return $gameParty &&
               $gameParty.inBattle &&
               $gameParty.inBattle();
    }

    function canGrantResistance(battler) {
        if (!validSettings()) return false;
        if (!inBattle()) return false;
        if (BattleManager && BattleManager._phase === "battleEnd") return false;
        if (!battler || !battler.isAlive || !battler.isAlive()) return false;
        return true;
    }

    // ---------------------------------------------------------
    // 恐怖中の「恐怖」再付与を完全に無視する。
    //
    // MZ標準の addState() は、すでに同じステートが付いていても
    // resetStateCounts() を実行するため、持続ターンが更新されます。
    //
    // そこで、恐怖だけは既に付与済みなら標準処理へ進ませず、
    // 残りターンをそのまま維持します。
    // ---------------------------------------------------------
    const _Game_Battler_addState = Game_Battler.prototype.addState;
    Game_Battler.prototype.addState = function(stateId) {
        if (
            validSettings() &&
            inBattle() &&
            stateId === fearStateId &&
            this.isStateAffected &&
            this.isStateAffected(fearStateId)
        ) {
            log(`${this.name()} は既に恐怖中のため、恐怖の再付与を無効化しました。`);
            return;
        }

        _Game_Battler_addState.call(this, stateId);
    };

    // ---------------------------------------------------------
    // 恐怖解除後に「恐怖耐性」を自動付与する。
    // 自然解除・治療解除のどちらでも動作します。
    // ---------------------------------------------------------
    const _Game_Battler_removeState = Game_Battler.prototype.removeState;
    Game_Battler.prototype.removeState = function(stateId) {
        const wasFear =
            validSettings() &&
            stateId === fearStateId &&
            this.isStateAffected &&
            this.isStateAffected(fearStateId);

        _Game_Battler_removeState.call(this, stateId);

        if (!wasFear) return;

        // 念のため、本当に恐怖が外れたことを確認。
        if (this.isStateAffected(fearStateId)) return;

        if (!canGrantResistance(this)) return;

        this.addState(resistanceStateId);

        if (this.isStateAffected(resistanceStateId)) {
            log(`${this.name()} の恐怖が解除され、恐怖耐性を付与しました。`);
        } else {
            warn(`${this.name()} に恐怖耐性を付与できませんでした。`);
        }
    };

    // ---------------------------------------------------------
    // 起動時確認
    // ---------------------------------------------------------
    if (debugLog) {
        if (!validSettings()) {
            warn(
                "プラグイン設定を確認してください。",
                `fearStateId=${fearStateId}`,
                `resistanceStateId=${resistanceStateId}`
            );
        } else {
            log(
                "読み込み完了 v1.2.0",
                `恐怖=${fearStateId}`,
                `恐怖耐性=${resistanceStateId}`
            );
        }
    }
})();
