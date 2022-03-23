const models = require('../models/models');

module.exports = {
    async up(queryInterface, Sequelize) {
        let categoriesWithDefaultName = [];
 
        const SPs = await models.serviceProviders.findAll({raw: true });
        for (let j in SPs) {
            const categories = await models.categories.findAll({ where: { serviceProviderId: SPs[j].id }, raw: true });
            for (let i in categories) {
                if (categories[i].name && ['Appetizers','Breakfast','Desserts','Drinks', 'Lunch','Main Dishes','Salads','Sandwiches and wraps','Sides','Snacks','Soups', 'Sweets','Baked goods','Pies','Other'].indexOf(categories[i].name) !== -1) {
                    categoriesWithDefaultName.push(categories[i]);
                }
            }
        }

        let requiredChanges = [];
        let transferToBeDefault = [];
        for (k in categoriesWithDefaultName) {
            const defCategory = await models.defaultCategories.findOne({ where: { name: categoriesWithDefaultName[k].name }, raw: true });
            const spCreatedCategory = await models.categories.findAll({ where: {
                serviceProviderId: categoriesWithDefaultName[k].serviceProviderId,
                defaultCategoriesId: defCategory.id
            }, raw: true });
            if (spCreatedCategory.length) {
                requiredChanges.push({from: categoriesWithDefaultName[k].id, to: spCreatedCategory[0].id, remove: categoriesWithDefaultName[k].id})
            } else {
                transferToBeDefault.push({id: categoriesWithDefaultName[k].id, to: defCategory.id});
            }
        }
        
        for (let y in transferToBeDefault) {
            let obj = {
                name: null,
                isDefaultCategory: true,
                defaultCategoriesId: transferToBeDefault[y].to
            };
            await models.categories.update(obj, { where: { id: transferToBeDefault[y].id } });
        }

        for (let t in requiredChanges) {
            await models.menuCategories.update({categoriesId: requiredChanges[t].to}, { where: { categoriesId: requiredChanges[t].from } });
            await models.menuItems.update({categoriesId: requiredChanges[t].to}, { where: { categoriesId: requiredChanges[t].from, archived: false } });
            await models.categories.destroy({ where: { id: requiredChanges[t].from } });
        }
        

        let repetedCategories = [];
        let repetedCategories1 = [];
        let uniqueIDs = [];
        let uniqueIDs1 = [];
        for (let h in SPs) {
            const categories = await models.categories.findAll({ where: { serviceProviderId: SPs[h].id }, raw: true });
            for (let h in categories) {
                if (categories[h].isDefaultCategory) {
                    let filters = categories.filter((item)=>(item.defaultCategoriesId === categories[h].defaultCategoriesId));
                    if (filters.length > 1) {
                        filters = filters.sort((a, b) => (a.id > b.id) ? 1 : -1);
                        if (uniqueIDs.indexOf(filters[0].id) === -1) {
                            uniqueIDs.push(filters[0].id)
                            repetedCategories.push({id: filters[0].id, items: JSON.parse(JSON.stringify(filters))}); 
                        }
                    }
                } else if (['Appetizers','Breakfast','Desserts','Drinks', 'Lunch','Main Dishes','Salads','Sandwiches and wraps','Sides','Snacks','Soups', 'Sweets','Baked goods','Pies','Other'].indexOf(categories[h].name) === -1) {
                    let filters = categories.filter((item)=>(item.name === categories[h].name));
                    if (filters.length > 1) {
                        filters = filters.sort((a, b) => (a.id > b.id) ? 1 : -1);
                        if (uniqueIDs1.indexOf(filters[0].id) === -1) {
                            uniqueIDs1.push(filters[0].id)
                            repetedCategories1.push({id: filters[0].id, items: JSON.parse(JSON.stringify(filters))}); 
                        }
                    }
                }
            }
        }

        for (let i in repetedCategories) {
            let obj = repetedCategories[i];
            for (let j in obj.items) {
                let item = obj.items[j]; 
                if (obj.id !== item.id) {
                    await models.menuCategories.update({categoriesId: obj.id}, { where: { categoriesId: item.id } });
                    await models.menuItems.update({categoriesId: obj.id}, { where: { categoriesId: item.id, archived: false } });
                    await models.categories.destroy({ where: { id: item.id } });
                }
            }
        }
        for (let i in repetedCategories1) {
            let obj = repetedCategories1[i];
            for (let j in obj.items) {
                let item = obj.items[j]; 
                if (obj.id !== item.id) {
                    await models.menuCategories.update({categoriesId: obj.id}, { where: { categoriesId: item.id } });
                    await models.menuItems.update({categoriesId: obj.id}, { where: { categoriesId: item.id, archived: false } });
                    await models.categories.destroy({ where: { id: item.id } });
                }
            }
        }

        return false;
    },
    down: async (queryInterface) => {
        // N/A
    }
};