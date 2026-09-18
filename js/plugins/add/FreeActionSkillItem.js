//=============================================================================
// FreeActionSkillItem.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Ver2.7 スキル・アイテムのメモ欄に指定タグがあると、そのスキル/アイテムを選択した瞬間に即実行し、ターンを消費せず選択に戻ります。DTB/TPB両対応。
 * @author Jack/Claude
 *
 * @param noteTag
 * @text メモ欄タグ名
 * @desc <タグ名> という形式でメモ欄に記述します。デフォルトは <FreeAction>
 * @type string
 * @default FreeAction
 *
 * @param aiChainLimit
 * @text AI連鎖上限
 * @desc 敵キャラ/オートバトルアクターがフリーアクションを連続で引き当てた場合の最大連鎖回数(無限ループ防止用)
 * @type number
 * @min 1
 * @default 20
 *
 * @param resumeDelayFrames
 * @text 追加の待機フレーム数
 * @desc 演出が完全に終わった(isBusy()がfalseになった)後、念のため
 * さらに待つフレーム数。基本は0で問題ありません。
 * @type number
 * @min 0
 * @default 0
 *
 * @help FreeActionSkillItem.js
 *
 * ■概要
 * スキル・アイテムのメモ欄に
 *
 *   <FreeAction>
 *
 * と記述すると、そのスキル/アイテムを使用しても行動回数(ターン)を
 * 消費しなくなります。
 *
 * ■プレイヤー操作アクターの挙動(今回の変更点)
 * コマンド入力でフリーアクションのスキル/アイテムを選択して対象を
 * 決定すると、【他の行動の入力を待たずにその場で即座に実行】されます。
 * ダメージ・演出・メッセージが表示された後、同じアクターの行動選択
 * (通常の攻撃/スキル/アイテム/防御コマンド画面)に自動的に戻ります。
 * これを何度でも繰り返し選択できます(本来の行動回数はまったく
 * 減りません)。
 *
 * 内部的には、通常「全員の入力が終わってから速度順に実行される」
 * 行動を、その場で単独の行動として先取り実行し、実行が終わったら
 * バトル内部状態を「入力中」に戻して同じアクターの入力画面を
 * 再度開く、という処理を行っています。
 *
 * ■TPB(タイムプログレス)での挙動
 * TPBでも同じ仕組みがそのまま使えます。フリーアクションの実行では
 * ゲージのリセットや消費が発生しないため、ゲージを満タンのまま
 * 何度でもフリーアクションを使い、最後に通常行動を選んだ時だけ
 * ゲージが減る(=そこで初めて「ターンを消費」する)という挙動に
 * なります。
 *
 * ■敵キャラ・オートバトルアクターの挙動
 * こちらはプレイヤーの「選択」という概念がないため、これまでどおり
 * 行動決定時(AI抽選/オートバトル評価)に、直前の行動がフリー
 * アクションであれば続けてもう1回行動を決定する方式です(即時実行
 * ではなく、通常の速度順で他の行動とまとめて処理されます)。
 * 無限ループ防止のため「AI連鎖上限」パラメータで上限を設けています。
 *
 * ■コマンド選択画面を再度開くタイミング
 * 通常のスキル・アイテムの実行と同じく、演出(アニメーション・
 * ダメージ表示・メッセージ)が完全に終わったこと(BattleManager.isBusy()
 * が false になること)を確認してから、コマンド選択画面を再度開きます。
 * 「追加の待機フレーム数」パラメータは、それでも足りない場合の保険用
 * で、通常は0のままで問題ありません。
 *
 * ■注意
 * ・フリーアクションの実行中に戦闘が終了条件(全滅/勝利)を満たした
 *   場合は、選択画面には戻らず通常どおり戦闘終了処理に移行します。
 * ・混乱・魅了などで強制的に決定される単発の行動には対応していません。
 * ・他の「行動回数」系プラグインと併用可能です。
 * ・タグ名はプラグインパラメータで変更できます。
 * ・このプラグインはツクールMZ内部のバトル進行処理(BattleManager)に
 *   踏み込んでフックしています。ツクール本体のバージョンアップや、
 *   他の戦闘関連プラグインとの組み合わせによっては、まれに競合や
 *   フリーズが発生する可能性があります。導入後は必ず実際のプロジェクト
 *   で一通り(通常攻撃・スキル・アイテム・戦闘不能・勝敗)動作確認して
 *   からご利用ください。万一おかしな挙動があれば、状況(戦闘方式、
 *   使用したスキル、他の併用プラグインなど)を教えていただければ
 *   追加で調整します。
 *
 * ■利用規約
 * このプラグインはMIT Licenseのもとで自由に改変・再配布可能です。
 *
 * @help
 */

