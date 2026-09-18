/*:
 * @target MZ
 * @plugindesc v2.0.0 同じ毒ステートを重ね掛けするたび、毎ターンの毒ダメージが倍増します。
 * @author OpenAI
 *
 * @help
 * Crescerium_StackingPoison.js
 * ------------------------------------------------------------
 * RPGツクールMZ用。
 *
 * 「時間経過で倍増」ではなく、
 * 「同じ毒ステートを再付与されるたびに倍増」する毒を作ります。
 *
 * 例：
 *   1回目の付与 → 毎ターン 10ダメージ
 *   2回目の付与 → 毎ターン 20ダメージ
 *   3回目の付与 → 毎ターン 40ダメージ
 *   4回目の付与 → 毎ターン 80ダメージ
 *   5回目の付与 → 毎ターン160ダメージ
 *
 * 一度解除されると段階はリセットされ、
 * 次に付与された時は再び10ダメージから始まります。
 *
 * ------------------------------------------------------------
 * ■ 基本タグ
 * ------------------------------------------------------------
 *
 * 毒ステートのメモ欄に：
 *
 *   <重複毒:10>
 *
 * と記入してください。
 *
 * 英語タグ：
 *
 *   <StackingPoison:10>
 *
 * 旧プラグインからの移行用として、
 *
 *   <倍増毒:10>
 *
 * も同じ意味で使用できます。
 *
 * ------------------------------------------------------------
 * ■ 倍率を変更したい場合
 * ------------------------------------------------------------
 *
 *   <重複毒倍率:2>
 *
 * 英語：
 *
 *   <StackingPoisonRate:2>
 *
 * 省略時は2倍です。
 *
 * 例：
 *   <重複毒:10>
 *   <重複毒倍率:1.5>
 *
 * → 10 → 15 → 22 → 33 ...（小数点以下切り捨て）
 *
 * ------------------------------------------------------------
 * ■ 最大段階を設定したい場合
 * ------------------------------------------------------------
 *
 *   <重複毒最大段階:5>
 *
 * 英語：
 *
 *   <StackingPoisonMaxStacks:5>
 *
 * 例：
 *   <重複毒:10>
 *   <重複毒最大段階:5>
 *
 * → 10 → 20 → 40 → 80 → 160
 * 以後、再付与されても160のままです。
 *
 * 省略時は段階上限なしです。
 *
 * ------------------------------------------------------------
 * ■ ダメージ上限を設定したい場合
 * ------------------------------------------------------------
 *
 *   <重複毒ダメージ上限:160>
 *
 * 英語：
 *
 *   <StackingPoisonDamageCap:160>
 *
 * → 段階自体は増えても、毎ターンのダメージは160を超えません。
 *
 * 省略時はダメージ上限なしです。
 *
 * ------------------------------------------------------------
 * ■ ステート側の推奨設定
 * ------------------------------------------------------------
 *
 * ・HP再生率：設定不要（0%のままでOK）
 * ・通常の毒とは別ステートにして重複可能
 * ・戦闘終了時に解除：ON 推奨
 * ・自動解除：任意
 *
 * この毒のダメージは本プラグインが直接処理します。
 *
 * ------------------------------------------------------------
 * ■ 再付与時の挙動
 * ------------------------------------------------------------
 *
 * MZ標準では、同じステートを再付与すると
 * ステートの残りターン数が更新されます。
 *
 * 本プラグインはその標準挙動を残したまま、
 * 「重ね掛け段階」を1つ増加させます。
 *
 * つまり、自動解除ありのステートなら、
 * 再付与によって持続ターンも更新されます。
 *
 * ------------------------------------------------------------
 * ■ 致死について
 * ------------------------------------------------------------
 *
 * この毒はHPを0まで減らせます。
 * 放置・重ね掛けによって死亡する「猛毒」として使用できます。
 *
 * ------------------------------------------------------------
 * ■ 通常毒との重複
 * ------------------------------------------------------------
 *
 * 通常の「HP再生率マイナス」の毒と同時に付与できます。
 *
 * 例：
 *   通常毒 60ダメージ
 *   重複毒 40ダメージ
 *
 * → ターン終了時の最終的なHP減少は合計100です。
 *
 * ------------------------------------------------------------
 * ■ 注意
 * ------------------------------------------------------------
 *
 * ・戦闘中のみ重複毒ダメージが発生します。
 * ・同じステートの再付与が成功した時だけ段階が上がります。
 * ・ステート解除時に段階は消去されます。
 * ・複数種類の重複毒ステートを同時に受けた場合、
 *   それぞれ個別に計算して合算します。
 *
 * 以下をエイリアスしています：
 *   Game_Battler.prototype.addState
 *   Game_Battler.prototype.removeState
 *   Game_Battler.prototype.regenerateAll
 *   Game_BattlerBase.prototype.clearStates
 *
 * ステート・ターン終了処理を大きく変更するプラグインがある場合は、
 * 競合確認が必要になる可能性があります。
 */

