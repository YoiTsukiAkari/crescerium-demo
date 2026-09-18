//=============================================================================
// CardBattle_ImmediateActions.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc カードバトル用 即時連続行動・行動回数管理プラグイン（v2.0.0）
 * @author (Project)
 *
 * @help CardBattle_ImmediateActions.js
 *
 * ------------------------------------------------------------------------
 * ■ 概要
 * ------------------------------------------------------------------------
 * 標準のRPGツクールMZでは「行動回数」特徴を使うと、コマンド入力を
 * 行動回数の分だけ連続で行ってから、まとめて実行する流れになる
 * （Game_Actor._actionInputIndexを進めながら全ての行動を選び終えた後、
 * BattleManager.startTurn -> processTurnで1個ずつ実行される）。
 *
 * カードバトルでは「1枚使ったら即座に効果を反映し、結果を見てから
 * 次の1枚を選ぶ」という流れが必要なため、本プラグインは
 * 「コマンド確定の都度、その場で1個だけ実行フェーズに入り、終わったら
 * 入力フェーズに戻る」という流れに差し替える。
 *
 * 実装にあたり、コアスクリプト（rmmz_managers.js / rmmz_objects.js /
 * rmmz_scenes.js）の実装を直接確認した上で、変更範囲を「コマンド確定後の
 * 分岐」のみに最小化している。BattleManagerの内部フェーズ管理
 * （_phase, _actionBattlers等）には依存するが、それらを直接操作する
 * のではなく、既存のメソッド（startAction, getNextSubject等）を
 * 正規の手順で呼び出す形にしている。
 *
 * ------------------------------------------------------------------------
 * ■ 前提とする設定
 * ------------------------------------------------------------------------
 * ・パーティの戦闘メンバーは1人を想定（カードバトルの主人公のみ）。
 * ・アクターには「行動回数+4」の特徴を付与し、合計5回行動できる
 *   状態にしておく（Game_Battler.makeActionTimesにより
 *   numActions()が5になる）。
 * ・変数41番（残り行動回数）は、本プラグインがターン開始時・戦闘開始時
 *   に自動で5にリセットする。
 *
 * ------------------------------------------------------------------------
 * ■ 処理の流れ（標準との違い）
 * ------------------------------------------------------------------------
 * 標準：
 *   入力1 -> 入力2 -> 入力3 -> 入力4 -> 入力5 -> (まとめて)実行1〜5 -> 敵
 *
 * 本プラグイン：
 *   入力1 -> 即時実行1 -> 入力2 -> 即時実行2 -> ... -> 入力5 -> 即時実行5 -> 敵
 *
 * 「即時実行」は、選んだ1個のGame_Actionだけをactionsから取り出して
 * 即座にBattleManager.startActionへ渡す処理で実現する。実行完了
 * （endAction）を検知したら、残り行動回数を見て次の入力に進めるか、
 * 敵フェーズに進めるかを分岐する。
 *
 * ------------------------------------------------------------------------
 * ■ 「ターン終了」コマンド
 * ------------------------------------------------------------------------
 * アクターコマンドウィンドウから「攻撃」「防御」「アイテム」を非表示にし、
 * スキルコマンドの後に「ターン終了」コマンドを追加する。
 * 「ターン終了」を選ぶと、ダメージやスキル効果は一切発生せず、即座に
 * 残り行動回数を0にして敵フェーズへ進む（中途離脱用）。
 *
 * ------------------------------------------------------------------------
 * ■ 「ターン終了」コマンドとの連携
 * ------------------------------------------------------------------------
 * 別途用意する「ターン終了」コマンド（スキルまたはアクターコマンドの
 * シンボル）の確定時に、以下を呼ぶこと。
 *   CardBattleImmediateActions.forceEndActorTurn();
 * これにより残り行動回数が0になり、次の即時実行完了後に敵フェーズへ
 * 進む。
 *
 * @param remainingActionsVarId
 * @text 残り行動回数の変数ID
 * @desc 設計書9.8.1節の変数41番を想定。
 * @type number
 * @default 41
 *
 * @param maxActionsPerTurn
 * @text 1ターンの最大行動回数
 * @desc アクターに付与する「行動回数」特徴の合計と一致させること。
 * @type number
 * @default 5
 *
 * @param enableLog
 * @text デバッグログを出すか
 * @type boolean
 * @default true
 *
 */

