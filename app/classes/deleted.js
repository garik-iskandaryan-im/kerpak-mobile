'use strict';

class Deleted {

    /**
     * Return an object of destroyed records count
     * @param {*} count
     */
    constructor(count, object) {
        this.success = (count === 0 ? false : true);
        this.count = count;
        this.object = object;
    }
}

module.exports = Deleted;