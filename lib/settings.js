// ============================================
//   lib/settings.js - SHAVIYA-XMD V3
//   UNIFIED SETTINGS SYSTEM
//   Priority: settings.json > .env > default
//   All runtime changes auto-save to JSON
//   Survives restarts ✅
// ============================================

'use strict';

const fs   = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

// ── Ensure data folder exists ────────────────
if (!fs.existsSync(path.dirname(SETTINGS_FILE))) {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
}

// ── Helper: read env bool ────────────────────
function envBool(key, fallback = false) {
    const v = process.env[key];
    if (v === undefined || v === '') return fallback;
    return v === 'true' || v === '1';
}

function envStr(key, fallback = '') {
    return process.env[key] || fallback;
}

// ── Default values ───────────────────────────
//    Order: env vars used as defaults so
//    existing .env configs still work on first boot
const DEFAULTS = {
    // ── Bot behaviour ──
    mode:            envStr('MODE', 'public'),
    prefix:          envStr('PREFIX', '.'),

    // ── Automation ──
    autoVoice:       envBool('AUTO_VOICE'),
    autoAI:          envBool('AUTO_AI'),
    autoTyping:      envBool('ALWAYS_TYPING'),
    autoRecording:   envBool('ALWAYS_RECORDING'),
    alwaysOnline:    envBool('ALWAYS_ONLINE'),
    autoReadStatus:  envBool('AUTO_READ_STATUS'),
    autoReadCmd:     envBool('AUTO_READ_CMD'),

    // ── Security ──
    antiLink:        envBool('ANTILINK'),
    antiBot:         envBool('ANTI_BOT'),
    antidelete:      envBool('ANTI_DELETE'),
    antiBadWords:    envBool('ANTI_BAD_WORDS_ENABLED'),
    badWordList:     envStr('ANTI_BAD_WORDS', '').split(',').filter(Boolean),

    // ── UI ──
    button:          false,
    buttonStyle:     'default',
    footer:          'Powered By SHAVIYA-XMD V3 💎',
    thumb:           '',
    fname:           '',
    moviedoc:        false,

    // ── Users ──
    premiumUsers:    [],
    sudoUsers:       [],
    bannedUsers:     [],
    allowedGroups:   [],

    // ── Meta ──
    lastUpdated:     Date.now(),
};

// ── In-memory cache ──────────────────────────
let _cache = null;

function loadSettings() {
    if (_cache) return _cache;
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const raw  = fs.readFileSync(SETTINGS_FILE, 'utf8');
            const data = JSON.parse(raw);
            // Merge: defaults first, then saved values override
            _cache = { ...DEFAULTS, ...data };
            return _cache;
        }
    } catch (e) {
        console.log('[SETTINGS] Load error:', e.message);
    }
    _cache = { ...DEFAULTS };
    return _cache;
}

function saveSettings(settings) {
    try {
        settings.lastUpdated = Date.now();
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        _cache = settings; // update cache
        return true;
    } catch (e) {
        console.log('[SETTINGS] Save error:', e.message);
        return false;
    }
}

function getSetting(key) {
    return loadSettings()[key];
}

function setSetting(key, value) {
    const settings  = loadSettings();
    settings[key]   = value;
    return saveSettings(settings);
}

// ── Bulk set multiple keys at once ───────────
function setSettings(obj) {
    const settings = loadSettings();
    Object.assign(settings, obj);
    return saveSettings(settings);
}

// ── Reset a key back to its default ──────────
function resetSetting(key) {
    return setSetting(key, DEFAULTS[key]);
}

// ── Reset ALL to defaults ─────────────────────
function resetAllSettings() {
    _cache = null;
    return saveSettings({ ...DEFAULTS });
}

// ── Force reload from disk (cache bust) ───────
function reloadSettings() {
    _cache = null;
    return loadSettings();
}

// ── Get all settings as plain object ──────────
function getAllSettings() {
    return { ...loadSettings() };
}

// ── Config bridge ─────────────────────────────
//    Use this instead of require('../config')
//    for dynamic settings so plugins always get
//    the latest saved value, not the startup value
function getConfig(key) {
    // Dynamic keys → check settings.json first
    const dynamicKeys = {
        AUTO_VOICE:            'autoVoice',
        ALWAYS_TYPING:         'autoTyping',
        ALWAYS_RECORDING:      'autoRecording',
        ALWAYS_ONLINE:         'alwaysOnline',
        AUTO_READ_STATUS:      'autoReadStatus',
        AUTO_READ_CMD:         'autoReadCmd',
        AUTO_AI:               'autoAI',
        ANTILINK:              'antiLink',
        ANTI_BOT:              'antiBot',
        ANTI_DELETE:           'antidelete',
        ANTI_BAD_WORDS_ENABLED:'antiBadWords',
        MODE:                  'mode',
        PREFIX:                'prefix',
    };

    if (dynamicKeys[key] !== undefined) {
        return getSetting(dynamicKeys[key]);
    }

    // Static keys → use config.js directly
    const config = require('../config');
    return config[key];
}

module.exports = {
    loadSettings,
    saveSettings,
    getSetting,
    setSetting,
    setSettings,
    resetSetting,
    resetAllSettings,
    reloadSettings,
    getAllSettings,
    getConfig,
    DEFAULTS,
};
