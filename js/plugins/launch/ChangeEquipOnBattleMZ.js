//=============================================================================
// Plugin for RPG Maker MZ
// ChangeEquipOnBattleMZ.js
//=============================================================================
// [Update History]
// This plugin is the MZ version of ChangeWeaponOnBattle.js the MV plugin.
// 2019.Dec.13 Ver1.0.0 First Release
// 2020.Oct.04 Ver1.0.1 When skill type is changed, modify actor commands.
// 2020.Oct.04 Ver1.0.2 Fix Bugs Yet More:
//   - Adjust windows' size when screen size is changed.
//   - When back to any menu, cursol was deselected.
//   - On new equipment selecting phase, help window was hidden.
// 2020.Oct.04 Ver1.1.0 Solve the confliction with EquipScene_Extension.js.
// 2022.Jan.26 Ver1.2.0 When gain/lose equips in the battle, refresh windows.
// 2022.Jan.27 Ver1.2.1 Fix Bug: Equips are not modified when actor is alone.
// 2022.Sep.02 Ver1.2.2 Fix Bug: Error when actor become not inputtable
//      by changeing equipment (at Turn-Based)
// 2022.Sep.03 Ver1.2.3 To Fix bug added at 1.2.2
// 2022.Oct.30 Ver1.2.4 At Active TPB, consider parameters with buff/debuff
// 2022.Oct.30 Ver1.2.5 The same as above but Turn-Based Battle.
// 2023.Jul.20 Ver1.3.0 Add option: consume turn to change equip.
// 2023.Jul.25 Ver1.3.1 Fix Bug: When setting turn-based and consume turn,
//    the actor can do action by once change equip and cancel.
// 2023.Jul.27 Ver1.3.2 Fix Bug: The same as above
// 2023.Oct.14 Ver1.4.0 Fix Bug: Solve the confliction with EquipState.js
//

/*:
 * @target MZ
 * @plugindesc [Ver1.4.0a]Add equipment change command to actor commands
 * @author Sasuke KANNAZUKI
 *
 * @orderAfter EquipScene_Extension
 * @orderAfter EquipState
 *
 * @param commandName
 * @text Command Name
 * @desc Displaying command name that changes equipments.
 * @type string
 * @default Equip
 *
 * @param doesConsumeTurn
 * @text Consume Turn?
 * @desc When this set true, the actor cannot perform anything except change equip.
 * @on Yes
 * @off No
 * @type boolean
 * @default false
 *
 * @help This plugin does not provide plugin commands.
 * This plugin runs under RPG Maker MZ.
 * 
 * [Summary]
 * This plugin adds equip change command to actor command on battle.
 * The command doesn't consume turn, but it changes by setting the parameter.
 *
 * [Note Description]
 * If you forbid change equip several actors, write <noEquipChange> to 
 * the actor's note.
 *
 * [Plugin Order]
 * If you import EquipScene_Extension.js or EquipState.js with this plugin,
 * You must set this plugin AFTER that plugin on list.
 *
 * [License]
 * this plugin is released under MIT license.
 * http://opensource.org/licenses/mit-license.php
 */

/*:ja
 * @target MZ
 * @plugindesc [Ver1.4.0a]戦闘コマンドに装備変更を追加
 * @author 神無月サスケ
 *
 * @orderAfter EquipScene_Extension
 * @orderAfter EquipState
 *
 * @param commandName
 * @text コマンド名
 * @desc 装備変更コマンドの表示名です。
 * @type string
 * @default 装備変更
 *
 * @param doesConsumeTurn
 * @text ターン消費？
 * @desc 消費ありにすると、装備を変更したターンではそれ以外の行動が取れなくなります。
 * @on 消費する
 * @off 消費しない
 * @type boolean
 * @default false
 *
 * @help このプラグインにプラグインコマンドはありません。
 * このプラグインは、RPGツクールMZに対応しています。
 *
 * ■概要
 * このプラグインは戦闘のアクターコマンドに「装備変更」を追加します。
 * このコマンドは、原則ターンを消費しませんが、
 * プラグインのパラメータで設定変更可能です。
 *
 * ■メモ
 * 特定のアクターのメモに <noEquipChange> と記述すると、
 * そのアクターには装備変更コマンドが表示されません。
 *
 * ■連携可能なプラグイン
 * うなぎおおとろ様の EquipScene_Extension.js と連携可能です。
 * https://raw.githubusercontent.com/unagiootoro/RPGMZ/master/EquipScene_Extension.js
 * EquipState.js とも連携可能です。
 * https://raw.githubusercontent.com/unagiootoro/RPGMZ/master/EquipState.js
 * これを導入する際には、これらのプラグインの方を必ず、
 * EquipScene_Extension.js より下に置いて下さい。
 *
 * ■ライセンス表記
 * このプラグインは MIT ライセンスで配布されます。
 * ご自由にお使いください。
 * http://opensource.org/licenses/mit-license.php
 */

