//=============================================================================
// DungeonEscape_DifficultyEncounter.js
//=============================================================================

/*:ja
 * @target MZ
 * @plugindesc 変数の値に応じて、トループ内の「途中から出現」設定された敵の出現数を自動調整します (Ver2.0.0)
 * @author DungeonEscape開発用
 *
 * @param countVariableId
 * @text 出現数変数ID
 * @desc このトループで出現させたい「合計人数」を格納しているゲーム変数の番号。難易度選択時などに好きな値をセットしてください。
 * @type variable
 * @default 1
 *
 * @param messageMode
 * @text 出現メッセージの表示方法
 * @desc combined:まとめて1行(○○たちが現れた！) / individual:1体ずつ(○○が現れた！を複数行)
 * @type select
 * @option まとめて1行(たち表示)
 * @value combined
 * @option 1体ずつ個別に表示
 * @value individual
 * @default combined
 *
 * @param combinedMessageFormat
 * @text まとめ表示の書式
 * @desc %1 に出現した敵の名前(重複除去・「・」区切り)が入ります。messageModeがcombinedの時のみ使用
 * @default %1たちが現れた！
 *
 * @param individualMessageFormat
 * @text 個別表示の書式
 * @desc %1 に敵の名前が入ります。messageModeがindividualの時のみ使用(1体ごとに1行表示されます)
 * @default %1が現れた！
 *
 * @help DungeonEscape_DifficultyEncounter.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * トループ(敵グループ)のメンバーのうち、データベース上で
 * [途中から出現]に設定した敵キャラを、指定した変数の値
 * (=出現させたい合計人数)に応じて戦闘開始と同時に自動で
 * 出現させるプラグインです。
 *
 * 敵の出現メッセージも、常時出現するメンバーを含めて
 * このプラグインが一括生成するため、表示の書式が
 * 統一されます。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 1. 難易度選択などのタイミングで、「出現数変数」に
 *    そのトループで出したい合計人数を直接セットしておく。
 *    (例: Easyを選んだら1〜2の間で決めた値をこの変数に代入、
 *     Hardを選んだら3〜4の間で決めた値を代入、など。
 *     具体的な人数決定は「変数の操作→乱数」などで
 *     イベント側で自由に組んでください)
 *
 * 2. 難易度によって人数を変えたいトループを作成し、
 *    最大人数まで(例:7体)メンバーを配置する。
 *
 * 3. 常に出現させたい1体(基本的に配置の中央)以外の
 *    全メンバーを、メンバー一覧上で右クリック→
 *    [途中から出現]に設定する。
 *
 * 4. あとは何も設定しなくてOK。戦闘開始時にこのプラグインが、
 *    変数の値(=目標人数、トループの総数を超える場合は
 *    自動的に丸められます)を見て、配置の中央から外側へ
 *    向かう優先順(7体構成なら 4→3→5→2→6→1→7)で
 *    自動的に出現させます。
 *
 * ------------------------------------------------------------------
 * ◆出現メッセージについて
 * ------------------------------------------------------------------
 * [途中から出現]の設定が1体でもあるトループでは、標準の
 * 「○○が現れた！」の個別表示を止め、常時出現メンバーも
 * 含めた全員分を、プラグインパラメータ[messageMode]に
 * 従って表示します。
 *
 * ・combined(まとめて1行):「ゴブリン・ラビィたちが現れた！」
 * ・individual(1体ずつ):「ゴブリンが現れた！」→「ラビィが現れた！」
 *
 * [途中から出現]の設定が1体もないトループ(ボス戦など)は、
 * 今まで通り標準のメッセージ表示のままです。
 *
 * ------------------------------------------------------------------
 * ◆この仕組みを無効化したいトループがある場合
 * ------------------------------------------------------------------
 * 敵キャラ(データベースの「敵キャラ」本体、どのキャラでも構いません)の
 * メモ欄に以下のタグを記述すると、そのキャラが含まれるトループでは
 * この仕組み(出現数自動調整・出現メッセージの一括生成)自体が
 * 完全に無効化され、標準の挙動に戻ります。
 *
 * <disableEncounterScaling>
 *
 * 例: 他の仕組み(隠しボスの召喚AIなど)で、隠しメンバーの出現を
 * 独自に管理したいトループのボスキャラのメモ欄に付けてください。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";
    const pluginName = "DungeonEscape_DifficultyEncounter";
    const params = PluginManager.parameters(pluginName);

    const countVariableId = Number(params.countVariableId || 1);
    const messageMode = String(params.messageMode || "combined");
    const combinedMessageFormat = String(params.combinedMessageFormat || "%1たちが現れた！");
    const individualMessageFormat = String(params.individualMessageFormat || "%1が現れた！");

    // 中央から外側へ向かう出現優先順(1始まりのメンバー番号)を返す
    // 例: n=7 なら [4,3,5,2,6,1,7]
    function centerOutOrder(n) {
        const center = Math.ceil(n / 2);
        const order = [center];
        let left = center - 1;
        let right = center + 1;
        while (left >= 1 || right <= n) {
            if (left >= 1) {
                order.push(left);
                left--;
            }
            if (right <= n) {
                order.push(right);
                right++;
            }
        }
        return order;
    }

    function isEnemyHidden(enemy) {
        if (!enemy) return false;
        if (typeof enemy.hidden === "function") return enemy.hidden();
        if (typeof enemy.isHidden === "function") return enemy.isHidden();
        return false;
    }

    // 敵キャラのメモ欄に<disableEncounterScaling>タグを持つ敵が
    // 1体でもいるトループには、この仕組み自体を適用しない
    function troopHasOptOut() {
        return $gameTroop.members().some(enemy => {
            const data = enemy && enemy.enemy && enemy.enemy();
            return !!(data && data.meta && data.meta.disableEncounterScaling);
        });
    }

    function troopUsesThisSystem() {
        if (troopHasOptOut()) return false;
        return $gameTroop.members().some(isEnemyHidden);
    }

    // --- 標準の「○○が現れた！」の個別表示を抑制(このプラグインの対象トループのみ) ---
    const _BattleManager_displayStartMessages = BattleManager.displayStartMessages;
    BattleManager.displayStartMessages = function () {
        if (troopUsesThisSystem()) {
            const originalEnemyNames = Game_Troop.prototype.enemyNames;
            Game_Troop.prototype.enemyNames = function () {
                return [];
            };
            _BattleManager_displayStartMessages.call(this);
            Game_Troop.prototype.enemyNames = originalEnemyNames;
        } else {
            _BattleManager_displayStartMessages.call(this);
        }
    };

    // --- 変数の値に応じて隠れているメンバーを出現させる ---
    function revealByVariable() {
        if (troopHasOptOut()) return;

        const members = $gameTroop.members();
        const totalCount = members.length;
        const hiddenPositions = [];
        members.forEach((enemy, i) => {
            if (isEnemyHidden(enemy)) hiddenPositions.push(i + 1);
        });

        // [途中から出現]設定の敵が1体もいないトループには作用しない
        if (hiddenPositions.length === 0) return;

        let targetTotal = $gameVariables.value(countVariableId) || 1;
        targetTotal = Math.max(1, Math.min(targetTotal, totalCount));

        const visibleCount = totalCount - hiddenPositions.length;
        const additionalNeeded = Math.max(0, targetTotal - visibleCount);

        const order = centerOutOrder(totalCount);
        const hiddenOrder = order.filter(pos => hiddenPositions.includes(pos));
        const toReveal = hiddenOrder.slice(0, additionalNeeded);

        for (const pos of toReveal) {
            const enemy = members[pos - 1];
            if (enemy) enemy.appear();
        }

        // 出現メッセージ(常時出現メンバーも含めた全員分をここでまとめて生成)
        const visibleNames = [];
        members.forEach(enemy => {
            if (enemy && enemy.isAlive() && !isEnemyHidden(enemy)) {
                visibleNames.push(enemy.name());
            }
        });
        const uniqueNames = Array.from(new Set(visibleNames));
        if (uniqueNames.length === 0) return;

        if (messageMode === "individual") {
            for (const name of uniqueNames) {
                $gameMessage.add(individualMessageFormat.format(name));
            }
        } else {
            const nameText = uniqueNames.join("・");
            $gameMessage.add(combinedMessageFormat.format(nameText));
        }
    }

    const _BattleManager_startBattle = BattleManager.startBattle;
    BattleManager.startBattle = function () {
        _BattleManager_startBattle.call(this);
        revealByVariable();
    };
})();
