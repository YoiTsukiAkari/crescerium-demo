//=============================================================================
// Crescerium_Localization.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc 多言語化（日本語原文キー方式の言語切り替え）
 * @author Ryo
 *
 * @param languages
 * @text 言語リスト
 * @desc 「コード:表示名」をカンマ区切りで。先頭が原文言語。
 * 辞書は lang/<コード>.json を読み込む（原文言語は辞書不要）
 * @default ja:日本語,en:English,zh:简体中文
 *
 * @param optionLabel
 * @text オプション項目名
 * @desc オプション画面の言語項目名（どの言語でも固定表示）
 * @default Language
 *
 * @param languageFonts
 * @text 言語別フォント
 * @desc 「コード:fontsフォルダ内のファイル名」をカンマ区切りで。
 * 指定した言語ではメインフォントを差し替える（無い字形は元のフォントで表示）
 * @default en:mplus-1p-regular-latin.woff,zh:notosans-sc-subset.woff
 *
 * @param localizedImages
 * @text 言語別画像
 * @desc img/ 以下のパス（拡張子なし）をカンマ区切りで。
 * 原文言語以外では「ファイル名_言語コード」の画像があれば差し替える
 * @default titles1/add/title_v3
 *
 * @param fallbackLanguage
 * @text 自動判定時の既定言語
 * @desc 初回起動時、OS言語が言語リストに無い場合に使う言語コード
 * @default en
 *
 * @help
 * ■ 方式
 * 日本語原文をキーに、表示直前に辞書（lang/en.json 等）で差し替えます。
 * イベント・データベースのファイルは書き換えません。
 *
 * ■ 配置
 * plugins.js の最下段に置いてください（他プラグインの処理をさらに包むため）。
 *
 * ■ 現在の実装範囲（ステップ1）
 * - 辞書の読み込み、グローバル関数 T("文字列")
 * - オプション画面の言語切り替え（ConfigManager に保存）
 * - 初回起動時はOS言語で自動判定
 * - データベースの置換（原文を保持し、言語切替時に再適用）
 * - アクター名・二つ名・プロフィールは表示時に翻訳（セーブデータ対策）
 * - マップ表示名
 *
 * ■ ステップ2
 * - 文章の表示（1枠単位）、スクロール文章、選択肢
 * - 名前欄（表示時に翻訳。立ち絵判定は日本語のまま）
 * - 原文言語以外では自動折り返し。4行超はMZ標準の自動改ページ
 *
 * ■ ステップ3
 * - パターン一致：辞書の %1 入りキーで、名前埋め込み後の文字列も訳す
 * - バトルログ（addText）の翻訳
 * - 描画の保険：かな・漢字を含む描画文字列を辞書で訳す
 * - 訳漏れ検出：画面に描かれた未訳の日本語をテストプレイ時にログ出力
 *
 * ■ ステップ4
 * - プラグインが直接追加した文章も表示直前に訳す（枠→行の順で辞書を引く）
 * - 全角英数記号（？？？ など）も描画の保険・訳漏れ検出の対象に
 *
 * ■ ステップ5
 * - 言語別フォント（英語は M PLUS 1p。fonts/OFL_mplus-1p.txt 参照）
 * - 言語別画像（title_v3 → title_v3_en など。ファイルが無ければ元画像）
 *
 * ■ ピクチャの訳文
 * 原文言語以外で、ピクチャ表示の直後の「空の文章」を辞書の
 * "@pic:ピクチャ名"（例 "@pic:add/secret_file/secret_2_3"）の訳文に差し替える。
 * 設定資料の画像は日本語のまま、英訳を文章ウィンドウで表示するために使う。
 *
 * ■ デプロイ時の注意
 * 「未使用ファイルを含まない」をONにすると _en 画像や lang/ が
 * 除外される場合があります。出力後に lang/ と _en 画像の有無を確認してください。
 * - テストプレイ時のみ：T() 等の表示時翻訳で辞書にない日本語をコンソールに記録
 *   （DB一括置換では記録しない。未使用データのノイズを避けるため）
 *
 * ■ スクリプトから
 *   T("文字列")                 現在の言語に翻訳（辞書に無ければ原文）
 *   CresLoc.language()          現在の言語コード
 *   CresLoc.setLanguage("en")   言語を変更
 *   CresLoc.misses()            訳漏れ一覧（テストプレイ時）
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "Crescerium_Localization";
    const params = PluginManager.parameters(PLUGIN_NAME);

    const LANGUAGES = String(params.languages || "ja:日本語,en:English")
        .split(",")
        .map(s => s.trim())
        .filter(s => s)
        .map(s => {
            const i = s.indexOf(":");
            return i < 0
                ? { code: s, label: s }
                : { code: s.slice(0, i).trim(), label: s.slice(i + 1).trim() };
        });
    const SOURCE_LANG = LANGUAGES[0].code;
    const OPTION_LABEL = String(params.optionLabel || "Language");
    const FALLBACK_LANG = String(params.fallbackLanguage || "en");
    const CONFIG_KEY = "language";
    const LANGUAGE_FONTS = {};
    const fontsParam = params.languageFonts !== undefined ? params.languageFonts : "en:mplus-1p-regular-latin.woff";
    for (const entry of String(fontsParam).split(",")) {
        const i = entry.indexOf(":");
        if (i > 0) LANGUAGE_FONTS[entry.slice(0, i).trim()] = entry.slice(i + 1).trim();
    }
    const LOCALIZED_IMAGES = new Set(
        String(params.localizedImages !== undefined ? params.localizedImages : "titles1/add/title_v3").split(",").map(s => s.trim()).filter(s => s)
    );
    // かな・漢字・全角英数記号（「？？？」「Ｇ」など）
    const JP_PATTERN_ALL = /[\u3040-\u30ff\u3400-\u9fff\uff01-\uff9f]/;
    // 中国語など漢字を使う言語では、訳文自体に漢字が含まれるため「かな」で日本語を判定する
    const JP_PATTERN_KANA = /[\u3040-\u309f\u30a0-\u30fa\u30fc-\u30ff\uff66-\uff9f]/;
    const KANJI_LANGS = /^(zh|ko-Hani)/;
    const JP_PATTERN = {
        test(text) {
            return (KANJI_LANGS.test(currentLang) ? JP_PATTERN_KANA : JP_PATTERN_ALL).test(text);
        }
    };

    //-------------------------------------------------------------------------
    // CresLoc 本体
    //-------------------------------------------------------------------------
    const dictionaries = {};   // { en: { 原文: 訳 } }
    let pendingLoads = 0;
    let currentLang = SOURCE_LANG;
    let databaseApplied = false;
    const missSet = new Set();

    function isTest() {
        return Utils.isOptionValid("test");
    }

    function hasLanguage(code) {
        return LANGUAGES.some(l => l.code === code);
    }

    function loadDictionaries() {
        for (const lang of LANGUAGES) {
            if (lang.code === SOURCE_LANG || dictionaries[lang.code]) continue;
            pendingLoads++;
            const url = "lang/" + lang.code + ".json";
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.overrideMimeType("application/json");
            xhr.onload = () => {
                try {
                    if (xhr.status >= 400) throw new Error("HTTP " + xhr.status);
                    dictionaries[lang.code] = JSON.parse(xhr.responseText);
                } catch (e) {
                    console.warn(`[${PLUGIN_NAME}] ${url} の読み込みに失敗しました`, e);
                    dictionaries[lang.code] = {};
                }
                pendingLoads--;
            };
            xhr.onerror = () => {
                console.warn(`[${PLUGIN_NAME}] ${url} が見つかりません`);
                dictionaries[lang.code] = {};
                pendingLoads--;
            };
            xhr.send();
        }
    }

    function translate(text, quiet) {
        if (currentLang === SOURCE_LANG) return text;
        if (typeof text !== "string" || text === "") return text;
        const dict = dictionaries[currentLang];
        if (dict && Object.prototype.hasOwnProperty.call(dict, text)) {
            return dict[text];
        }
        const patterned = translateByPattern(text);
        if (patterned !== null) return patterned;
        if (!quiet && isTest() && JP_PATTERN.test(text) && !missSet.has(text)) {
            missSet.add(text);
            console.log(`[${PLUGIN_NAME}] 訳漏れ:`, JSON.stringify(text));
        }
        return text;
    }

    //-------------------------------------------------------------------------
    // パターン一致
    //   辞書のうち %1〜%9 を含むキー（例 "%1が現れた！"）を正規表現として使い、
    //   名前などが埋め込まれた後の文字列（例 "Goblinが現れた！"）も訳す。
    //   埋め込まれた部分は辞書で訳し直してから差し込む。
    //-------------------------------------------------------------------------
    const patternCache = {};   // { en: [{ regex, order, value }] }

    function buildPatterns(lang) {
        const dict = dictionaries[lang] || {};
        const list = [];
        for (const key of Object.keys(dict)) {
            if (!/%[1-9]/.test(key)) continue;
            const literal = key.replace(/%[1-9]/g, "");
            if (literal.length < 2) continue;   // "%1たち" のような短すぎる形は誤爆しやすいので除外
            const order = [];
            const source = key
                .split(/(%[1-9])/)
                .map(part => {
                    if (/^%[1-9]$/.test(part)) {
                        order.push(Number(part[1]));
                        return "([\\s\\S]+?)";
                    }
                    return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                })
                .join("");
            list.push({ regex: new RegExp("^" + source + "$"), order, value: dict[key], weight: literal.length });
        }
        // 固定部分が長い（＝より具体的な）パターンを優先
        list.sort((a, b) => b.weight - a.weight);
        return list;
    }

    // 「ゴブリン・ラビィ」のような「・」区切りの名前の並びを英語の列挙にする
    function translateArgument(text) {
        if (text.indexOf("・") < 0) return translate(text, true);
        const parts = text.split("・").map(part => translate(part, true));
        if (/^zh/.test(currentLang)) return parts.join("、");
        if (parts.length === 2) return parts[0] + " and " + parts[1];
        return parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1];
    }

    let patternDepth = 0;
    function translateByPattern(text) {
        if (!JP_PATTERN.test(text) || patternDepth > 2) return null;
        const list = patternCache[currentLang] || (patternCache[currentLang] = buildPatterns(currentLang));
        for (const p of list) {
            const m = p.regex.exec(text);
            if (!m) continue;
            const args = [];
            patternDepth++;
            try {
                p.order.forEach((n, i) => { args[n] = translateArgument(m[i + 1]); });
            } finally {
                patternDepth--;
            }
            return String(p.value).replace(/%([1-9])/g, (all, n) => (args[n] !== undefined ? args[n] : all));
        }
        return null;
    }

    function detectLanguage() {
        const nav = (navigator.language || "").toLowerCase();
        const exact = LANGUAGES.find(l => nav === l.code.toLowerCase());
        if (exact) return exact.code;
        const prefix = LANGUAGES.find(l => nav.split("-")[0] === l.code.toLowerCase().split("-")[0]);
        if (prefix) return prefix.code;
        return hasLanguage(FALLBACK_LANG) ? FALLBACK_LANG : SOURCE_LANG;
    }

    //-------------------------------------------------------------------------
    // データベースの置換
    //   各オブジェクトに原文を __loc として保持し、そこから毎回訳し直す
    //-------------------------------------------------------------------------
    const DB_FIELDS = [
        // アクター名・二つ名・プロフィールはセーブデータにコピーされるため
        // DBでは訳さず、Game_Actor の表示時に訳す
        ["$dataClasses", ["name"]],
        ["$dataSkills", ["name", "description", "message1", "message2"]],
        ["$dataItems", ["name", "description"]],
        ["$dataWeapons", ["name", "description"]],
        ["$dataArmors", ["name", "description"]],
        ["$dataEnemies", ["name"], ["desc1", "desc2", "desc3"]],
        ["$dataStates", ["name", "message1", "message2", "message3", "message4"]]
    ];

    function applyObject(obj, fields, metaKeys) {
        if (!obj) return;
        if (!obj.__loc) {
            obj.__loc = { fields: {}, meta: {} };
            for (const f of fields) obj.__loc.fields[f] = obj[f];
            if (metaKeys && obj.meta) {
                for (const k of metaKeys) {
                    if (typeof obj.meta[k] === "string") obj.__loc.meta[k] = obj.meta[k];
                }
            }
        }
        for (const f of Object.keys(obj.__loc.fields)) {
            obj[f] = translate(obj.__loc.fields[f], true);
        }
        for (const k of Object.keys(obj.__loc.meta)) {
            obj.meta[k] = translate(obj.__loc.meta[k], true);
        }
    }

    // 配列・オブジェクトの文字列要素をまるごと訳す（System 用）
    function applyStringContainer(owner, key, store) {
        const target = owner[key];
        if (!target) return;
        if (!store[key]) store[key] = JSON.parse(JSON.stringify(target));
        const orig = store[key];
        for (const k of Object.keys(orig)) {
            if (typeof orig[k] === "string") target[k] = translate(orig[k], true);
        }
    }

    let systemOriginal = null;

    function applySystem() {
        const sys = window.$dataSystem;
        if (!sys) return;
        if (!systemOriginal) {
            systemOriginal = {
                gameTitle: sys.gameTitle,
                currencyUnit: sys.currencyUnit,
                lists: {},
                terms: {}
            };
        }
        sys.gameTitle = translate(systemOriginal.gameTitle, true);
        sys.currencyUnit = translate(systemOriginal.currencyUnit, true);
        for (const key of ["elements", "skillTypes", "weaponTypes", "armorTypes", "equipTypes"]) {
            applyStringContainer(sys, key, systemOriginal.lists);
        }
        for (const key of ["basic", "commands", "params", "messages"]) {
            applyStringContainer(sys.terms, key, systemOriginal.terms);
        }
    }

    function applyDatabase() {
        for (const [name, fields, metaKeys] of DB_FIELDS) {
            const list = window[name];
            if (!Array.isArray(list)) continue;
            for (const obj of list) applyObject(obj, fields, metaKeys);
        }
        applySystem();
        databaseApplied = true;
    }

    //-------------------------------------------------------------------------
    // 公開 API
    //-------------------------------------------------------------------------
    const CresLoc = {
        languages: () => LANGUAGES.slice(),
        sourceLanguage: () => SOURCE_LANG,
        language: () => currentLang,
        isLoaded: () => pendingLoads <= 0,
        translate,
        misses: () => Array.from(missSet),
        labelOf(code) {
            const l = LANGUAGES.find(x => x.code === code);
            return l ? l.label : code;
        },
        setLanguage(code) {
            if (!hasLanguage(code)) return;
            currentLang = code;
            if (databaseApplied) {
                applyDatabase();
                // ウィンドウのタイトルバーも切り替える
                if (window.$dataSystem) document.title = $dataSystem.gameTitle;
            }
        },
        reapply() {
            applyDatabase();
        }
    };
    window.CresLoc = CresLoc;
    window.T = text => translate(text);

    //-------------------------------------------------------------------------
    // 起動時の読み込み・適用
    //-------------------------------------------------------------------------
    const _DataManager_loadDatabase = DataManager.loadDatabase;
    DataManager.loadDatabase = function() {
        _DataManager_loadDatabase.apply(this, arguments);
        loadDictionaries();
    };

    const _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        return _DataManager_isDatabaseLoaded.apply(this, arguments) && CresLoc.isLoaded();
    };

    // DB と ConfigManager の両方が読み込み済みになる Scene_Boot.start で適用
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        applyDatabase();
        _Scene_Boot_start.apply(this, arguments);
    };

    //-------------------------------------------------------------------------
    // ConfigManager
    //-------------------------------------------------------------------------
    ConfigManager[CONFIG_KEY] = SOURCE_LANG;

    const _ConfigManager_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        const config = _ConfigManager_makeData.apply(this, arguments);
        config[CONFIG_KEY] = this[CONFIG_KEY];
        return config;
    };

    const _ConfigManager_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _ConfigManager_applyData.apply(this, arguments);
        const saved = config ? config[CONFIG_KEY] : undefined;
        this[CONFIG_KEY] = hasLanguage(saved) ? saved : detectLanguage();
        CresLoc.setLanguage(this[CONFIG_KEY]);
    };

    // config.rmmzsave が存在しない初回起動でも自動判定を通す
    const _ConfigManager_load = ConfigManager.load;
    ConfigManager.load = function() {
        this[CONFIG_KEY] = detectLanguage();
        CresLoc.setLanguage(this[CONFIG_KEY]);
        _ConfigManager_load.apply(this, arguments);
    };

    //-------------------------------------------------------------------------
    // オプション画面
    //-------------------------------------------------------------------------
    const _Window_Options_addGeneralOptions = Window_Options.prototype.addGeneralOptions;
    Window_Options.prototype.addGeneralOptions = function() {
        this.addCommand(OPTION_LABEL, CONFIG_KEY);
        _Window_Options_addGeneralOptions.apply(this, arguments);
    };

    const _Scene_Options_maxCommands = Scene_Options.prototype.maxCommands;
    Scene_Options.prototype.maxCommands = function() {
        return _Scene_Options_maxCommands.apply(this, arguments) + 1;
    };

    const _Window_Options_statusText = Window_Options.prototype.statusText;
    Window_Options.prototype.statusText = function(index) {
        if (this.commandSymbol(index) === CONFIG_KEY) {
            return CresLoc.labelOf(ConfigManager[CONFIG_KEY]);
        }
        return _Window_Options_statusText.apply(this, arguments);
    };

    Window_Options.prototype.shiftLanguage = function(step) {
        const codes = LANGUAGES.map(l => l.code);
        const i = Math.max(0, codes.indexOf(ConfigManager[CONFIG_KEY]));
        const next = codes[(i + step + codes.length) % codes.length];
        if (next === ConfigManager[CONFIG_KEY]) return;
        ConfigManager[CONFIG_KEY] = next;
        CresLoc.setLanguage(next);
        this.playCursorSound();
        // 項目名（TextManager 経由）も訳し直すため作り直す
        const index = this.index();
        this.refresh();
        this.select(index);
    };

    const _Window_Options_processOk = Window_Options.prototype.processOk;
    Window_Options.prototype.processOk = function() {
        if (this.commandSymbol(this.index()) === CONFIG_KEY) {
            this.shiftLanguage(1);
            return;
        }
        _Window_Options_processOk.apply(this, arguments);
    };

    const _Window_Options_cursorRight = Window_Options.prototype.cursorRight;
    Window_Options.prototype.cursorRight = function() {
        if (this.commandSymbol(this.index()) === CONFIG_KEY) {
            this.shiftLanguage(1);
            return;
        }
        _Window_Options_cursorRight.apply(this, arguments);
    };

    const _Window_Options_cursorLeft = Window_Options.prototype.cursorLeft;
    Window_Options.prototype.cursorLeft = function() {
        if (this.commandSymbol(this.index()) === CONFIG_KEY) {
            this.shiftLanguage(-1);
            return;
        }
        _Window_Options_cursorLeft.apply(this, arguments);
    };

    //-------------------------------------------------------------------------
    // アクター（表示時に翻訳）
    //-------------------------------------------------------------------------
    const _Game_Actor_name = Game_Actor.prototype.name;
    Game_Actor.prototype.name = function() {
        return translate(_Game_Actor_name.apply(this, arguments));
    };

    const _Game_Actor_nickname = Game_Actor.prototype.nickname;
    Game_Actor.prototype.nickname = function() {
        return translate(_Game_Actor_nickname.apply(this, arguments));
    };

    const _Game_Actor_profile = Game_Actor.prototype.profile;
    Game_Actor.prototype.profile = function() {
        return translate(_Game_Actor_profile.apply(this, arguments));
    };

    //-------------------------------------------------------------------------
    // マップ表示名
    //-------------------------------------------------------------------------
    const _Game_Map_displayName = Game_Map.prototype.displayName;
    Game_Map.prototype.displayName = function() {
        return translate(_Game_Map_displayName.apply(this, arguments));
    };
    //-------------------------------------------------------------------------
    // 文章の表示（101＋401）／選択肢／スクロール文章
    //   1枠ぶんの行を "\n" で連結した文字列をキーに置換する
    //-------------------------------------------------------------------------
    function translateMessageLines(startIndex) {
        if (currentLang === SOURCE_LANG) return;
        const texts = $gameMessage._texts;
        if (!texts || texts.length <= startIndex) return;
        const lines = texts.splice(startIndex);
        const translated = translate(lines.join("\n"));
        for (const line of String(translated).split("\n")) texts.push(line);
    }

    //-------------------------------------------------------------------------
    // ピクチャの訳文（設定資料など、文字入り画像の英訳を文章で出す）
    //   原文言語以外で、ピクチャ表示の後に来た「空の文章」を、
    //   辞書の "@pic:ピクチャ名" の訳文に差し替える（背景は「暗くする」）。
    //   訳文が無いピクチャ、2回目以降の空の文章は何もしない。
    //-------------------------------------------------------------------------
    const PICTURE_KEY_PREFIX = "@pic:";
    let lastPictureName = "";
    let lastPictureUsed = true;

    const _Game_Screen_showPicture = Game_Screen.prototype.showPicture;
    Game_Screen.prototype.showPicture = function(pictureId, name) {
        _Game_Screen_showPicture.apply(this, arguments);
        lastPictureName = name || "";
        lastPictureUsed = false;
    };

    function applyPictureTranslation(startIndex) {
        if (currentLang === SOURCE_LANG || lastPictureUsed || !lastPictureName) return false;
        const texts = $gameMessage._texts;
        const lines = texts.slice(startIndex);
        if (lines.length === 0 || lines.some(line => line !== "")) return false;
        const dict = dictionaries[currentLang] || {};
        const key = PICTURE_KEY_PREFIX + lastPictureName;
        if (!Object.prototype.hasOwnProperty.call(dict, key)) return false;
        lastPictureUsed = true;
        texts.splice(startIndex);
        for (const line of String(dict[key]).split("\n")) texts.push(line);
        $gameMessage.setBackground(1);
        return true;
    }

    // PortraitDisplay など他プラグインの command101 より外側で動く（最下段配置のため）
    const _Game_Interpreter_command101 = Game_Interpreter.prototype.command101;
    Game_Interpreter.prototype.command101 = function() {
        const start = $gameMessage._texts.length;
        const result = _Game_Interpreter_command101.apply(this, arguments);
        if (result && !applyPictureTranslation(start)) translateMessageLines(start);
        return result;
    };

    const _Game_Interpreter_command105 = Game_Interpreter.prototype.command105;
    Game_Interpreter.prototype.command105 = function() {
        const start = $gameMessage._texts.length;
        const result = _Game_Interpreter_command105.apply(this, arguments);
        if (result) translateMessageLines(start);
        return result;
    };

    const _Game_Message_setChoices = Game_Message.prototype.setChoices;
    Game_Message.prototype.setChoices = function(choices) {
        const args = Array.prototype.slice.call(arguments);
        args[0] = (choices || []).map(c => translate(c));
        _Game_Message_setChoices.apply(this, args);
    };

    //-------------------------------------------------------------------------
    // 名前欄（表示時に翻訳）
    //   PortraitDisplay は原文の名前で立ち絵を判定するため、
    //   $gameMessage には日本語のまま渡し、ウィンドウ表示の段階で訳す
    //-------------------------------------------------------------------------
    const _Window_NameBox_setName = Window_NameBox.prototype.setName;
    Window_NameBox.prototype.setName = function(name) {
        _Window_NameBox_setName.call(this, translate(name));
    };

    //-------------------------------------------------------------------------
    // 英語などの自動折り返し
    //   制御文字変換後のテキストを単語単位で測り、収まらない所に改行を入れる。
    //   4行を超えた分は MZ 標準の自動改ページ（needsNewPage）で次ページへ送られる。
    //   原文言語（日本語）では手動改行を尊重して何もしない。
    //-------------------------------------------------------------------------
    const ESC = "\x1b";
    const CJK_CHAR = /[　-ヿ㐀-鿿＀-￯]/;
    // 制御文字 / 改行 / 空白 / CJK 1文字 / それ以外の連続（単語）
    const TOKEN_PATTERN = /\x1b(?:[$.|^!><{}\\]|[A-Z]+)(?:\[[^\]]*\])?|\n|[ \t]+|[　-ヿ㐀-鿿＀-￯]|[^\x1b\n \t　-ヿ㐀-鿿＀-￯]+/gi;

    Window_Message.prototype.wrapLocalizedText = function(text, maxWidth) {
        const tokens = text.match(TOKEN_PATTERN) || [];
        const bitmap = this.contents;
        const savedSize = bitmap.fontSize;
        let out = "";
        let lineWidth = 0;
        let pendingSpace = "";     // 行頭に持ち越さない空白
        let pendingSpaceWidth = 0;

        for (const token of tokens) {
            if (token === "\n") {
                out += "\n";
                lineWidth = 0;
                pendingSpace = "";
                pendingSpaceWidth = 0;
                continue;
            }
            if (token[0] === ESC) {
                const m = /^\x1b([$.|^!><{}\\]|[A-Z]+)(?:\[([^\]]*)\])?$/i.exec(token);
                const code = m ? m[1].toUpperCase() : "";
                if (code === "{") {
                    if (bitmap.fontSize <= 96) bitmap.fontSize += 12;
                } else if (code === "}") {
                    if (bitmap.fontSize >= 24) bitmap.fontSize -= 12;
                } else if (code === "I") {
                    const w = ImageManager.iconWidth + 4;
                    if (lineWidth > 0 && lineWidth + pendingSpaceWidth + w > maxWidth) {
                        out += "\n";
                        lineWidth = 0;
                        pendingSpace = "";
                        pendingSpaceWidth = 0;
                    }
                    out += pendingSpace;
                    lineWidth += pendingSpaceWidth + w;
                    pendingSpace = "";
                    pendingSpaceWidth = 0;
                    out += token;
                    continue;
                }
                out += token;
                continue;
            }
            if (/^[ \t]+$/.test(token)) {
                pendingSpace += token;
                pendingSpaceWidth = bitmap.measureTextWidth(pendingSpace);
                continue;
            }
            const w = bitmap.measureTextWidth(token);
            if (lineWidth > 0 && lineWidth + pendingSpaceWidth + w > maxWidth) {
                out += "\n";
                lineWidth = 0;
            } else {
                out += pendingSpace;
                lineWidth += pendingSpaceWidth;
            }
            pendingSpace = "";
            pendingSpaceWidth = 0;
            out += token;
            lineWidth += w;
        }
        out += pendingSpace;
        bitmap.fontSize = savedSize;
        return out;
    };

    // プラグインや戦闘処理が $gameMessage.add した文章（イベントの1枠以外）を訳す。
    // 枠全体で辞書に無ければ1行ずつ訳す（例：出現メッセージが複数行並ぶ場合）。
    function translatePendingMessage() {
        if (currentLang === SOURCE_LANG) return;
        const texts = $gameMessage._texts;
        if (!texts || texts.length === 0) return;
        const joined = texts.join("\n");
        if (!JP_PATTERN.test(joined)) return;
        const dict = dictionaries[currentLang] || {};
        let result;
        if (Object.prototype.hasOwnProperty.call(dict, joined)) {
            result = String(dict[joined]).split("\n");
        } else {
            result = texts.map(line => translate(line));
        }
        texts.length = 0;
        for (const line of result) texts.push(line);
    }

    const _Window_Message_startMessage = Window_Message.prototype.startMessage;
    Window_Message.prototype.startMessage = function() {
        translatePendingMessage();
        _Window_Message_startMessage.apply(this, arguments);
        const textState = this._textState;
        if (currentLang === SOURCE_LANG || !textState || textState.index !== 0) return;
        this.resetFontSettings();
        const maxWidth = this.innerWidth - textState.startX - 4;
        textState.text = this.wrapLocalizedText(textState.text, maxWidth);
    };

    //-------------------------------------------------------------------------
    // バトルログ
    //   イベント内スクリプトやプラグインが直接 addText した日本語を訳す
    //-------------------------------------------------------------------------
    const _Window_BattleLog_addText = Window_BattleLog.prototype.addText;
    Window_BattleLog.prototype.addText = function(text) {
        const args = Array.prototype.slice.call(arguments);
        args[0] = translate(text);
        _Window_BattleLog_addText.apply(this, args);
    };

    //-------------------------------------------------------------------------
    // 描画の保険＋訳漏れ検出
    //   原文言語以外で、かな・漢字を含む文字列が描画されようとしたら辞書で訳す。
    //   （サードパーティ製プラグインのパラメータ文字列など）
    //   訳せなかった場合はテストプレイ時に「訳漏れ」としてログに出る。
    //-------------------------------------------------------------------------
    const _Bitmap_drawText = Bitmap.prototype.drawText;
    Bitmap.prototype.drawText = function(text) {
        if (currentLang !== SOURCE_LANG && typeof text === "string" && JP_PATTERN.test(text)) {
            const args = Array.prototype.slice.call(arguments);
            // 文章ウィンドウは1文字ずつ描画するため、1〜2文字の断片は記録しない
            // （断片が出る場合は、文章単位の訳漏れが別途ログに出ている）
            args[0] = translate(text, text.length <= 2);
            return _Bitmap_drawText.apply(this, args);
        }
        return _Bitmap_drawText.apply(this, arguments);
    };

    //-------------------------------------------------------------------------
    // 言語別フォント
    //   指定言語ではメインフォントの先頭に言語用フォントを置く。
    //   言語用フォントに無い字形（→ など）は元のメインフォントで表示される。
    //-------------------------------------------------------------------------
    function fontFamilyOf(code) {
        return "cres-loc-font-" + code;
    }

    const _Scene_Boot_loadGameFonts = Scene_Boot.prototype.loadGameFonts;
    Scene_Boot.prototype.loadGameFonts = function() {
        _Scene_Boot_loadGameFonts.apply(this, arguments);
        for (const code of Object.keys(LANGUAGE_FONTS)) {
            if (hasLanguage(code)) FontManager.load(fontFamilyOf(code), LANGUAGE_FONTS[code]);
        }
    };

    const _Game_System_mainFontFace = Game_System.prototype.mainFontFace;
    Game_System.prototype.mainFontFace = function() {
        const base = _Game_System_mainFontFace.apply(this, arguments);
        return LANGUAGE_FONTS[currentLang] ? fontFamilyOf(currentLang) + ", " + base : base;
    };

    //-------------------------------------------------------------------------
    // 言語別画像
    //   原文言語以外で、登録された画像に「_言語コード」付きのファイルがあれば差し替える。
    //   ファイルが無ければ元の画像のまま（NW.jsはfs、ブラウザはHEADで存在確認。暗号化後の .png_ にも対応）
    //-------------------------------------------------------------------------
    const imageExistsCache = {};
    function localizedImageExists(folder, filename) {
        const url = folder + Utils.encodeURI(filename) + ".png";
        if (imageExistsCache[url] !== undefined) return imageExistsCache[url];
        let exists = false;
        if (!Utils.isNwjs()) {
            // ブラウザ実行時は同期HEADリクエストで確認（対象は登録画像のみ・結果はキャッシュ）
            try {
                const xhr = new XMLHttpRequest();
                xhr.open("HEAD", url + (Utils.hasEncryptedImages() ? "_" : ""), false);
                xhr.send();
                exists = xhr.status >= 200 && xhr.status < 300;
            } catch (e) {
                exists = false;
            }
        } else {
            try {
                const fs = require("fs");
                const path = require("path");
                const base = path.dirname(process.mainModule.filename);
                const file = path.join(base, folder, filename + ".png");
                exists = fs.existsSync(file) || fs.existsSync(file + "_");
            } catch (e) {
                exists = false;
            }
        }
        imageExistsCache[url] = exists;
        return exists;
    }

    const _ImageManager_loadBitmap = ImageManager.loadBitmap;
    ImageManager.loadBitmap = function(folder, filename) {
        if (currentLang !== SOURCE_LANG && filename && LOCALIZED_IMAGES.size > 0) {
            const key = String(folder).replace(/^img\//, "") + filename;
            if (LOCALIZED_IMAGES.has(key)) {
                const localized = filename + "_" + currentLang;
                if (localizedImageExists(folder, localized)) {
                    return _ImageManager_loadBitmap.call(this, folder, localized);
                }
            }
        }
        return _ImageManager_loadBitmap.apply(this, arguments);
    };

})();
