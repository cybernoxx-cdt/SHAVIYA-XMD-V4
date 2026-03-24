const Sequelize = require('sequelize');

class DatabaseManager {
    static instance = null;

    static getInstance() {
        if (!DatabaseManager.instance) {
            const DATABASE_URL = process.env.DATABASE_URL || './database.db';

            DatabaseManager.instance =
                DATABASE_URL === './database.db'
                    ? new Sequelize({
                            dialect: 'sqlite',
                            storage: DATABASE_URL,
                            logging: false,
                            dialectOptions: {
                                // WAL mode prevents SQLITE_BUSY on concurrent access
                                mode: require('fs').constants ? undefined : undefined,
                            },
                            pool: {
                                max: 1,
                                min: 0,
                                acquire: 30000,
                                idle: 10000,
                            },
                      })
                    : new Sequelize(DATABASE_URL, {
                            dialect: 'postgres',
                            ssl: true,
                            protocol: 'postgres',
                            dialectOptions: {
                                native: true,
                                ssl: { require: true, rejectUnauthorized: false },
                            },
                            logging: false,
                      });
        }
        return DatabaseManager.instance;
    }
}

const DATABASE = DatabaseManager.getInstance();

// Enable WAL mode to prevent SQLITE_BUSY on Heroku restarts
DATABASE.query('PRAGMA journal_mode=WAL;').catch(() => {});
DATABASE.query('PRAGMA busy_timeout=5000;').catch(() => {});

DATABASE.sync()
    .then(() => {
        console.log('🛢️ Database synchronized successfully ✅');
    })
    .catch((error) => {
        console.error('Error synchronizing the database:', error);
    });

module.exports = { DATABASE };

// jawadtechx