(() => {
  const pluginName = 'ChangeEquipOnBattleMZ';
  //
  // process parameters
  //
  const parameters = PluginManager.parameters(pluginName);
  const commandName = parameters['commandName'] || 'Equip';
  const doesConsumeTurn = !!eval(parameters['doesConsumeTurn']);

  //
  // Equip slot for battle
  //
  function Window_BattleEquipSlot() {
    this.initialize.apply(this, arguments);
  }

  Window_BattleEquipSlot.prototype = Object.create(Window_EquipSlot.prototype);
  Window_BattleEquipSlot.prototype.constructor = Window_BattleEquipSlot;

  Window_BattleEquipSlot.prototype.show = function() {
    Window_EquipSlot.prototype.show.call(this);
    this.showHelpWindow();
  };

  Window_BattleEquipSlot.prototype.hide = function() {
    Window_EquipSlot.prototype.hide.call(this);
    this.hideHelpWindow();
  };

  //
  // add equipment windows for check active.
  //
  const _Scene_Battle_isAnyInputWindowActive =
   Scene_Battle.prototype.isAnyInputWindowActive;
  Scene_Battle.prototype.isAnyInputWindowActive = function() {
    if(_Scene_Battle_isAnyInputWindowActive.call(this)) {
      return true;
    }
    return this._equipSlotWindow.active || this._equipItemWindow.active;
  };

  //
  // create new windows for equipments
  //
  const _Scene_Battle_createAllWindows =
    Scene_Battle.prototype.createAllWindows;
  Scene_Battle.prototype.createAllWindows = function() {
    _Scene_Battle_createAllWindows.call(this);
    this.createEquipStatusWindow();
    this.createEquipSlotWindow();
    this.createEquipItemWindow();
  };

  Scene_Battle.prototype.createEquipStatusWindow = function() {
    const rect = this.equipStatusWindowRect();
    this._equipStatusWindow = new Window_EquipStatus(rect);
    this._equipStatusWindow.hide();
    this.addWindow(this._equipStatusWindow);
  };

  Scene_Battle.prototype.equipStatusWindowRect = function() {
    const wx = 0;
    const wy = this.buttonAreaBottom();
    const ww = Scene_Equip.prototype.statusWidth.call(this);
    const wh = Scene_Equip.prototype.mainAreaHeight.call(this);
    return new Rectangle(wx, wy, ww, wh);
  };

  Scene_Battle.prototype.createEquipSlotWindow = function() {
    const rect = this.equipSlotAndItemWindowRect();
    this._equipSlotWindow = new Window_BattleEquipSlot(rect);
    this._equipSlotWindow.setHelpWindow(this._helpWindow);
    this._equipSlotWindow.setStatusWindow(this._equipStatusWindow);
    this._equipSlotWindow.setHandler('ok', this.onEquipSlotOk.bind(this));
    this._equipSlotWindow.setHandler('cancel',
      this.onEquipSlotCancel.bind(this)
    );
    this._equipSlotWindow.hide();
    this.addWindow(this._equipSlotWindow);
  };

  Scene_Battle.prototype.createEquipItemWindow = function() {
    const rect = this.equipSlotAndItemWindowRect();
    this._equipItemWindow = new Window_EquipItem(rect);
    this._equipItemWindow.setHelpWindow(this._helpWindow);
    this._equipItemWindow.setStatusWindow(this._equipStatusWindow);
    this._equipItemWindow.setHandler('ok', this.onEquipItemOk.bind(this));
    this._equipItemWindow.setHandler('cancel',
      this.onEquipItemCancel.bind(this)
    );
    this._equipSlotWindow.setItemWindow(this._equipItemWindow);
    this._equipItemWindow.hide();
    this.addWindow(this._equipItemWindow);
  };

  Scene_Battle.prototype.equipSlotAndItemWindowRect = function() {
    const wx = this._equipStatusWindow.width;
    const wy = this._equipStatusWindow.y;
    const ww = Graphics.boxWidth - wx;
    const wh = this._equipStatusWindow.height;
    return new Rectangle(wx, wy, ww, wh);
  };

  //
  // add command to actor command window
  //
  const _Scene_Battle_createActorCommandWindow =
   Scene_Battle.prototype.createActorCommandWindow;
  Scene_Battle.prototype.createActorCommandWindow = function() {
    _Scene_Battle_createActorCommandWindow.call(this);
    this._actorCommandWindow.setHandler('equip', this.commandEquip.bind(this));
  };

  const _Window_ActorCommand_makeCommandList =
   Window_ActorCommand.prototype.makeCommandList;
  Window_ActorCommand.prototype.makeCommandList = function() {
    _Window_ActorCommand_makeCommandList.call(this);
    if (this._actor) {
      this.addEquipCommand();
    }
  };

  Window_ActorCommand.prototype.addEquipCommand = function() {
    if (this._actor && !this._actor.actor().meta.noEquipChange) {
      this.addCommand(commandName, 'equip');
    }
  };

  //
  // resolve cpnflict with EquipState.js
  //
  const usingEquipState = () => "updateEquipStates" in Game_Actor.prototype;

  if (usingEquipState()) {
    //
    // prevent to display message of adding state when one has already affected
    //
    const _Game_Actor_updateEquipStates =
      Game_Actor.prototype.updateEquipStates;
    Game_Actor.prototype.updateEquipStates = function(addableState = true) {
      $gameTemp.updateEquipStatus = true;
      _Game_Actor_updateEquipStates.call(this, addableState);
      $gameTemp.updateEquipStatus = null;
    };

    const _pushAddedState = Game_ActionResult.prototype.pushAddedState;
    Game_ActionResult.prototype.pushAddedState = function(stateId) {
      if ($gameTemp.updateEquipStatus) {
        return;
      }
      _pushAddedState.call(this, stateId);
    };

    //
    // process to modify equip status
    //
    const isAnyEquipWindowVisible = () => {
      const scene = SceneManager._scene; // Scene_Battle
      return scene._equipSlotWindow.visible || scene._equipItemWindow.visible;
    };

    const _updateEquipStates = Game_Actor.prototype.updateEquipStates;

    Game_Actor.prototype.updateEquipStates = function(addableState = true) {
      // during changing equipments on battle, it shouldn't call the function.
      if (!$gameParty.inBattle() || !isAnyEquipWindowVisible()) {
        _updateEquipStates.call(this, addableState);
      }
    };

    // update when equip window is just closed.
    Game_Actor.prototype.updateEquipStates2 = function(addableState = true) {
      _updateEquipStates.call(this, addableState);
    };
  }

  //
  // forcedly refresh because one might be affected by buff/debuff
  //
  Scene_Battle.prototype.forceSetActor = function(actor) {
    if (this.equippingActor == null) {
      this._equipStatusWindow.forceSetActor(actor);
      this.equippingActor = actor;
    }
  };

  Window_EquipStatus.prototype.forceSetActor = function(actor) {
    this._actor = actor;
    this.refresh();
  };

  const _BattleManager_invokeAction = BattleManager.invokeAction;
  BattleManager.invokeAction = function(subject, target) {
    _BattleManager_invokeAction.call(this, subject, target);
    if (target === BattleManager.actor()) {
      SceneManager._scene.forceSetActor(target);
    }
  };

  //
  // at turn-based and consume turn, it needs to remember current equip
  //
  const needsStoreEquipInfo = () => !BattleManager.isTpb() && doesConsumeTurn;

  const storeCurrentEquips = () => {
    if (needsStoreEquipInfo()) {
      const actor = BattleManager.actor();
      if (actor && !actor._beforeEquips) { 
        actor._beforeEquips = JsonEx.makeDeepCopy(actor._equips);
        actor._partyWeapons = JsonEx.makeDeepCopy($gameParty._weapons);
        actor._partyArmors = JsonEx.makeDeepCopy($gameParty._armors);
      }
    }
  };

  const resumeCurrentEquips = actor => {
    if (needsStoreEquipInfo()) {
      if (actor && actor._beforeEquips) {
        actor._equips = JsonEx.makeDeepCopy(actor._beforeEquips);
        $gameParty._weapons = JsonEx.makeDeepCopy(actor._partyWeapons);
        $gameParty._armors = JsonEx.makeDeepCopy(actor._partyArmors);
        if (usingEquipState()) {
          actor.updateEquipStates();
        }
      }
    }
  };

  const _BattleManager_startActorInput = BattleManager.startActorInput;
  BattleManager.startActorInput = function() {
    resumeCurrentEquips(this._currentActor);
    _BattleManager_startActorInput.call(this);
  };

  const discardEquipsInfo = () => {
    if (needsStoreEquipInfo()) {
      for (const actor of $gameParty.members()) {
        if (actor._beforeEquips) { 
          actor._beforeEquips = null;
          actor._partyWeapons = null;
          actor._partyArmors = null;
        }
      }
    }
  };

  const _BattleManager_startTurn = BattleManager.startTurn;
  BattleManager.startTurn= function() {
    discardEquipsInfo();
    _BattleManager_startTurn.call(this);
  };

  //
  // process handlers
  //
  Scene_Battle.prototype.refreshActor = function() {
    const actor = BattleManager.actor();
    // especially for turn-based battle, forcedly set actor.
    this._equipStatusWindow.forceSetActor(actor);
    this._equipSlotWindow.setActor(actor);
    this._equipItemWindow.setActor(actor);
  };

  Scene_Battle.prototype.commandEquip = function() {
    this.refreshActor();
    storeCurrentEquips();
    this._equipStatusWindow.show();
    this._equipSlotWindow.refresh();
    this._equipSlotWindow.select(0);
    this._equipSlotWindow.show();
    this._equipSlotWindow.activate();
    this.equippingActor = null;
  };

  Scene_Battle.prototype.onEquipSlotOk = function() {
    this._equipSlotWindow.hide();
    // it needs refresh on battle, otherwise list of equips is not modified.
    this._equipItemWindow.refresh();
    this._equipItemWindow.select(0);
    this._equipItemWindow.show();
    this._helpWindow.show();
    this._actorCommandWindow.selectLast();
    this._equipItemWindow.activate();
  };

  const doesDisableToInput = () => {
    // when actor become not inputtable by changeing equipment (at Turn-Based)
    return !BattleManager.isTpb() && BattleManager.needsActorInputCancel();
  };

  Scene_Battle.prototype.onEquipSlotCancel = function() {
    if (usingEquipState()) {
      const actor = BattleManager.actor();
      if (actor) {
        BattleManager.actor().updateEquipStates2();
      }
    }
    if (doesConsumeTurn && !doesDisableToInput()) {
      this.selectNextCommand();
    }
    this._equipStatusWindow.hide();
    this._equipSlotWindow.hide();
    if (doesDisableToInput()) {
      BattleManager.actor().clearActions();
      BattleManager.selectNextActor(true);
    } else {
      this._actorCommandWindow.selectLast();
    }
    this._actorCommandWindow.activate();
    this.equippingActor = null;
  };

  Scene_Battle.prototype.onEquipItemOk = function() {
    SoundManager.playEquip();
    this.executeEquipChange();
    this.hideEquipItemWindow();
    this._equipSlotWindow.refresh();
    this._equipItemWindow.refresh();
    this._equipStatusWindow.refresh();
  };

  Scene_Battle.prototype.onEquipItemCancel = function() {
    this.hideEquipItemWindow();
  };

  Scene_Battle.prototype.executeEquipChange = function() {
    const actor = BattleManager.actor();
    const slotId = this._equipSlotWindow.index();
    const item = this._equipItemWindow.item();
    actor.changeEquip(slotId, item);
    // When one changes any equipment, skill type also may change.
    this._actorCommandWindow.refresh();
  };

  Scene_Battle.prototype.hideEquipItemWindow = function() {
    this._equipSlotWindow.show();
    this._equipSlotWindow.activate();
    this._equipItemWindow.hide();
    this._equipItemWindow.deselect();
  };

  //
  // When one changes Weapon or Armor, refresh all equip windows
  //
  Scene_Battle.prototype.refreshAllWindows = function() {
    this._equipSlotWindow.refresh();
    this._equipItemWindow.refresh();
    this._equipStatusWindow.refresh();
  };

  const refreshEquipWindows = () => {
    if ($gameParty.inBattle()) {
      const scene = SceneManager._scene;
      if (scene === Scene_Battle) {
        scene.refreshAllWindows();
      }
    }
  };

  // Change Weapons
  const _Game_Interpreter_command127 = Game_Interpreter.prototype.command127;
  Game_Interpreter.prototype.command127 = function(params) {
    const result = _Game_Interpreter_command127.call(this, params);
    refreshEquipWindows();
    return result;
  };

  // Change Armors
  const _Game_Interpreter_command128 = Game_Interpreter.prototype.command128;
  Game_Interpreter.prototype.command128 = function(params) {
    const result = _Game_Interpreter_command128.call(this, params);
    refreshEquipWindows();
    return result;
  };

  //
  // To solve confliction with another plugin (EquipScene_Extensions.js)
  //
  const _Window_EquipItem_maxCols = Window_EquipItem.prototype.maxCols;
  Window_EquipItem.prototype.maxCols = function() {
    if ($gameParty.inBattle()) {
      return 1;
    } else {
      return _Window_EquipItem_maxCols.call(this);
    }
  };

  const _Window_EquipItem_drawItem = Window_EquipItem.prototype.drawItem;
  Window_EquipItem.prototype.drawItem = function(index) {
    if ($gameParty.inBattle()) {
        Window_ItemList.prototype.drawItem.call(this, index);
    } else {
      _Window_EquipItem_drawItem.call(this, index);
    }
  };

  const _Window_EquipItem_makeItemList =
    Window_EquipItem.prototype.makeItemList;
  Window_EquipItem.prototype.makeItemList = function() {
    if ($gameParty.inBattle()) {
      Window_ItemList.prototype.makeItemList.call(this);
    } else {
      _Window_EquipItem_makeItemList.call(this);
    }
  };

})();
