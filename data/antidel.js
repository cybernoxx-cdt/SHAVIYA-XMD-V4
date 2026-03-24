const { DATABASE } = require('../lib/database');
const { DataTypes } = require('sequelize');
const config = require('../config');

const AntiDelDB = DATABASE.define('AntiDelete', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: false,
        defaultValue: 1,
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: config.ANTI_DELETE || false,
    },
}, {
    tableName: 'antidelete',
    timestamps: false,
    hooks: {
        beforeCreate: record => { record.id = 1; },
        beforeBulkCreate: records => { records.forEach(record => { record.id = 1; }); },
    },
});

let isInitialized = false;
let initPromise = null;

// Retry helper for SQLITE_BUSY errors
async function retryOnBusy(fn, retries = 5, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            const isBusy = err.code === 'SQLITE_BUSY' ||
                (err.original && err.original.code === 'SQLITE_BUSY') ||
                (err.parent && err.parent.code === 'SQLITE_BUSY');
            if (isBusy && i < retries - 1) {
                await new Promise(res => setTimeout(res, delay * (i + 1)));
            } else {
                throw err;
            }
        }
    }
}

async function initializeAntiDeleteSettings() {
    if (isInitialized) return;
    // Prevent multiple concurrent inits
    if (initPromise) return initPromise;
    initPromise = _doInit();
    return initPromise;
}

async function _doInit() {
    try {
        // Sync table with retry in case DB is locked on startup
        await retryOnBusy(() => AntiDelDB.sync());

        // Check if old schema exists
        const tableInfo = await retryOnBusy(() =>
            DATABASE.getQueryInterface().describeTable('antidelete')
        );

        if (tableInfo.gc_status) {
            // Migrate from old schema to new schema
            const oldRecord = await DATABASE.query('SELECT * FROM antidelete WHERE id = 1', { type: DATABASE.QueryTypes.SELECT });
            if (oldRecord && oldRecord.length > 0) {
                const newStatus = oldRecord[0].gc_status || oldRecord[0].dm_status;
                await DATABASE.query('DROP TABLE antidelete');
                await retryOnBusy(() => AntiDelDB.sync());
                await retryOnBusy(() => AntiDelDB.create({ id: 1, status: newStatus }));
            }
        } else {
            // Create new record if doesn't exist, with retry
            await retryOnBusy(() => AntiDelDB.findOrCreate({
                where: { id: 1 },
                defaults: { status: config.ANTI_DELETE || false },
            }));
        }
        isInitialized = true;
    } catch (error) {
        console.error('Error initializing anti-delete settings:', error);
        initPromise = null; // allow retry next call
        // If table doesn't exist at all, create it
        if (error.original && error.original.code === 'SQLITE_ERROR' && error.original.message.includes('no such table')) {
            try {
                await retryOnBusy(() => AntiDelDB.sync());
                await retryOnBusy(() => AntiDelDB.create({ id: 1, status: config.ANTI_DELETE || false }));
                isInitialized = true;
            } catch (e) {
                console.error('Anti-delete fallback init failed:', e.message);
            }
        }
    }
}

async function setAnti(status) {
    try {
        await initializeAntiDeleteSettings();
        const [affectedRows] = await AntiDelDB.update({ status }, { where: { id: 1 } });
        return affectedRows > 0;
    } catch (error) {
        console.error('Error setting anti-delete status:', error);
        return false;
    }
}

async function getAnti() {
    try {
        await initializeAntiDeleteSettings();
        const record = await AntiDelDB.findByPk(1);
        return record ? record.status : (config.ANTI_DELETE || false);
    } catch (error) {
        console.error('Error getting anti-delete status:', error);
        return config.ANTI_DELETE || false;
    }
}

module.exports = {
    AntiDelDB,
    initializeAntiDeleteSettings,
    setAnti,
    getAnti,
};
