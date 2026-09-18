//=============================================================================
// DungeonEscape_EncounterRatio.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 不意打ち・先制攻撃・(任意で)逃走成功率の発生率を、
 * 敵味方の素早さに関係なくパラメータの固定値で管理します Ver5.0.0
 * @author DungeonEscape開発用
 *
 * @param preemptiveRate
 * @text 先制攻撃の発生率(味方)
 * @desc 戦闘開始時、味方が先制攻撃できる確率(0〜1)。標準は敵味方の素早さ比較で
 * 変動するが、ここで固定値に上書きする。
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 0.05
 *
 * @param surpriseRate
 * @text 不意打ちの発生率(敵)
 * @desc 戦闘開始時、敵に不意打ちされる確率(0〜1)。0にすると敵の不意打ちを
 * 完全に無効化する。
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 0
 *
 * @param overrideEscapeRatio
 * @text 逃走成功率もこのプラグインで管理する
 * @desc ONにすると、下記escapeRate/escapeFailBonusで逃走成功率も管理する
 * (NRP_EscapeRatio.js等と役割が重複するため、ONにする場合はそちらを
 * 無効化すること)。OFFなら逃走確率には一切手を加えない。
 * @type boolean
 * @default false
 *
 * @param escapeRate
 * @text 逃走成功率(固定値)
 * @desc overrideEscapeRatioがONの場合のみ有効。敵の数・素早さに関係なく、
 * この値を逃走成功率として固定する。
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 0.1
 *
 * @param escapeFailBonus
 * @text 逃走失敗ごとの上昇値
 * @desc overrideEscapeRatioがONの場合のみ有効。逃走に失敗するたびに
 * 成功率へ加算する値。
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 0
 *
 * @param guaranteedEscapeStateId
 * @text 逃走確定ステートID
 * @type state
 * @default 0
 * @desc このステートをパーティの誰か1人でも持っていると、
 * overrideEscapeRatioの設定に関わらず逃走コマンドが必ず成功します(0で無効)。
 *
 * @help DungeonEscape_EncounterRatio.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * 標準のRPGツクールMZは、不意打ち(敵の先制)・先制攻撃(味方の先制)の
 * 発生率を、味方と敵の平均素早さの比較から自動計算します(BattleManager.
 * ratePreemptive/rateSurprise)。このプラグインはその計算を無視し、
 * パラメータで指定した固定値に置き換えます。
 *
 * 本作は難易度によって同じトループ内の敵の数が1〜7体まで変動する仕組み
 * (DungeonEscape_DifficultyEncounter.js)を採用している。不意打ちの
 * 発生率自体は敵の数に比例して大きく増えるわけではないが、万一発生した
 * 場合の被害(何も対応できないまま受ける攻撃の数)は敵の数にそのまま
 * 比例してしまう。高難易度(7体)で不意打ちを引くとほぼ一方的に崩壊
 * しかねないため、本作ではsurpriseRate=0で敵の不意打ちを無効化する
 * 運用とした(味方の先制攻撃は維持)。
 *
 * 「overrideEscapeRatio」をONにすると、このプラグイン1つで不意打ち・
 * 先制攻撃・逃走成功率をまとめて管理できる(NRP_EscapeRatio.jsは
 * 不要になるため、ONにする場合はプラグイン管理から外すか無効化する
 * こと。両方有効なままだと、後から読み込んだ方の設定で上書きされる
 * ため意図せず片方が無効化される)。OFFのままならこのプラグインは
 * 逃走確率に一切影響しないので、NRP_EscapeRatio.jsとそのまま併用できる。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 導入するだけで動作する。overrideEscapeRatioをONにする場合は、
 * NRP_EscapeRatio.jsより後ろ(プラグイン管理の下側)に配置することを
 * 推奨する(後から読み込んだ方の上書きが優先されるため)。
 *
 * 「guaranteedEscapeStateId」は、煙玉のようなアイテムで「その戦闘の
 * 逃走を確定させる」効果を作りたい場合に使う。
 * 1. 逃走確定用のステート（例：「煙幕」）を新規作成する
 *    （戦闘不能などとは無関係な、マーキング専用のステートでOK。
 *    「解除条件：戦闘終了時に解除」にチェックを入れておくと、
 *    次の戦闘に持ち越さずに済む）
 * 2. このプラグインパラメータ「逃走確定ステートID」に、そのステートIDを設定する
 * 3. 煙玉などのアイテムの使用効果に「ステート付加：（そのステート）100%」を設定する
 *
 * overrideEscapeRatioのON/OFFに関わらず、このステートを持っている間は
 * 逃走成功率の計算そのものを無視して必ず成功する。
 *
 * ------------------------------------------------------------------
 * ◆Ver5.0.0の変更点(使用と同時に自動で逃走する・ステート付加も同期化)
 * ------------------------------------------------------------------
 * 「ステートを付けるだけ(次に自分で逃げるコマンドを選んだ時に確定
 * 成功する)」から、「使用したその場で自動的に逃走する」に変更したい
 * 場合、そのアイテムのメモ欄に以下のタグを記述してください。
 *
 *   <autoEscapeItem>
 *
 * これで、そのアイテムの効果が適用された瞬間(コモンイベントの実行
 * タイミングに左右されず、確実にそのアイテムの行動が終わる前に)、
 * 自動的に逃走が予約されます。行動が終わった直後(次の行動に移る前の
 * 安全なタイミング)に、予約された逃走処理が実行されます。
 * guaranteedEscapeStateIdで指定したステートも同時に付与しておけば、
 * その逃走は必ず成功します。
 *
 * ※以前のバージョンでは、コモンイベント内でスクリプト
 * 「$gameParty.reserveAutoEscape();」を呼ぶ方式でしたが、コモン
 * イベントの実行タイミングが行動終了(endAction)より後にずれ込み、
 * 次の行動(敵の攻撃)が先に始まってしまう不具合があったため、
 * アイテム自身の効果として同期的に処理する、このタグ方式に変更した。
 */