(() => {
    'use strict';

    const PLUGIN_NAME = 'CardBattle_ImmediateActions';
    const parameters = PluginManager.parameters(PLUGIN_NAME);
    const REMAINING_ACTIONS_VAR_ID = Number(parameters['remainingActionsVarId'] || 41);
    const MAX_ACTIONS_PER_TURN = Number(parameters['maxActionsPerTurn'] || 5);
    const enableLog = parameters['enableLog'] === 'true';

    function log(message) {
        if (enableLog) console.log(`[${PLUGIN_NAME}] ${message}`);
    }

    // ---- 残り行動回数の管理（変数41番） -------------------------------------
    function getRemainingActions() {
        return $gameVariables.value(REMAINING_ACTIONS_VAR_ID);
    }
    function setRemainingActions(value) {
        $gameVariables.setValue(REMAINING_ACTIONS_VAR_ID, Math.max(0, value));
    }
    function resetRemainingActionsToMax() {
        setRemainingActions(MAX_ACTIONS_PER_TURN);
        log(`残り行動回数を初期化: ${MAX_ACTIONS_PER_TURN}`);
    }
    function consumeOneAction() {
        const before = getRemainingActions();
        setRemainingActions(before - 1);
        log(`行動回数消費: ${before} -> ${getRemainingActions()}`);
    }
    function forceEndActorTurn() {
        setRemainingActions(0);
        log('残り行動回数を強制的に0にしました（ターン終了コマンド）。');
    }

    // ---- 「ターン終了」コマンドの実装 -----------------------------------------
    // 「何もしない」効果のため、ダメージ計算やGame_Actionの実行を伴わない。
    // コマンド確定と同時に、即座に残り行動回数を0にして敵フェーズへ進める。
    function executeEndTurnCommand() {
        const actor = BattleManager.actor() || $gameParty.battleMembers()[0];
        log('「ターン終了」コマンドが選択されました。');
        forceEndActorTurn();

        // アクターが行動済み状態（現在の空アクションを破棄）になることを
        // 明示しておく。executeCurrentActionImmediately等の経路を
        // 経由しないため、ここで直接クリアする。
        if (actor) {
            actor.clearActions();
        }

        startEnemyPhase.call(BattleManager);
    }

    // ---- 戦闘開始時／ターン開始時の初期化 ------------------------------------
    // BattleManager.startTurnは「敵フェーズに入る直前」にも呼ばれるため、
    // ここでリセットすると敵の番の後に5回復活してしまう。
    // そのため「プレイヤーの入力フェーズに入る直前（startInput）」での
    // リセットに変更する。
    const _BattleManager_startInput = BattleManager.startInput;
    BattleManager.startInput = function() {
        resetRemainingActionsToMax();
        _BattleManager_startInput.call(this);

        // 標準のstartInputは_currentActorをnullにするため、
        // 通常は「戦う」コマンド選択（パーティコマンド）→
        // selectNextActorという経路を経て初めてアクターが
        // セットされる。本プラグインはパーティコマンドの選択画面を
        // 経由させず、直接アクターコマンドに進める設計のため、
        // ここで明示的に_currentActorをセットし、changeInputWindow()
        // を呼んでアクターコマンド選択へ直接移行させる。
        // （パーティの戦闘メンバーは1人を前提とする。9.前提の通り）
        const actor = $gameParty.battleMembers()[0];
        if (actor && this._inputting) {
            this._currentActor = actor;
            const scene = SceneManager._scene;
            if (scene instanceof Scene_Battle) {
                scene.changeInputWindow();
            }
        }
    };

    // ---- 多重処理防止フラグ ---------------------------------------------------
    let _isExecutingImmediateAction = false;

    // ---- 「即時実行」の核：選んだ1個のアクションだけを実行する -----------------
    // 標準のScene_Battle.prototype.selectNextCommandを呼ぶ代わりに、
    // こちらを呼ぶことで「次の入力へ進む」標準動作を経由せず、
    // その場で1個だけ実行する。
    function executeCurrentActionImmediately() {
        const actor = BattleManager.actor();
        if (!actor) {
            log('警告: 実行対象のアクターが取得できません。');
            _isExecutingImmediateAction = false; // ガードを解除しておく
            return;
        }
        const action = actor.currentAction();
        if (!action) {
            log('警告: 実行すべきアクションが見つかりません。');
            _isExecutingImmediateAction = false;
            return;
        }

        // BattleManagerを「行動実行フェーズ」に入れる。
        // makeActionOrdersは呼ばない（敵を行動順に混ぜないため）。
        // 代わりに_subjectへ直接actorをセットし、startActionを呼ぶことで
        // 標準のaction実行ループ（'action'フェーズ、updateAction）に
        // 正規の手順で入る。
        BattleManager._phase = 'turn';
        BattleManager._subject = actor;
        BattleManager.startAction();
        // この後はBattleManager.update()の通常ループが
        // 'action'フェーズを自動的に進行させ、ダメージ適用や
        // アニメーション表示を行い、最終的にendAction()が呼ばれる。
    }

    // Scene_Battle側のコマンド確定処理を差し替える。
    // 標準ではonSkillOk / onActorOk / onEnemyOk / commandAttack / commandGuard
    // などの末尾でthis.selectNextCommand()（またはonSelectAction経由）が
    // 呼ばれ、「次の入力 or 次のアクターへ」進む。
    // これらを横取りし、対象選択が不要なアクション（needsSelection()が偽）
    // または対象選択完了時に、標準の流れではなく即時実行を行わせる。

    const _Scene_Battle_onSelectAction = Scene_Battle.prototype.onSelectAction;
    Scene_Battle.prototype.onSelectAction = function() {
        if (_isExecutingImmediateAction) {
            log('警告: 即時実行中に onSelectAction が呼ばれました。多重実行を防止します。');
            return;
        }
        const action = BattleManager.inputtingAction();
        if (!action.needsSelection()) {
            // 対象選択が不要なアクション（例：自分自身が対象の魔法等）
            _isExecutingImmediateAction = true; // ガードを即座に立てる
            this.startImmediateExecution();
        } else if (action.isForOpponent()) {
            this.startEnemySelection();
        } else {
            this.startActorSelection();
        }
    };

    const _Scene_Battle_onActorOk = Scene_Battle.prototype.onActorOk;
    Scene_Battle.prototype.onActorOk = function() {
        if (_isExecutingImmediateAction) {
            log('警告: 即時実行中に onActorOk が呼ばれました。多重実行を防止します。');
            return;
        }
        _isExecutingImmediateAction = true; // ガードを即座に立てる
        const action = BattleManager.inputtingAction();
        action.setTarget(this._actorWindow.index());
        this.hideSubInputWindows();
        this.startImmediateExecution();
    };

    const _Scene_Battle_onEnemyOk = Scene_Battle.prototype.onEnemyOk;
    Scene_Battle.prototype.onEnemyOk = function() {
        if (_isExecutingImmediateAction) {
            log('警告: 即時実行中に onEnemyOk が呼ばれました。多重実行を防止します。');
            return;
        }
        _isExecutingImmediateAction = true; // ガードを即座に立てる
        const action = BattleManager.inputtingAction();
        action.setTarget(this._enemyWindow.enemyIndex());
        this.hideSubInputWindows();
        this.startImmediateExecution();
    };

    // 攻撃・防御コマンド（対象選択を伴わない場合がある）も同様に経由させる。
    // commandAttackは内部でonSelectAction()を呼ぶため、上記の上書きが
    // 効くが、対象選択が必要な攻撃の場合はonEnemyOk側で処理される。

    // ---- Scene_Battleに新メソッドを追加：即時実行の開始 ------------------------
    Scene_Battle.prototype.startImmediateExecution = function() {
        // 入力系ウィンドウを確実に非アクティブ・非表示にする。
        // close()はopenness（開閉アニメーション）を0に向かわせるだけで、
        // 数フレームは画面上に残り続けるため、見た目上も即座に消すために
        // hide()とvisible=falseを明示的に呼ぶ。
        // 重要：closeCommandWindows()（標準メソッド）はclose()を呼ぶため、
        // openness（開閉アニメーション値）が0に向かって変化してしまう。
        // 後でshow()するだけではopennessが0のままになり、ウィンドウが
        // 画面上に一切描画されない（activeはtrueでも見えない）という
        // 不具合の原因になっていた。
        // そのため、openness自体は変更せず、hide()による即時非表示と
        // deactivate()による入力無効化のみで対応する。
        this.hideSubInputWindows();
        this._actorCommandWindow.deactivate();
        this._actorCommandWindow.hide();
        this._partyCommandWindow.deactivate();
        this._partyCommandWindow.hide();
        this._statusWindow.deselect();

        // 重要：BattleManager._inputtingをfalseにしないと、
        // Scene_Battle.update -> updateInputWindowVisibility ->
        // needsInputWindowChange() が「ウィンドウは閉じているが
        // isInputting()はtrueのまま」という不一致を検知し、
        // 毎フレームchangeInputWindow()を自動的に呼んでコマンド
        // ウィンドウを再表示してしまう（標準仕様の自動補正機能）。
        // この自動補正と衝突しないよう、明示的にfalseにしておく。
        BattleManager._inputting = false;

        log(`startImmediateExecution直後: actorCommandWindow visible=${this._actorCommandWindow.visible}, active=${this._actorCommandWindow.active}, openness=${this._actorCommandWindow.openness}, BattleManager.isInputting=${BattleManager.isInputting()}`);
        executeCurrentActionImmediately();
    };

    // ---- アクション実行完了後の分岐処理 ---------------------------------------
    // BattleManager.endActionの直後に割り込むが、この時点ではまだ
    // ログウィンドウの文字送りやスプライトのアニメーションが進行中の
    // 場合がある（BattleManager.isBusy()が真の間）。
    // isBusy()が真の間に再入力ウィンドウを表示すると、見た目上は
    // ウィンドウが出るが実際には演出待ちで反応しない、という不整合が
    // 起きるため、「次に何をすべきか」を保留しておき、isBusy()が
    // falseになったフレームで実行する。
    let _pendingPostActionActor = null; // 保留中：次の分岐処理の対象アクター

    const _BattleManager_endAction = BattleManager.endAction;
    BattleManager.endAction = function() {
        if (_isExecutingImmediateAction) {
            this._logWindow.endAction(this._subject);
            this._phase = 'turn';

            const actor = this._subject;
            actor.removeCurrentAction();

            this._subject = null;
            _isExecutingImmediateAction = false;

            consumeOneAction();
            // ここでは即座にhandlePostActionFlowを呼ばず、保留する。
            _pendingPostActionActor = actor;
            return;
        }
        _BattleManager_endAction.call(this);
    };

    // BattleManager.updateにフックし、isBusy()がfalseになった
    // フレームで保留中の分岐処理を実行する。
    const _BattleManager_update = BattleManager.update;
    let _busyWaitLogCount = 0; // デバッグ用：待機中のログ出力回数を抑制するカウンタ
    let _lastLoggedPhase = null; // デバッグ用：_phaseの変化検知
    let _lastLoggedInputting = null; // デバッグ用：_inputtingの変化検知
    BattleManager.update = function(timeActive) {
        _BattleManager_update.call(this, timeActive);

        // _phase / _inputting の変化を検知してログ出力（デバッグ用）
        if (this._phase !== _lastLoggedPhase || this._inputting !== _lastLoggedInputting) {
            log(`[状態変化] phase: ${_lastLoggedPhase} -> ${this._phase}, inputting: ${_lastLoggedInputting} -> ${this._inputting}, actor: ${this._currentActor ? this._currentActor.name() : 'null'}`);
            _lastLoggedPhase = this._phase;
            _lastLoggedInputting = this._inputting;
        }

        if (_pendingPostActionActor) {
            if (this.isBusy()) {
                _busyWaitLogCount++;
                if (_busyWaitLogCount % 30 === 0) { // 30フレームに1回だけログ
                    log(`isBusy()待機中... (経過フレーム概算: ${_busyWaitLogCount})`);
                }
            } else {
                log(`isBusy()がfalseになりました。保留処理を実行します。(待機フレーム概算: ${_busyWaitLogCount})`);
                _busyWaitLogCount = 0;
                const actor = _pendingPostActionActor;
                _pendingPostActionActor = null;
                handlePostActionFlow.call(this, actor);
            }
        }
    };

    function handlePostActionFlow(actor) {
        if (this.checkBattleEnd()) {
            log('戦闘終了を検知。分岐処理を行いません。');
            return;
        }

        if (getRemainingActions() > 0 && actor.canInput()) {
            log('残り行動回数あり。再度コマンド入力に戻ります。');
            returnToActorInput.call(this, actor);
        } else {
            log('残り行動回数なし、または行動不可。敵フェーズへ進みます。');
            startEnemyPhase.call(this);
        }
    }

    // 再度1個分の行動入力に戻すための処理。
    // actor.clearActions()でいったん空にし、新しいGame_Actionを1個だけ
    // 手動で追加することで、行動回数特徴の影響を受けずに「1個だけ選ばせる」
    // 状態を作る。
    function returnToActorInput(actor) {
        actor.clearActions();
        actor.setAction(0, new Game_Action(actor));
        actor.setActionState('undecided');

        this._phase = 'start'; // updateStart -> startInputへ進む経路を使わず、
        // 直接inputフェーズへ遷移させる（startInputを呼ぶとmakeActionsが
        // 走り直して行動回数分(5個)作られてしまうため、ここでは使わない）。
        this._phase = 'input';
        this._inputting = true;
        this._currentActor = actor;
        actor.setActionState('inputting');

        const scene = SceneManager._scene;
        if (scene instanceof Scene_Battle) {
            log(`returnToActorInput呼び出し前: actorCommandWindow visible=${scene._actorCommandWindow.visible}, active=${scene._actorCommandWindow.active}, openness=${scene._actorCommandWindow.openness}`);
            // open()の保証はchangeInputWindowフック側で一括して行う。
            scene.changeInputWindow();
            log(`changeInputWindow呼び出し後: actorCommandWindow visible=${scene._actorCommandWindow.visible}, active=${scene._actorCommandWindow.active}, openness=${scene._actorCommandWindow.openness}`);
        }
    }

    // 残り行動回数を使い切った場合の、敵フェーズ開始処理。
    // makeActionOrdersは使わず、敵のみの行動順リストを構築して
    // 直接turnフェーズに入る（プレイヤーが行動順に混ざらないようにする）。
    function startEnemyPhase() {
        log(`startEnemyPhase呼び出し: 敵の数=${$gameTroop.members().length}`);
        this._inputting = false;
        $gameTroop.makeActions();
        const enemyBattlers = $gameTroop.members().filter(enemy => enemy.canMove());
        enemyBattlers.forEach(enemy => enemy.makeSpeed());
        log(`敵の行動順を構築: 行動可能な敵の数=${enemyBattlers.length}`);

        this._phase = 'turn';
        this._actionBattlers = enemyBattlers;
        this._subject = null;

        const scene = SceneManager._scene;
        if (scene instanceof Scene_Battle) {
            // changeInputWindow()経由だと、isInputting()がfalseのため
            // endCommandSelection()（標準メソッド）に入り、
            // closeCommandWindows()でopennessが0に向けて変化してしまう。
            // 一度opennessが0になったウィンドウは、show()だけでは
            // 再表示できない（open()を呼ぶ処理がどこにも存在しないため）。
            // これを避けるため、ここではcloseCommandWindows()を経由せず、
            // hide()/deactivate()のみで非表示・非アクティブ化する。
            scene._actorCommandWindow.deactivate();
            scene._actorCommandWindow.hide();
            scene._partyCommandWindow.deactivate();
            scene._partyCommandWindow.hide();
            scene.hideSubInputWindows();
            scene._statusWindow.deselect();
            scene._statusWindow.show();
        }
    }

    // ---- 敵フェーズ終了後、次の味方ターンへ戻る処理 ----------------------------
    // 標準ではendTurn -> updateTurnEnd -> startへ進み、startInputが
    // 再度呼ばれて全員分の行動が作られる。プレイヤーが1人のみで
    // 行動回数+4特徴を持つ前提では、この標準フローのままでも
    // 「敵の後にプレイヤーが再び5回行動できる」状態に正しく戻る
    // （本プラグインのstartInputフックでresetRemainingActionsToMaxが
    // 呼ばれるため、変数41番も正しく5にリセットされる）。
    // そのため、敵フェーズ終了後の処理は標準のBattleManagerに委ねてよい。

    // ---- デバッグ用：Scene_Battle側のウィンドウ切替監視 ------------------------
    // needsInputWindowChange / changeInputWindow が実際に呼ばれているか、
    // 呼ばれた時の判定値を直接ログに出す。
    const _Scene_Battle_updateInputWindowVisibility = Scene_Battle.prototype.updateInputWindowVisibility;
    let _lastGameMessageBusyLogged = null;
    Scene_Battle.prototype.updateInputWindowVisibility = function() {
        const messageBusy = $gameMessage.isBusy();
        if (messageBusy !== _lastGameMessageBusyLogged) {
            log(`[$gameMessage.isBusy] ${_lastGameMessageBusyLogged} -> ${messageBusy}`);
            _lastGameMessageBusyLogged = messageBusy;
        }
        _Scene_Battle_updateInputWindowVisibility.call(this);
    };

    const _Scene_Battle_needsInputWindowChange = Scene_Battle.prototype.needsInputWindowChange;
    Scene_Battle.prototype.needsInputWindowChange = function() {
        const result = _Scene_Battle_needsInputWindowChange.call(this);
        const windowActive = this.isAnyInputWindowActive();
        const inputting = BattleManager.isInputting();
        if (result) {
            log(`[needsInputWindowChange] true判定 windowActive=${windowActive}, inputting=${inputting}`);
        }
        return result;
    };

    const _Scene_Battle_changeInputWindow = Scene_Battle.prototype.changeInputWindow;
    Scene_Battle.prototype.changeInputWindow = function() {
        log(`[changeInputWindow] 呼び出し。isInputting=${BattleManager.isInputting()}, actor=${BattleManager.actor() ? BattleManager.actor().name() : 'null'}`);
        _Scene_Battle_changeInputWindow.call(this);

        // 保険：標準のstartActorCommandSelection/startPartyCommandSelection
        // はshow()のみでopen()を呼ばない（あるいはstartPartyCommandSelection
        // のように、_actorCommandWindowに対してclose()しか呼ばずshow()も
        // 呼ばない非対称なケースがある）。
        // 過去にhide()/close()された結果、visible=falseやopenness=0の
        //ままになっているウィンドウは、標準処理だけでは復元されない場合が
        // あるため、入力中であれば該当ウィンドウのshow()とopen()を
        // 明示的に呼んで両方を保証する。
        if (BattleManager.isInputting()) {
            if (BattleManager.actor()) {
                this._actorCommandWindow.show();
                this._actorCommandWindow.open();
                this._partyCommandWindow.hide();
            } else {
                this._partyCommandWindow.show();
                this._partyCommandWindow.open();
                this._actorCommandWindow.hide();
            }
        }

        log(`[changeInputWindow] 完了後。actorCommandWindow active=${this._actorCommandWindow.active}, visible=${this._actorCommandWindow.visible}, openness=${this._actorCommandWindow.openness}, partyCommandWindow active=${this._partyCommandWindow.active}, visible=${this._partyCommandWindow.visible}, openness=${this._partyCommandWindow.openness}`);
    };

    // updateBattleProcess（BattleManager.updateの呼び出し元）自体が
    // 呼ばれているかどうかも確認する。
    const _Scene_Battle_isBusy = Scene_Battle.prototype.isBusy;
    let _lastSceneBusyLogged = null;
    Scene_Battle.prototype.isBusy = function() {
        const result = _Scene_Battle_isBusy.call(this);
        if (result !== _lastSceneBusyLogged) {
            log(`[Scene_Battle.isBusy] ${_lastSceneBusyLogged} -> ${result}`);
            _lastSceneBusyLogged = result;
        }
        return result;
    };

    // ---- アクターコマンドの構成変更：攻撃・防御・アイテムを非表示、 -------------
    // ---- 「ターン終了」コマンドを追加 -----------------------------------------
    // 標準のmakeCommandListは addAttackCommand / addSkillCommands /
    // addGuardCommand / addItemCommand の順で呼ぶ。
    // カードバトルでは「攻撃」「防御」「アイテム」を使わず、全てカード
    // （スキル）で解決するため、これらを非表示にし、スキルコマンドの後に
    // 「ターン終了」を追加する。
    Window_ActorCommand.prototype.makeCommandList = function() {
        if (this._actor) {
            this.addSkillCommands();
            this.addCommand('ターン終了', 'endTurn', true);
        }
    };

    // Scene_Battle側：ハンドラの追加登録。
    // createActorCommandWindowは標準でattack/skill/guard/item/cancelの
    // ハンドラを登録するが、attack/guard/itemに対応するコマンド自体が
    // makeCommandListから除外されているため、それらのハンドラは
    // 呼ばれることがない（無害なまま残しておいてよい）。
    // ここではendTurnハンドラのみ追加で登録する。
    const _Scene_Battle_createActorCommandWindow = Scene_Battle.prototype.createActorCommandWindow;
    Scene_Battle.prototype.createActorCommandWindow = function() {
        _Scene_Battle_createActorCommandWindow.call(this);
        this._actorCommandWindow.setHandler('endTurn', this.commandEndTurn.bind(this));
    };

    Scene_Battle.prototype.commandEndTurn = function() {
        executeEndTurnCommand();
    };

    // ---- 外部公開インターフェース ------------------------------------------
    window.CardBattleImmediateActions = {
        consumeOneAction,
        getRemainingActions,
        forceEndActorTurn,
        resetRemainingActionsToMax
    };

})();
