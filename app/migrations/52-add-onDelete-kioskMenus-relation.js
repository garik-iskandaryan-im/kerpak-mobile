module.exports = {
    up: async (queryInterface) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeColumn('kiosks', 'archived', { transaction });
            // add on delete cascade in menuCategories relation
            await queryInterface.removeConstraint(
                'menu_categories',
                'menu_categories_ibfk_3',
                { transaction }
            );
            await queryInterface.addConstraint('menu_categories', {
                type: 'foreign key',
                name: 'menu_categories_ibfk_3',
                references: {
                    table: 'menus',
                    field: 'id',
                },
                fields: ['menu_id'],
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
                transaction
            });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn(
                'kiosks',
                'archived',
                {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false
                },
                { transaction }
            );
            await queryInterface.removeConstraint(
                'menu_categories',
                'menu_categories_ibfk_3',
                { transaction }
            );
            await queryInterface.addConstraint('menu_categories', {
                type: 'foreign key',
                name: 'menu_categories_ibfk_3',
                references: {
                    table: 'menus',
                    field: 'id',
                },
                fields: ['menu_id'],
                transaction
            });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};