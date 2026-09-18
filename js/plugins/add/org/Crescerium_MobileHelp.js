/*:
 * @target MZ
 * @plugindesc Smartphone Web startup help shown over the title screen every launch.
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
 * Shows one help image OVER the title screen whenever:
 *   1) the game is running in a browser (not NW.js / Windows deployment), and
 *   2) RPG Maker MZ considers the device mobile.
 *
 * It is shown once per browser launch. No localStorage flag is used.
 * Returning to the title screen during the same launch will not show it again.
 *
 * Tap/click anywhere, OK, or Cancel to close the help and use the title screen.
 *
 * Put:
 *   Crescerium_MobileHelp.png
 * in:
 *   img/pictures/
 *
 * PC browser and Windows deployment skip this overlay.
 */
(() => {
"use strict";

const PLUGIN_NAME = "Crescerium_MobileHelp";
const params = PluginManager.parameters(PLUGIN_NAME);
const HELP_IMAGE = String(params.HelpImage || "Crescerium_MobileHelp");

let helpShownThisLaunch = false;

function isSmartphoneWeb() {
    return !Utils.isNwjs() && Utils.isMobileDevice();
}

const _Scene_Title_create = Scene_Title.prototype.create;
Scene_Title.prototype.create = function() {
    _Scene_Title_create.call(this);

    if (isSmartphoneWeb() && !helpShownThisLaunch) {
        this.createMobileHelpOverlay();
    }
};

Scene_Title.prototype.createMobileHelpOverlay = function() {
    helpShownThisLaunch = true;
    this._mobileHelpVisible = true;

    if (this._commandWindow) {
        this._commandWindow.deactivate();
    }

    this._mobileHelpContainer = new Sprite();

    const background = new Sprite(new Bitmap(Graphics.width, Graphics.height));
    background.bitmap.fillAll("#07121c");
    this._mobileHelpContainer.addChild(background);

    this._mobileHelpSprite = new Sprite(ImageManager.loadPicture(HELP_IMAGE));
    this._mobileHelpSprite.anchor.set(0.5, 0.5);
    this._mobileHelpSprite.x = Graphics.width / 2;
    this._mobileHelpSprite.y = Graphics.height / 2;
    this._mobileHelpContainer.addChild(this._mobileHelpSprite);

    this.addChild(this._mobileHelpContainer);
    this.fitMobileHelpImage();
};

Scene_Title.prototype.fitMobileHelpImage = function() {
    const bitmap = this._mobileHelpSprite.bitmap;
    const apply = () => {
        if (!bitmap.width || !bitmap.height || !this._mobileHelpSprite) return;
        const scale = Math.min(
            Graphics.width / bitmap.width,
            Graphics.height / bitmap.height
        );
        this._mobileHelpSprite.scale.set(scale, scale);
    };

    if (bitmap.isReady()) {
        apply();
    } else {
        bitmap.addLoadListener(apply);
    }
};

const _Scene_Title_update = Scene_Title.prototype.update;
Scene_Title.prototype.update = function() {
    _Scene_Title_update.call(this);

    if (!this._mobileHelpVisible) return;

    if (TouchInput.isTriggered() ||
        Input.isTriggered("ok") ||
        Input.isTriggered("cancel")) {
        this.closeMobileHelpOverlay();
    }
};

Scene_Title.prototype.closeMobileHelpOverlay = function() {
    if (!this._mobileHelpVisible) return;
    this._mobileHelpVisible = false;

    SoundManager.playOk();

    if (this._mobileHelpContainer) {
        this.removeChild(this._mobileHelpContainer);
        this._mobileHelpContainer.destroy({ children: true });
        this._mobileHelpContainer = null;
        this._mobileHelpSprite = null;
    }

    if (this._commandWindow) {
        this._commandWindow.activate();
    }

    TouchInput.clear();
    Input.clear();
};

})();