(() => {
    "use strict";

    const pluginName = "FreeActionSkillItem";
    const parameters = PluginManager.parameters(pluginName);
    const noteTagName = String(parameters["noteTag"] || "FreeAction");
    const noteTagRegex = new RegExp("<" + noteTagName + ">", "i");
    const aiChainLimit = Number(parameters["aiChainLimit"] || 20);
    const resumeDelayFrames = Number(parameters["resumeDelayFrames"] || 0);

    function isFreeActionObject(object) {
        if (!object || !object.note) {
            return false;
        }
        return noteTagRegex.test(object.note);
    }

    //-------------------------------------------------------------------------
    // 自動でコマンドウィンドウを再表示してしまう仕組みを、
    // フリーアクション実行中だけ止める。
    //
    // 実際の rmmz_scenes.js / rmmz_managers.js を確認したところ、
    // Scene_Battle.prototype.update() は isBusy()(演出中かどうか)に
    // 関係なく毎フレーム updateVisibility() → updateInputWindowVisibility()
    // → needsInputWindowChange() を実行しており、
    // 「BattleManager.isInputting()(=this._inputting)が true なのに
    // 入力ウィンドウが1つも active になっていない」状態を検知すると、
    // 即座に changeInputWindow() → startActorCommandSelection() を
    // 呼んでコマンドウィンドウを開き直してしまう。
    // これまで phase の保存・復元や待機フレームだけで対処しようとして
    // いたが、この自動判定はそれらと無関係に働くため効果がなかった。
    // ここではフリーアクション実行中、この自動判定自体を止める。
    //-------------------------------------------------------------------------

    const _Scene_Battle_needsInputWindowChange = Scene_Battle.prototype.needsInputWindowChange;
    Scene_Battle.prototype.needsInputWindowChange = function() {
        if (BattleManager._freeActionActive) {
            return false;
        }
        return _Scene_Battle_needsInputWindowChange.call(this);
    };

    // 以前は TPB の updateTpbInput() もフリーアクション実行中は
    // ブロックしていたが、これは _currentActor / _inputting の管理
    // 全体を止めてしまい、他の味方の正常な行動決定・ターン進行にまで
    // 影響してしまう可能性が高いため撤去した。
    // _subject / _phase は endAction 直後に即座に復元しているため、
    // 通常のターン処理への誤った割り込みはこちらの対策だけで防げる。

    // TPBでは _tpbState ("charging"→"charged"→"casting"→"ready"→"acting"…)
    // という細かい状態遷移があり、フリーアクション実行中にこれを中途半端に
    // 動かしてしまうと、
    // ・"charged" のまま放置 → アイドル時間超過でタイムアウト扱いされる
    // ・"casting" に移す → 残り行動が空だと即座に "ready" 判定されて
    //   本来のターン処理に行動が奪われる
    // ・"charged" へ戻す際に finishTpbCharge() を使う → _tpbTurnEnd=true
    //   が副作用で立ち、ステートのターン経過処理まで誤発火する
    // など、個別に遷移を追いかけると次々に別の不具合を誘発することが
    // 分かった。そのため、フリーアクションを実行しているアクターに
    // 限っては、実行中〜再開直前まで updateTpb() 自体を丸ごと止めて
    // 状態を完全に凍結する(何も変化させない)方式にしている。
    const _Game_Battler_updateTpb = Game_Battler.prototype.updateTpb;
    Game_Battler.prototype.updateTpb = function() {
        if (BattleManager._freeActionActor === this) {
            return;
        }
        _Game_Battler_updateTpb.call(this);
    };

    //-------------------------------------------------------------------------
    // BattleManager
    //   フリーアクションを単独の行動として即座に実行するための処理。
    //-------------------------------------------------------------------------

    BattleManager.startFreeAction = function(subject, action) {
        this._freeActionActive = true;
        this._freeActionActor = subject;
        // 決め打ちで上書きせず、開始前の状態を保存しておき、
        // 終了時にそのまま復元する(TPB/DTB双方の内部状態を壊さないため)。
        this._freeActionSavedPhase = this._phase;
        this._freeActionSavedSubject = this._subject;
        this._subject = subject;
        // 本来の processTurn() と同じ順序:
        // 先頭(unshift)に積んだ行動を実行し、実行開始と同時に
        // (演出の完了を待たず)キューから取り除く。
        subject._actions.unshift(action);
        action.prepare();
        if (action.isValid()) {
            this.startAction();
            // ここから先は startAction -> updateAction -> endAction という
            // 非同期の描画キューを経由して onFreeActionEnd が呼ばれる。
        } else {
            // 対象がいない等で不発だった場合は endAction を経由しないため、
            // ここで直接後処理を行う(演出がないため即時再開してよい)。
            subject.removeCurrentAction();
            this._phase = this._freeActionSavedPhase;
            this._subject = this._freeActionSavedSubject;
            this._freeActionSavedPhase = null;
            this._freeActionSavedSubject = null;
            this.resumeFreeActionInput();
            return;
        }
        subject.removeCurrentAction();
    };

    const _BattleManager_endAction = BattleManager.endAction;
    BattleManager.endAction = function() {
        // _freeActionActive だけで判定すると、フリーアクションの演出
        // 終了待ちの間に(たまたま発動が遅延した)別の仲間の行動が
        // 割り込んで終了した場合、その endAction まで「自分の
        // フリーアクションが終わった」と誤認識してしまう
        // (実際に発生した不具合)。
        // 実行中の本人(_subject)が本当に自分のフリーアクションの
        // 実行者と一致するかどうかまで確認する。
        const wasFreeAction =
            this._freeActionActive && this._subject === this._freeActionActor;
        _BattleManager_endAction.call(this);
        if (wasFreeAction) {
            // 内部状態(phase / subject)はここで即座に復元する。
            // 1フレームでも _subject が自分のアクターを指したままだと、
            // 通常のターン処理(updateTurn -> processTurn)が誤って
            // 割り込み、まだ入力していない行動枠を勝手に消費して
            // TPBゲージがリセットされてしまう(実際に発生した不具合)。
            this._phase = this._freeActionSavedPhase;
            this._subject = this._freeActionSavedSubject;
            this._freeActionSavedPhase = null;
            this._freeActionSavedSubject = null;
            // コマンドウィンドウの再表示だけは、演出が完全に終わる
            // (isBusy()がfalseになる)まで遅らせる。
            // _freeActionActive はここでは false にせず、
            // needsInputWindowChange のブロックは実際にウィンドウを
            // 開き直すまで維持する。
            this._freeActionPendingResume = true;
            this._freeActionExtraWait = resumeDelayFrames;
        }
    };

    const _BattleManager_update = BattleManager.update;
    BattleManager.update = function(timeActive) {
        _BattleManager_update.call(this, timeActive);
        // 通常のスキル・アイテムが「演出が完全に終わってから次の処理に
        // 進む」のと同じ判定(isBusy())を使い、演出中はコマンド
        // ウィンドウの再開処理を行わない。
        if (this._freeActionPendingResume && !this.isBusy()) {
            if (this._freeActionExtraWait > 0) {
                this._freeActionExtraWait--;
                return;
            }
            this._freeActionPendingResume = false;
            this.resumeFreeActionInput();
        }
    };

    BattleManager.resumeFreeActionInput = function() {
        this._freeActionActive = false;
        const actor = this._freeActionActor;
        this._freeActionActor = null;
        if (this.checkBattleEnd()) {
            return;
        }
        const scene = SceneManager._scene;
        if (scene && scene instanceof Scene_Battle) {
            if (!(actor && (!actor.canInput || actor.canInput()))) {
                // 何らかの理由で入力できない状態になっていた場合は、
                // 通常の手順で次のアクターへ進める。
                BattleManager.selectNextCommand();
            }
            // どのウィンドウを出すべきか(アクターコマンド/パーティ
            // コマンド/何も出さない)は、こちらで決め打ちせず
            // エンジン本体の判定(changeInputWindow)にそのまま任せる。
            // これにより BattleManager.actor() の状態とズレて
            // ウィンドウが出ない、という不具合を避けられる。
            scene.changeInputWindow();
        }
    };

    //-------------------------------------------------------------------------
    // Scene_Battle
    //   行動が確定した瞬間(対象決定後、または対象選択不要な場合)に
    //   フリーアクション判定を行い、即時実行に振り替える。
    //-------------------------------------------------------------------------

    const _Scene_Battle_selectNextCommand = Scene_Battle.prototype.selectNextCommand;
    Scene_Battle.prototype.selectNextCommand = function() {
        const actor = BattleManager.actor();
        if (actor) {
            const index = actor._actionInputIndex;
            const decidedAction = actor._actions ? actor._actions[index] : null;
            if (decidedAction && decidedAction.item() && isFreeActionObject(decidedAction.item())) {
                // この行動枠は後で使うのでいったん空にしておき、
                // 決定済みの行動だけを取り出して即時実行する。
                actor._actions[index] = new Game_Action(actor);
                // アクターコマンド/パーティコマンド双方のウィンドウを
                // ここで確実に閉じておく。演出中に(前の選択画面が)
                // 残って見えてしまうのを防ぐ。
                this.closeCommandWindows();
                this.hideSubInputWindows();
                BattleManager.startFreeAction(actor, decidedAction);
                return;
            }
        }
        _Scene_Battle_selectNextCommand.call(this);
    };

    //-------------------------------------------------------------------------
    // Game_Enemy
    //   行動決定時、最後に決定された行動がフリーアクションなら
    //   続けてもう1回抽選する。
    //-------------------------------------------------------------------------

    const _Game_Enemy_makeActions = Game_Enemy.prototype.makeActions;
    Game_Enemy.prototype.makeActions = function() {
        _Game_Enemy_makeActions.call(this);
        if (!this._actions || this._actions.length === 0) {
            return;
        }
        const baseList = this.enemy().actions.filter(a => this.isActionValid(a));
        if (baseList.length === 0) {
            return;
        }
        // 実際の Game_Enemy.prototype.selectAllActions() と同じ手順で
        // ratingZero を算出し、評価値が低すぎる候補を除外した
        // リストを作る(selectAction の第2引数に必要なため)。
        const ratingMax = Math.max(...baseList.map(a => a.rating));
        const ratingZero = ratingMax - 3;
        const actionList = baseList.filter(a => a.rating > ratingZero);
        if (actionList.length === 0) {
            return;
        }
        let chain = 0;
        while (chain < aiChainLimit) {
            const lastAction = this._actions[this._actions.length - 1];
            if (!lastAction || !lastAction.item() || !isFreeActionObject(lastAction.item())) {
                break;
            }
            // Game_Enemy.prototype.selectAction(actionList, ratingZero) は
            // データベース上の行動データ(enemy().actionsの要素)を返す。
            // Game_Action ではないので、setEnemyAction() で反映する。
            const selected = this.selectAction(actionList, ratingZero);
            if (!selected) {
                break;
            }
            const bonusAction = new Game_Action(this);
            bonusAction.setEnemyAction(selected);
            if (!bonusAction.item()) {
                break;
            }
            this._actions.push(bonusAction);
            chain++;
        }
    };

    //-------------------------------------------------------------------------
    // Game_Actor (オートバトル)
    //   オートバトルで決定した最後の行動がフリーアクションなら、
    //   続けてもう1回、最善の行動を評価・決定する。
    //-------------------------------------------------------------------------

    const _Game_Actor_makeAutoBattleActions = Game_Actor.prototype.makeAutoBattleActions;
    Game_Actor.prototype.makeAutoBattleActions = function() {
        _Game_Actor_makeAutoBattleActions.call(this);
        if (!this._actions || this._actions.length === 0) {
            return;
        }
        let chain = 0;
        while (chain < aiChainLimit) {
            const lastAction = this._actions[this._actions.length - 1];
            if (!lastAction || !lastAction.item() || !isFreeActionObject(lastAction.item())) {
                break;
            }
            const list = this.makeActionList();
            if (!list || list.length === 0) {
                break;
            }
            let bestAction = null;
            let maxValue = Number.MIN_VALUE;
            for (const candidate of list) {
                const value = candidate.evaluate();
                if (value > maxValue) {
                    maxValue = value;
                    bestAction = candidate;
                }
            }
            if (!bestAction || !bestAction.item()) {
                break;
            }
            this._actions.push(bestAction);
            chain++;
        }
    };
})();
