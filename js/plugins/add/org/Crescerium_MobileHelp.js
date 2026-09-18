/*:
 * @target MZ
 * @plugindesc Smartphone Web startup help shown before the title every launch.
 * @author OpenAI
 *
 * @param HelpImage
 * @text Help Image
 * @type file
 * @dir img/pictures/
 * @default Crescerium_MobileHelp
 *
 * @help
 * Crescerium_MobileHelp.js
 *
 * Shows one help image BEFORE the title screen whenever:
 *   1) the game is running in a browser (not NW.js / Windows deployment), and
 *   2) RPG Maker MZ considers the device mobile.
 *
 * It is shown EVERY launch. No localStorage flag is used.
 * There is no home-screen / standalone-mode branch.
 *
 * Tap/click anywhere, OK, or Cancel to continue to the title screen.
 *
 * Put:
 *   Crescerium_MobileHelp.png
 * in:
 *   img/pictures/
 *
 * PC browser and Windows deployment skip this scene.
 */
(() => {
"use strict";

const PLUGIN_NAME = "Crescerium_MobileHelp";
const params = PluginManager.parameters(PLUGIN_NAME);
const HELP_IMAGE = String(params.HelpImage || "Crescerium_MobileHelp");

function isSmartphoneWeb() {
    return !Utils.isNwjs() && Utils.isMobileDevice();
}

function Scene_CresceriumMobileHelp() {
    this.initialize(...arguments);
}

Scene_CresceriumMobileHelp.prototype = Object.create(Scene_Base.prototype);
Scene_CresceriumMobileHelp.prototype.constructor = Scene_CresceriumMobileHelp;

Scene_CresceriumMobileHelp.prototype.initialize = function() {
    Scene_Base.prototype.initialize.call(this);
    this._closing = false;
};

Scene_CresceriumMobileHelp.prototype.create = function() {
    Scene_Base.prototype.create.call(this);
    this.createBackground();
    this.createHelpSprite();
};

Scene_CresceriumMobileHelp.prototype.createBackground = function() {
    const sprite = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    sprite.bitmap.fillAll("#07121c");
    this.addChild(sprite);
};

Scene_CresceriumMobileHelp.prototype.createHelpSprite = function() {
    this._helpSprite = new Sprite(ImageManager.loadPicture(HELP_IMAGE));
    this._helpSprite.anchor.set(0.5, 0.5);
    this._helpSprite.x = Graphics.width / 2;
    this._helpSprite.y = Graphics.height / 2;
    this.addChild(this._helpSprite);
};

Scene_CresceriumMobileHelp.prototype.start = function() {
    Scene_Base.prototype.start.call(this);
    this.fitImage();
};

Scene_CresceriumMobileHelp.prototype.fitImage = function() {
    const bitmap = this._helpSprite.bitmap;
    const apply = () => {
        if (!bitmap.width || !bitmap.height) return;
        const scale = Math.min(
            Graphics.width / bitmap.width,
            Graphics.height / bitmap.height
        );
        this._helpSprite.scale.set(scale, scale);
    };
    if (bitmap.isReady()) {
        apply();
    } else {
        bitmap.addLoadListener(apply);
    }
};

Scene_CresceriumMobileHelp.prototype.update = function() {
    Scene_Base.prototype.update.call(this);
    if (this._closing) return;

    if (TouchInput.isTriggered() ||
        Input.isTriggered("ok") ||
        Input.isTriggered("cancel")) {
        this.closeHelp();
    }
};

Scene_CresceriumMobileHelp.prototype.closeHelp = function() {
    if (this._closing) return;
    this._closing = true;
    SoundManager.playOk();
    SceneManager.goto(Scene_Title);
};

// Intercept the normal boot-to-title transition.
// Unlike v1, this intentionally shows the help on every mobile-web launch.
Scene_Boot.prototype.startNormalGame = function() {
    this.checkPlayerLocation();
    DataManager.setupNewGame();

    if (isSmartphoneWeb()) {
        SceneManager.goto(Scene_CresceriumMobileHelp);
    } else {
        SceneManager.goto(Scene_Title);
    }

    Window_TitleCommand.initCommandPosition();
};

})();
