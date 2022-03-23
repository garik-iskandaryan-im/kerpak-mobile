const Umzug = require('umzug');

class DBMigration {
    constructor(sequelize, log) {
        this.sequelize = sequelize;
        this.log = log;
        this.umzug = new Umzug({
            storage: 'sequelize',
            storageOptions: {
                sequelize: sequelize,
            },

            migrations: {
                params: [
                    sequelize.getQueryInterface(),
                    sequelize.constructor,
                    log
                ],
                path: 'app/migrations',
                pattern: /^\d+(.*)\.js$/
            },

        });
        this.umzug.on('migrating', this.logEvent('migrating'));
        this.umzug.on('migrated', this.logEvent('migrated'));
        this.umzug.on('reverting', this.logEvent('reverting'));
        this.umzug.on('reverted', this.logEvent('reverted'));
    }

    logEvent(eventName) {
        return (name) => {
            // this.log.debug(`${name} ${eventName}`);
        };
    }

    async migrate() {
        const pendingMigrations = await this.umzug.pending();
        const sortedMigrations = pendingMigrations.map(pendingMigration => pendingMigration.file).sort();
        return this.umzug.up(sortedMigrations);
    }

    reset() {
        //revert all migrations
        return this.umzug.down({to: 0});
    }
}

module.exports = DBMigration;