(() => {
    "use strict";

    const TAG_BASE_JP = "重複毒";
    const TAG_BASE_EN = "StackingPoison";
    const TAG_BASE_OLD = "倍増毒";

    const TAG_RATE_JP = "重複毒倍率";
    const TAG_RATE_EN = "StackingPoisonRate";

    const TAG_MAX_STACKS_JP = "重複毒最大段階";
    const TAG_MAX_STACKS_EN = "StackingPoisonMaxStacks";

    const TAG_DAMAGE_CAP_JP = "重複毒ダメージ上限";
    const TAG_DAMAGE_CAP_EN = "StackingPoisonDamageCap";

    function readMeta(meta, keys) {
        if (!meta) return undefined;

        for (const key of keys) {
            if (meta[key] !== undefined) {
                return meta[key];
            }
        }

        return undefined;
    }

    function readNumber(meta, keys, defaultValue) {
        const raw = readMeta(meta, keys);

        if (
            raw === undefined ||
            raw === true ||
            raw === null ||
            raw === ""
        ) {
            return defaultValue;
        }

        const value = Number(raw);
        return Number.isFinite(value) ? value : defaultValue;
    }

    function poisonConfig(state) {
        if (!state || !state.meta) return null;

        const rawBase = readMeta(
            state.meta,
            [TAG_BASE_JP, TAG_BASE_EN, TAG_BASE_OLD]
        );

        if (
            rawBase === undefined ||
            rawBase === true ||
            rawBase === null ||
            rawBase === ""
        ) {
            return null;
        }

        const base = Number(rawBase);

        if (!Number.isFinite(base) || base <= 0) {
            return null;
        }

        const rate = Math.max(
            0,
            readNumber(
                state.meta,
                [TAG_RATE_JP, TAG_RATE_EN],
                2
            )
        );

        const maxStacksRaw = readNumber(
            state.meta,
            [TAG_MAX_STACKS_JP, TAG_MAX_STACKS_EN],
            0
        );

        const damageCapRaw = readNumber(
            state.meta,
            [TAG_DAMAGE_CAP_JP, TAG_DAMAGE_CAP_EN],
            0
        );

        return {
            base: Math.floor(base),
            rate: rate,
            maxStacks:
                maxStacksRaw > 0
                    ? Math.max(1, Math.floor(maxStacksRaw))
                    : 0,
            damageCap:
                damageCapRaw > 0
                    ? Math.floor(damageCapRaw)
                    : 0
        };
    }

    function ensureStacks(battler) {
        if (!battler._cresceriumStackingPoisonStacks) {
            battler._cresceriumStackingPoisonStacks = {};
        }

        return battler._cresceriumStackingPoisonStacks;
    }

    function getStack(battler, stateId) {
        const stacks = ensureStacks(battler);
        const value = Number(stacks[stateId]);

        return Number.isFinite(value) && value >= 1
            ? Math.floor(value)
            : 1;
    }

    function setStack(battler, stateId, value) {
        const stacks = ensureStacks(battler);
        stacks[stateId] = Math.max(1, Math.floor(value));
    }

    function taggedPoisonStates(battler) {
        return battler.states()
            .map(state => ({
                state: state,
                config: poisonConfig(state)
            }))
            .filter(entry => entry.config);
    }

    // ---------------------------------------------------------
    // ステート全消去時に段階情報も初期化
    // ---------------------------------------------------------
    const _Game_BattlerBase_clearStates =
        Game_BattlerBase.prototype.clearStates;

    Game_BattlerBase.prototype.clearStates = function() {
        _Game_BattlerBase_clearStates.call(this);
        this._cresceriumStackingPoisonStacks = {};
    };

    // ---------------------------------------------------------
    // 初回付与 → 段階1
    // 再付与   → 段階+1
    // ---------------------------------------------------------
    const _Game_Battler_addState =
        Game_Battler.prototype.addState;

    Game_Battler.prototype.addState = function(stateId) {
        const state = $dataStates[stateId];
        const config = poisonConfig(state);
        const wasAffected = this.isStateAffected(stateId);

        _Game_Battler_addState.call(this, stateId);

        // 実際にステートが付与されなかった場合は何もしない
        if (!config || !this.isStateAffected(stateId)) {
            return;
        }

        if (!wasAffected) {
            // 初回
            setStack(this, stateId, 1);
        } else {
            // 再付与
            let nextStack = getStack(this, stateId) + 1;

            if (config.maxStacks > 0) {
                nextStack = Math.min(
                    nextStack,
                    config.maxStacks
                );
            }

            setStack(this, stateId, nextStack);
        }
    };

    // ---------------------------------------------------------
    // ステート解除時に段階を破棄
    // ---------------------------------------------------------
    const _Game_Battler_removeState =
        Game_Battler.prototype.removeState;

    Game_Battler.prototype.removeState = function(stateId) {
        const wasAffected = this.isStateAffected(stateId);

        _Game_Battler_removeState.call(this, stateId);

        if (
            wasAffected &&
            !this.isStateAffected(stateId) &&
            this._cresceriumStackingPoisonStacks
        ) {
            delete this._cresceriumStackingPoisonStacks[stateId];
        }
    };

    // ---------------------------------------------------------
    // ターン終了時
    //
    // MZ標準の通常毒・HP再生を先に処理し、
    // その後に重複毒ダメージを追加。
    //
    // 段階は時間経過では増えない。
    // ---------------------------------------------------------
    const _Game_Battler_regenerateAll =
        Game_Battler.prototype.regenerateAll;

    Game_Battler.prototype.regenerateAll = function() {
        const hpBefore = this.hp;

        // MZ標準処理
        _Game_Battler_regenerateAll.call(this);

        if (
            !$gameParty ||
            !$gameParty.inBattle() ||
            !this.isAlive()
        ) {
            return;
        }

        const poisons = taggedPoisonStates(this);

        if (poisons.length === 0) {
            return;
        }

        let extraDamage = 0;

        for (const entry of poisons) {
            const stateId = entry.state.id;
            const config = entry.config;
            const stack = getStack(this, stateId);

            let damage =
                config.base *
                Math.pow(config.rate, stack - 1);

            damage = Math.floor(damage);

            if (config.damageCap > 0) {
                damage = Math.min(
                    damage,
                    config.damageCap
                );
            }

            damage = Math.max(0, damage);
            extraDamage += damage;
        }

        if (extraDamage > 0) {
            // 致死可能
            this.gainHp(-extraDamage);
        }

        // 通常毒・回復・重複毒をまとめた最終HP差分を
        // ターン終了時表示用のresultへ反映
        const totalHpDamage = hpBefore - this.hp;

        if (totalHpDamage !== 0) {
            this._result.hpAffected = true;
            this._result.hpDamage = totalHpDamage;
        }
    };
})();
