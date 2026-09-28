//=============================================================================
// DungeonEscape_LightPartyAI.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 光のオーブ＋従者6体の専用AIをまとめて制御します Ver1.0.2
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_LightPartyAI.js
 *
 * ============================================================================
 * ■概要
 * ============================================================================
 * 光のオーブ戦専用のAIプラグインです。
 *
 * ・オーブ：初期2体＋召喚袋＋蘇生袋＋難易度連動クールタイム
 * ・騎士：庇い優先
 * ・魔導士：濡れ人数に応じてアクア／フルメン／グラキエス
 * ・巫女：単体回復／全体回復／加護
 * ・盟主：仲間がいれば連携、一人なら防御
 * ・錬金術師：4種の精神異常を等確率で使用
 * ・剣闘士：通常攻撃＋未使用の永久バフから等確率で選択
 *
 * スキルID・ステートID・クレイのアクターIDは、すべてメモ欄で指定します。
 *
 * ============================================================================
 * ■重要：旧AIプラグイン
 * ============================================================================
 * このプラグインを使う場合、以下の旧AIプラグインはOFF推奨です。
 *
 *   DungeonEscape_OrbSummonAI.js
 *   DungeonEscape_PriestessHealAI.js
 *   DungeonEscape_ComboAttacker.js
 *
 * 旧タグ <orbAI> <orbCooldown> <healPriority> <comboAttacker> ではなく、
 * 下記の light～ タグを使用してください。
 *
 * RandomTargetOnly / DelayAction など、スキル・ステートそのものの効果を
 * 実装するプラグインは、このAIプラグインとは別物なのでそのまま使用できます。
 *
 * ============================================================================
 * ■光のオーブ
 * ============================================================================
 *
 * オーブの敵キャラのメモ欄：
 *
 * <lightOrbAI:蘇生スキルID,召喚スキルID,待機スキルID>
 * <lightOrbCooldown:変数ID,変数最小値,変数最大値,最小難度時CT,最大難度時CT>
 * <lightServantIds:騎士ID,魔導士ID,巫女ID,盟主ID,錬金術師ID,剣闘士ID>
 * <lightInitialCount:2>
 *
 * 現在のデータを使う例：
 *
 * <lightOrbAI:365,364,366>
 * <lightOrbCooldown:1,1,7,4,1>
 * <lightServantIds:28,29,30,31,32,33>
 * <lightInitialCount:2>
 *
 * 【初期配置】
 * ・戦闘開始時、6人をシャッフルした「召喚袋」を作ります。
 * ・その袋から lightInitialCount 人を引き、最初から出現させます。
 * ・残りは同じ袋に残り、以後の召喚タイミングで1人ずつ出現します。
 * ・同一の従者が初回召喚で重複することはありません。
 *
 * 【召喚終了後の蘇生袋】
 * ・6人全員が一度登場し終わるまでは、死亡者がいても召喚を優先します。
 * ・召喚袋が空になった後、蘇生可能なタイミングで
 *   「その時点で死亡している従者だけ」を集めて蘇生袋を作ります。
 * ・蘇生袋を作った後に新しく死亡した従者は、現在の袋には入りません。
 *   次の蘇生袋まで待ちます。
 * ・蘇生袋の中身はシャッフルされ、1人ずつ蘇生します。
 * ・蘇生袋を使い切った後は、次の蘇生サイクルとの間に
 *   「1回分の空白」を入れます。
 *   その空白タイミングですでに死亡者がいる場合は、待機してCTを消費します。
 *
 * 【クールタイム】
 * 旧 OrbSummonAI と同じ線形補間＋端数累積方式です。
 *
 * 例：
 * <lightOrbCooldown:1,1,7,4,1>
 *   難易度1 → 4ターンごと
 *   難易度7 → 1ターンごと
 *
 * 初期2体を出現させた後からCT計測を開始します。
 * そのため難易度1なら、追加の3体目は原則4ターン目に召喚されます。
 *
 * 【召喚スキルについて】
 * このプラグイン自身が「袋から選んだ従者を出現」させます。
 * lightOrbAI で指定された召喚スキルにコモンイベント効果が入っている場合、
 * 二重召喚を防ぐため、そのコモンイベント効果だけ自動で無効化します。
 *
 * 召喚スキルには、演出・メッセージ・オーブ自身へのステート付与などを
 * 残して構いません。
 *
 * 【蘇生スキルについて】
 * 蘇生対象はプラグイン側で蘇生袋から明示的に指定します。
 * スキル本体には通常どおり「戦闘不能解除＋HP回復」を設定してください。
 *
 * ============================================================================
 * ■光の騎士
 * ============================================================================
 *
 * <lightKnightAI:庇うスキルID,攻撃スキル1ID,攻撃スキル2ID>
 * <lightKnightGuardState:庇い状態ID>
 *
 * 例：
 * <lightKnightAI:348,346,347>
 * <lightKnightGuardState:143>
 *
 * ・庇い状態でない → 庇うを必ず使用
 * ・庇い状態中     → 攻撃スキル1 / 2 を50%ずつ
 * ・庇うスキルが封印などで使用不能なら、庇わず攻撃へ移行
 * ・仲間が一人もいなくても、庇い状態でなければ最初に庇います
 *
 * ※庇い状態が毎ターン終了する設定だと、毎ターン庇うAIになります。
 *   「初回に庇う→解除されるまで攻撃」という設計にする場合、
 *   庇い状態は自動解除なし（または十分長い持続）にしてください。
 *
 * ============================================================================
 * ■光の魔導士
 * ============================================================================
 *
 * <lightMageAI:アクアID,フルメンID,グラキエスID,濡れ状態ID>
 *
 * 例：
 * <lightMageAI:351,350,349,74>
 *
 * 生存中のプレイヤー2人の濡れ人数で行動を決めます。
 *
 * 濡れ0人：
 *   アクア 100%
 *
 * 濡れ1人：
 *   アクア      25%
 *   フルメン    50%
 *   グラキエス 25%
 *
 * 濡れ2人以上：
 *   フルメン    50%
 *   グラキエス 50%
 *
 * ・グラキエスは必ず濡れている相手を狙います。
 * ・フルメンは生存者からランダムに狙います。
 *
 * ============================================================================
 * ■光の巫女
 * ============================================================================
 *
 * <lightPriestessAI:単体回復ID,全体回復ID,加護ID>
 * <lightPriestessBuffState:加護ステートID>
 *
 * 例：
 * <lightPriestessAI:352,353,354>
 * <lightPriestessBuffState:144>
 *
 * ・HPが減った生存味方が2体以上 → 全体回復
 * ・HPが減った生存味方が1体     → その1体に単体回復
 * ・誰もHPが減っていない         → 加護
 *
 * 加護使用時は、lightPriestessBuffState で指定したステートが
 * 付与されていない生存味方を優先して狙います。
 * 全員すでに加護状態なら、生存味方からランダムに選び、
 * 加護を重ねがけして持続ターンを更新します。
 *
 * ============================================================================
 * ■光の盟主
 * ============================================================================
 *
 * <lightLordAI:連携スキルID,単独防御スキルID>
 *
 * 任意：
 * <lightLordSoloState:単独防御ステートID>
 *
 * ・他の「光の従者」が1人以上生存 → 連携スキル
 * ・他の「光の従者」が0人          → 単独防御スキル
 *
 * lightLordSoloState を指定した場合、
 * 仲間が再び出現した瞬間にそのステートを自動解除します。
 * （一人の時だけ強固、という仕様用）
 *
 * ============================================================================
 * ■光の錬金術師
 * ============================================================================
 *
 * <lightAlchemistAI:スキル1ID,スキル2ID,スキル3ID,スキル4ID>
 *
 * 例：
 * <lightAlchemistAI:356,357,358,359>
 *
 * ・4スキルを毎ターン等確率でランダム選択
 * ・単体対象スキルの場合、生存プレイヤーからランダムに狙います
 *
 * ============================================================================
 * ■光の剣闘士
 * ============================================================================
 *
 * <lightGladiatorAI:通常攻撃ID,闘志の構えID,覚悟の構えID>
 * <lightGladiatorBuffStates:攻撃バフ状態ID,防御バフ状態ID>
 * <lightGladiatorTargetActor:クレイのアクターID>
 *
 * 例：
 * <lightGladiatorAI:通常攻撃ID,闘志ID,覚悟ID>
 * <lightGladiatorBuffStates:攻撃バフStateID,防御バフStateID>
 * <lightGladiatorTargetActor:1>
 *
 * 候補：
 * ・通常攻撃は常に候補
 * ・闘志バフが未付与なら「闘志の構え」も候補
 * ・覚悟バフが未付与なら「覚悟の構え」も候補
 *
 * 候補の中から完全な等確率で選択します。
 *
 * つまり初期：
 *   通常攻撃 / 闘志 / 覚悟 = 各1/3
 *
 * 片方のバフ使用後：
 *   通常攻撃 / 残ったバフ = 各1/2
 *
 * 両方使用後：
 *   通常攻撃 100%
 *
 * 通常攻撃はクレイだけを狙います。
 * クレイが戦闘不能なら、他のアクターへ勝手に狙いを変えず不発になります。
 *
 * ※「セラの攻撃を無効化し、クレイの技だけ通す」効果そのものは
 *   このVer1.0.0では実装していません。これはAIとは別の被ダメージルールです。
 *
 * ============================================================================
 * ■召喚された従者の同ターン行動について
 * ============================================================================
 * Ver1.0.0では、途中召喚された従者は通常のRPGツクールMZ仕様どおり、
 * そのターンの行動順には後から追加されません。
 * 「召喚直後にターン末尾で1回行動」は、必要なら後から追加できます。
 *
 * ============================================================================
 * ■利用規約
 * ============================================================================
 * このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    //-------------------------------------------------------------------------
    // Utilities
    //-------------------------------------------------------------------------

    const toNumberList = value =>
        String(value || "")
            .split(",")
            .map(s => Number(s.trim()))
            .filter(n => Number.isFinite(n) && n > 0);

    const shuffle = array => {
        const result = array.slice();
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.randomInt(i + 1);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    };

    const randomFrom = array => {
        if (!array || array.length === 0) return null;
        return array[Math.randomInt(array.length)];
    };

    const randomAliveActor = () => randomFrom($gameParty.aliveMembers());

    const setRandomActorTarget = action => {
        const actor = randomAliveActor();
        if (actor) action.setTarget(actor.index());
    };

    const makeSingleAction = (enemy, skillId) => {
        enemy.clearActions();
        const action = new Game_Action(enemy);
        action.setSkill(skillId);
        enemy._actions = [action];
        return action;
    };

    const orbTagParts = enemy => {
        if (!enemy || !enemy.enemy) return null;
        const raw = enemy.enemy().meta.lightOrbAI;
        const list = toNumberList(raw);
        if (list.length < 3) return null;
        return {
            reviveSkillId: list[0],
            summonSkillId: list[1],
            waitSkillId: list[2]
        };
    };

    //-------------------------------------------------------------------------
    // Light party troop state
    //-------------------------------------------------------------------------

    Game_Troop.prototype.lightPartyOrb = function() {
        return this.members().find(m => !!m.enemy().meta.lightOrbAI) || null;
    };

    Game_Troop.prototype.lightPartyServantIds = function() {
        return this._lightPartyServantIds || [];
    };

    Game_Troop.prototype.lightPartyServantById = function(enemyId) {
        return this.members().find(m => m.enemyId() === enemyId) || null;
    };

    Game_Troop.prototype.lightPartyIsServant = function(enemy) {
        if (!enemy) return false;
        return this.lightPartyServantIds().includes(enemy.enemyId());
    };

    Game_Troop.prototype.lightPartyOtherAliveServants = function(subject) {
        return this.members().filter(m =>
            m !== subject &&
            this.lightPartyIsServant(m) &&
            this._lightPartyIntroduced[m.enemyId()] &&
            m.isAlive() &&
            !m.isHidden()
        );
    };

    Game_Troop.prototype.lightPartyDeadIntroducedIds = function() {
        return this.lightPartyServantIds().filter(id => {
            if (!this._lightPartyIntroduced[id]) return false;
            const member = this.lightPartyServantById(id);
            return !!member && member.isDead();
        });
    };

    Game_Troop.prototype.lightPartyAppearServant = function(enemyId) {
        const member = this.lightPartyServantById(enemyId);
        if (!member) return false;
        member.appear();
        member.refresh();
        this._lightPartyIntroduced[enemyId] = true;
        return true;
    };

    Game_Troop.prototype.lightPartyTakeNextSummon = function() {
        while (this._lightPartySummonBag.length > 0) {
            const id = this._lightPartySummonBag.shift();
            const member = this.lightPartyServantById(id);
            if (!member) continue;
            if (this._lightPartyIntroduced[id]) continue;
            return member;
        }
        return null;
    };

    Game_Troop.prototype.lightPartyTakeFromReviveBag = function() {
        while (this._lightPartyReviveBag.length > 0) {
            const id = this._lightPartyReviveBag.shift();
            const member = this.lightPartyServantById(id);
            if (
                member &&
                this._lightPartyIntroduced[id] &&
                member.isDead()
            ) {
                if (this._lightPartyReviveBag.length === 0) {
                    this._lightPartyReviveGapPending = true;
                }
                return member;
            }
        }
        return null;
    };

    /**
     * Return values:
     * { type: "revive", member: Game_Enemy }
     * { type: "gap", hasDead: boolean }
     * { type: "none" }
     */
    Game_Troop.prototype.lightPartyReviveDecision = function() {
        // 既存の蘇生袋があるなら、まずそれを最後まで使う。
        if (this._lightPartyReviveBag.length > 0) {
            const member = this.lightPartyTakeFromReviveBag();
            if (member) {
                return { type: "revive", member };
            }
            // 外部要因などで袋の中身が全員生存していた場合も
            // 1サイクル終了扱いにする。
            this._lightPartyReviveGapPending = true;
        }

        const deadIds = this.lightPartyDeadIntroducedIds();

        // 袋と袋の間に1回だけ空白を入れる。
        if (this._lightPartyReviveGapPending) {
            this._lightPartyReviveGapPending = false;
            return { type: "gap", hasDead: deadIds.length > 0 };
        }

        if (deadIds.length === 0) {
            return { type: "none" };
        }

        // 「この瞬間の死亡者」だけで新しい袋を作る。
        // 以後に死亡した従者は途中参加しない。
        this._lightPartyReviveBag = shuffle(deadIds);
        const member = this.lightPartyTakeFromReviveBag();
        if (member) {
            return { type: "revive", member };
        }

        return { type: "none" };
    };

    Game_Troop.prototype.setupLightParty = function() {
        const orb = this.lightPartyOrb();
        if (!orb) return;

        const servantIds = toNumberList(orb.enemy().meta.lightServantIds);
        if (servantIds.length === 0) {
            console.warn(
                "[DungeonEscape_LightPartyAI] lightServantIds が未設定です。"
            );
            return;
        }

        this._lightPartyServantIds = servantIds.slice();
        this._lightPartyIntroduced = {};
        this._lightPartySummonBag = [];
        this._lightPartyReviveBag = [];
        this._lightPartyReviveGapPending = false;

        // 初期配置をこのプラグインで完全管理するため、
        // 指定された従者はいったん全員隠す。
        for (const id of servantIds) {
            const member = this.lightPartyServantById(id);
            if (!member) {
                console.warn(
                    `[DungeonEscape_LightPartyAI] トループ内に敵ID ${id} が見つかりません。`
                );
                continue;
            }
            member.hide();
            this._lightPartyIntroduced[id] = false;
        }

        const validIds = servantIds.filter(
            id => !!this.lightPartyServantById(id)
        );
        const bag = shuffle(validIds);

        const initialRaw = Number(orb.enemy().meta.lightInitialCount);
        const initialCount = Number.isFinite(initialRaw)
            ? Math.max(0, Math.min(bag.length, Math.floor(initialRaw)))
            : Math.min(2, bag.length);

        for (let i = 0; i < initialCount; i++) {
            const id = bag.shift();
            this.lightPartyAppearServant(id);
        }

        this._lightPartySummonBag = bag;

        // 初期配置後からクールタイム計測開始。
        orb._lightOrbElapsed = 0;
        orb._lightOrbThreshold = undefined;
        orb._lightOrbAccumulator = undefined;
    };

    const _Game_Troop_setup = Game_Troop.prototype.setup;
    Game_Troop.prototype.setup = function(troopId) {
        _Game_Troop_setup.call(this, troopId);
        this.setupLightParty();
    };

    //-------------------------------------------------------------------------
    // Orb cooldown
    //-------------------------------------------------------------------------

    function decideOrbThreshold(enemy, cooldownTag) {
        const values = String(cooldownTag || "")
            .split(",")
            .map(s => Number(s.trim()));

        if (values.length < 5 || values.some(n => !Number.isFinite(n))) {
            console.warn(
                "[DungeonEscape_LightPartyAI] lightOrbCooldown の形式が不正です。"
            );
            return 0;
        }

        const [varId, minVar, maxVar, cdAtMin, cdAtMax] = values;
        const varValue = $gameVariables.value(varId);
        const range = maxVar - minVar;
        const rate = range !== 0 ? (varValue - minVar) / range : 1;
        const clampedRate = Math.max(0, Math.min(1, rate));

        // 「Nターンごと」を、待機回数 N-1 に変換する。
        const cooldown = cdAtMin + clampedRate * (cdAtMax - cdAtMin);
        const target = Math.max(0, cooldown - 1);
        const floorVal = Math.floor(target);
        const frac = target - floorVal;

        if (enemy._lightOrbAccumulator === undefined) {
            enemy._lightOrbAccumulator = frac > 0 ? 1 - frac : 0;
        }

        enemy._lightOrbAccumulator += frac;

        if (enemy._lightOrbAccumulator >= 1 - 1e-9) {
            enemy._lightOrbAccumulator -= 1;
            return floorVal + 1;
        }

        return floorVal;
    }

    Game_Enemy.prototype.lightOrbIsReady = function(cooldownTag) {
        if (this._lightOrbThreshold === undefined) {
            this._lightOrbThreshold = decideOrbThreshold(this, cooldownTag);
        }
        if (this._lightOrbElapsed === undefined) {
            this._lightOrbElapsed = 0;
        }
        return this._lightOrbElapsed >= this._lightOrbThreshold;
    };

    Game_Enemy.prototype.lightOrbConsumeCooldown = function(cooldownTag) {
        this._lightOrbElapsed = 0;
        this._lightOrbThreshold = decideOrbThreshold(this, cooldownTag);
    };

    Game_Enemy.prototype.lightOrbAdvanceTurn = function() {
        if (this._lightOrbElapsed === undefined) {
            this._lightOrbElapsed = 0;
        } else {
            this._lightOrbElapsed++;
        }
    };

    //-------------------------------------------------------------------------
    // Orb AI
    //-------------------------------------------------------------------------

    function makeOrbActions(enemy) {
        const ai = orbTagParts(enemy);
        const cooldownTag = enemy.enemy().meta.lightOrbCooldown;

        if (!ai || !cooldownTag) return false;

        const troop = $gameTroop;
        const action = makeSingleAction(enemy, ai.waitSkillId);

        if (!enemy.lightOrbIsReady(cooldownTag)) {
            enemy.lightOrbAdvanceTurn();
            return true;
        }

        // 6人全員の初登場が終わるまでは、死亡者がいても召喚を優先。
        const summonMember = troop.lightPartyTakeNextSummon();
        if (summonMember) {
            action.setSkill(ai.summonSkillId);
            action._lightPartySummonEnemyId = summonMember.enemyId();
            enemy.lightOrbConsumeCooldown(cooldownTag);
            return true;
        }

        // 召喚一巡後は蘇生袋へ。
        const reviveDecision = troop.lightPartyReviveDecision();

        if (reviveDecision.type === "revive") {
            action.setSkill(ai.reviveSkillId);
            action.setTarget(reviveDecision.member.index());
            enemy.lightOrbConsumeCooldown(cooldownTag);
            return true;
        }

        if (reviveDecision.type === "gap") {
            action.setSkill(ai.waitSkillId);

            // 死亡者がいるのに「袋の間の空白」を踏んだ場合は、
            // その1回を本当の1サイクル空白にするためCTを消費。
            // 死亡者がいない場合は、ただの待機として準備済みCTを維持。
            if (reviveDecision.hasDead) {
                enemy.lightOrbConsumeCooldown(cooldownTag);
            } else {
                enemy.lightOrbAdvanceTurn();
            }
            return true;
        }

        // 全員生存中はCTを消費せず待機。
        // 既にCTが溜まっていれば、誰かが倒れた次のターンに即座に蘇生判定できる。
        action.setSkill(ai.waitSkillId);
        enemy.lightOrbAdvanceTurn();
        return true;
    }

    // 召喚スキルが終わったところで、袋から選ばれた従者を出現させる。
    // 初期配置では表示せず、戦闘中の追加召喚時だけバトルログを出す。
    const _BattleManager_endAction = BattleManager.endAction;
    BattleManager.endAction = function() {
        const action = this._action;

        if (action && action._lightPartySummonEnemyId) {
            const enemyId = action._lightPartySummonEnemyId;
            const target = $gameTroop.lightPartyServantById(enemyId);

            if (target) {
                $gameTroop.lightPartyAppearServant(enemyId);
                $gameTroop.makeUniqueNames();

                if (this._logWindow) {
                    this._logWindow.push(
                        "addText",
                        target.name() + "が現れた！"
                    );
                    this._logWindow.push(
                        "addText",
                        target.name() + "は光のオーブを守護している！"
                    );
                    this._logWindow.push("wait");
                    this._logWindow.push("clear");
                }
            }
        }

        _BattleManager_endAction.call(this);
    };

    // 旧召喚スキルに残っているコモンイベントを二重発動させない。
    const _Game_Action_itemEffectCommonEvent =
        Game_Action.prototype.itemEffectCommonEvent;

    if (_Game_Action_itemEffectCommonEvent) {
        Game_Action.prototype.itemEffectCommonEvent = function(target, effect) {
            const subject = this.subject();
            const ai =
                subject && subject.isEnemy && subject.isEnemy()
                    ? orbTagParts(subject)
                    : null;

            if (
                ai &&
                this.item() &&
                this.item().id === ai.summonSkillId
            ) {
                return;
            }

            _Game_Action_itemEffectCommonEvent.call(this, target, effect);
        };
    }

    //-------------------------------------------------------------------------
    // Knight AI
    //-------------------------------------------------------------------------

    function makeKnightActions(enemy, tag) {
        const values = toNumberList(tag);
        if (values.length < 3) return false;

        const [guardSkillId, attack1Id, attack2Id] = values;
        const guardStateId = Number(
            enemy.enemy().meta.lightKnightGuardState || 0
        );

        let skillId;

        const needsGuard =
            guardStateId > 0 && !enemy.isStateAffected(guardStateId);

        const guardSkill = $dataSkills[guardSkillId];
        const canGuard =
            guardSkill &&
            enemy.canUse(guardSkill);

        if (needsGuard && canGuard) {
            skillId = guardSkillId;
        } else {
            skillId = Math.randomInt(2) === 0 ? attack1Id : attack2Id;
        }

        const action = makeSingleAction(enemy, skillId);

        if (skillId !== guardSkillId) {
            setRandomActorTarget(action);
        }

        return true;
    }

    //-------------------------------------------------------------------------
    // Mage AI
    //-------------------------------------------------------------------------

    function weightedMageChoice(aquaId, fulmenId, glaciesId, wetCount) {
        const roll = Math.randomInt(100);

        if (wetCount <= 0) {
            return aquaId;
        }

        if (wetCount === 1) {
            if (roll < 25) return aquaId;
            if (roll < 75) return fulmenId;
            return glaciesId;
        }

        return roll < 50 ? fulmenId : glaciesId;
    }

    function makeMageActions(enemy, tag) {
        const values = toNumberList(tag);
        if (values.length < 4) return false;

        const [aquaId, fulmenId, glaciesId, wetStateId] = values;

        const aliveActors = $gameParty.aliveMembers();
        const wetActors = aliveActors.filter(
            actor => actor.isStateAffected(wetStateId)
        );

        const skillId = weightedMageChoice(
            aquaId,
            fulmenId,
            glaciesId,
            wetActors.length
        );

        const action = makeSingleAction(enemy, skillId);

        if (skillId === glaciesId) {
            const target = randomFrom(wetActors);
            if (target) action.setTarget(target.index());
        } else if (skillId === fulmenId) {
            const target = randomFrom(aliveActors);
            if (target) action.setTarget(target.index());
        }

        return true;
    }

    //-------------------------------------------------------------------------
    // Priestess AI
    //-------------------------------------------------------------------------

    function makePriestessActions(enemy, tag) {
        const values = toNumberList(tag);
        if (values.length < 3) return false;

        const [singleHealId, groupHealId, buffId] = values;

        const aliveAllies = $gameTroop
            .members()
            .filter(m => m.isAlive() && !m.isHidden());

        const damaged = aliveAllies
            .filter(m => m.hp < m.mhp)
            .sort((a, b) => a.hp - b.hp);

        let action;

        if (damaged.length >= 2) {
            action = makeSingleAction(enemy, groupHealId);
        } else if (damaged.length === 1) {
            action = makeSingleAction(enemy, singleHealId);
            action.setTarget(damaged[0].index());
        } else {
            action = makeSingleAction(enemy, buffId);

            const buffStateId = Number(
                enemy.enemy().meta.lightPriestessBuffState || 0
            );

            if (buffStateId > 0 && aliveAllies.length > 0) {
                const unbuffed = aliveAllies.filter(
                    member => !member.isStateAffected(buffStateId)
                );

                // 未付与者を優先。全員付与済みならランダムに重ねがけして
                // 持続ターンを更新する。
                const target = randomFrom(
                    unbuffed.length > 0 ? unbuffed : aliveAllies
                );

                if (target) {
                    action.setTarget(target.index());
                }
            }
        }

        return true;
    }

    //-------------------------------------------------------------------------
    // Lord AI
    //-------------------------------------------------------------------------

    function makeLordActions(enemy, tag) {
        const values = toNumberList(tag);
        if (values.length < 2) return false;

        const [comboSkillId, soloGuardSkillId] = values;
        const soloStateId = Number(
            enemy.enemy().meta.lightLordSoloState || 0
        );

        const otherServants =
            $gameTroop.lightPartyOtherAliveServants(enemy);

        let action;

        if (otherServants.length > 0) {
            if (soloStateId > 0 && enemy.isStateAffected(soloStateId)) {
                enemy.removeState(soloStateId);
            }
            action = makeSingleAction(enemy, comboSkillId);
            setRandomActorTarget(action);
        } else {
            action = makeSingleAction(enemy, soloGuardSkillId);
        }

        return true;
    }

    //-------------------------------------------------------------------------
    // Alchemist AI
    //-------------------------------------------------------------------------

    function makeAlchemistActions(enemy, tag) {
        const values = toNumberList(tag);
        if (values.length < 1) return false;

        const skillId = randomFrom(values);
        const action = makeSingleAction(enemy, skillId);
        setRandomActorTarget(action);
        return true;
    }

    //-------------------------------------------------------------------------
    // Gladiator AI
    //-------------------------------------------------------------------------

    function makeGladiatorActions(enemy, tag) {
        const values = toNumberList(tag);
        if (values.length < 3) return false;

        const [attackSkillId, attackBuffSkillId, defenseBuffSkillId] = values;

        const stateValues = toNumberList(
            enemy.enemy().meta.lightGladiatorBuffStates
        );
        const attackBuffStateId = stateValues[0] || 0;
        const defenseBuffStateId = stateValues[1] || 0;

        const targetActorId = Number(
            enemy.enemy().meta.lightGladiatorTargetActor || 0
        );

        const candidates = [attackSkillId];

        if (
            attackBuffStateId <= 0 ||
            !enemy.isStateAffected(attackBuffStateId)
        ) {
            candidates.push(attackBuffSkillId);
        }

        if (
            defenseBuffStateId <= 0 ||
            !enemy.isStateAffected(defenseBuffStateId)
        ) {
            candidates.push(defenseBuffSkillId);
        }

        const skillId = randomFrom(candidates);
        const action = makeSingleAction(enemy, skillId);

        if (skillId === attackSkillId && targetActorId > 0) {
            // smoothTargetによるセラへの自動変更を防ぐため、
            // makeTargets側で固定対象として扱う。
            action._lightPartyFixedActorId = targetActorId;
        }

        return true;
    }

    // クレイ固定攻撃は、クレイが倒れていてもセラへ自動リターゲットしない。
    const _Game_Action_makeTargets = Game_Action.prototype.makeTargets;
    Game_Action.prototype.makeTargets = function() {
        if (this._lightPartyFixedActorId) {
            const actor = $gameActors.actor(this._lightPartyFixedActorId);
            const inBattle = actor && $gameParty.battleMembers().includes(actor);

            if (inBattle && actor.isAlive()) {
                return [actor];
            }
            return [];
        }

        return _Game_Action_makeTargets.call(this);
    };

    //-------------------------------------------------------------------------
    // Unified Game_Enemy.makeActions
    //-------------------------------------------------------------------------

    const _Game_Enemy_makeActions = Game_Enemy.prototype.makeActions;

    Game_Enemy.prototype.makeActions = function() {
        const meta = this.enemy().meta;

        if (meta.lightOrbAI && meta.lightOrbCooldown) {
            if (makeOrbActions(this)) return;
        }

        if (meta.lightKnightAI) {
            if (makeKnightActions(this, meta.lightKnightAI)) return;
        }

        if (meta.lightMageAI) {
            if (makeMageActions(this, meta.lightMageAI)) return;
        }

        if (meta.lightPriestessAI) {
            if (makePriestessActions(this, meta.lightPriestessAI)) return;
        }

        if (meta.lightLordAI) {
            if (makeLordActions(this, meta.lightLordAI)) return;
        }

        if (meta.lightAlchemistAI) {
            if (makeAlchemistActions(this, meta.lightAlchemistAI)) return;
        }

        if (meta.lightGladiatorAI) {
            if (makeGladiatorActions(this, meta.lightGladiatorAI)) return;
        }

        _Game_Enemy_makeActions.call(this);
    };
})();
