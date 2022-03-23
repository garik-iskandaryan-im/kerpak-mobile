'use strict';

class API {

    /**
     * Return an api object
     * @param {*} mountPath
     * @param {*} route
     */
    constructor(mountPath, route) {
        this.url = route.path;
        this.methods = this._getRouteMethods(route.stack);
    }

    /**
     * Get all route methods from the route
     * @param {*} stack
     */
    _getRouteMethods(stack) {
        let methods = [];

        Object.keys(stack).forEach(function(el, key) {
            if(stack[key].method !== undefined) {
                methods.push(stack[key].method);
            }
        });

        return methods;
    }
}

module.exports = API;