(() => {
    "use strict";
    const pluginName = "DungeonEscape_EncounterRatio";
    const params = PluginManager.parameters(pluginName);
    const preemptiveRate = Number(params.preemptiveRate || 0);
    const surpriseRate = Number(params.surpriseRate || 0);
    const overrideEscapeRatio = params.overrideEscapeRatio === "true";
    const escapeRate = Number(params.escapeRate || 0.1);
    const escapeFailBonus = Number(params.escapeFailBonus || 0);

    // ---- 先制攻撃(味方)・不意打ち(敵)の発生率を固定値に置き換え ----
    BattleManager.ratePreemptive = function() {
        return preemptiveRate;
    };

    BattleManager.rateSurprise = function() {
        return surpriseRate;
    };

    // ---- (任意)逃走成功率もこのプラグインで管理する ----
    if (overrideEscapeRatio) {
        BattleManager.makeEscapeRatio = function() {
            this._escapeRatio = escapeRate;
        };

        // 標準(または他プラグイン)のprocessEscapeが内部で行う加算量が
        // いくつであっても、失敗後の値を指定の上昇値で確実に上書きする
        const _BattleManager_processEscape = BattleManager.processEscape;
        BattleManager.processEscape = function() {
            const beforeRatio = this._escapeRatio;
            const success = _BattleManager_processEscape.call(this);
            if (!success) {
                this._escapeRatio = beforeRatio + escapeFailBonus;
            }
            return success;
        };
    }

    // ---- 逃走確定ステート(煙玉など) ----
    // overrideEscapeRatioのON/OFFに関わらず、この時点で完成している
    // processEscape(標準・NRP_EscapeRatio.js・上のoverride、いずれか)を
    // さらに外側からラップすることで、常に最優先で判定される
    const guaranteedEscapeStateId = Number(params.guaranteedEscapeStateId || 0);
    if (guaranteedEscapeStateId > 0) {
        const _BattleManager_processEscape2 = BattleManager.processEscape;
        BattleManager.processEscape = function () {
            const guaranteed = $gameParty
                .members()
                .some((a) => a.isStateAffected(guaranteedEscapeStateId));
            if (guaranteed) {
                $gameParty.performEscape();
                SoundManager.playEscape();
                this.onEscapeSuccess();
                return true;
            }
            return _BattleManager_processEscape2.call(this);
        };

        // ---- 使用と同時に自動で逃走する(煙玉など) ----
        // アイテムのメモ欄に <autoEscapeItem> を付けてください。
        // 「煙幕」ステートの付加(パーティ全体)と、逃走の予約を、
        // どちらもこのタイミングで同期的に行います。コモンイベント側の
        // 「ステートの変更」は不要になったので削除してください
        // （「辺りは煙幕に包まれた」のメッセージ表示スクリプトだけ
        // コモンイベントに残しておけば問題ありません）。
        //
        // ※以前のバージョンでは、コモンイベント内の「ステートの変更」で
        // 煙幕ステートを付けていましたが、コモンイベントの実行タイミングが
        // 行動終了(endAction)より後にずれ込むことがあり、endActionで
        // 逃走判定が走った時点ではまだ煙幕が付いておらず、確定成功の
        // 判定に失敗する不具合があったため、ステート付加自体もこの
        // タグ経由で同期的に行うよう変更した。
        const _Game_Action_apply = Game_Action.prototype.apply;
        Game_Action.prototype.apply = function (target) {
            _Game_Action_apply.call(this, target);
            const item = this.item();
            if (item && item.meta.autoEscapeItem) {
                for (const member of $gameParty.members()) {
                    member.addState(guaranteedEscapeStateId);
                }
                $gameParty.reserveAutoEscape();
            }
        };

        const _BattleManager_endAction = BattleManager.endAction;
        BattleManager.endAction = function () {
            _BattleManager_endAction.call(this);
            if ($gameParty._reservedAutoEscape) {
                $gameParty._reservedAutoEscape = false;
                if (!this._escaped) {
                    this.processEscape();
                }
            }
        };

        Game_Party.prototype.reserveAutoEscape = function () {
            this._reservedAutoEscape = true;
        };
    }
})();
