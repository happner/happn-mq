const hyperid = require('happner-hyperid').create({
    urlSafe: true
});

module.exports = (function UpsertBuilder() {

    const result = {

        withPath: (path) => {
            result.path = path;
            return result;
        },
        withData: (data) => {
            result.data = data;
            return result;
        },
        withOptions: (options) => {
            result.options = options;
            return result;
        },
        withFindByPathFunc: (findByPathFunc) => {
            result.findByPathFunc = findByPathFunc;
            return result;
        },
        build: async () => {

            result.options.upsert = true;

            result.__clearDataMeta();
            result.__handleSibling();
            result.__formatSetData();
            result.__handleTag();
            await result.__handleMerge();

            let setParams = {
                $set: {
                    data: result.setData.data,
                    _id: result.path,
                    path: result.path,
                    modifiedBy: result.options.modifiedBy,
                    _tag: result.setData._tag
                }
            };

            let x = {
                setParams: setParams,
                // clonedParams: clonedParams,
                path: result.path,
                data: result.data,
                options: result.options,
                setData: result.setData
            };

            result.__clear();
            return x;
        },
        __clearDataMeta: () => {
            if (result.data)
                delete result.data._meta;
        },
        __handleSibling: () => {

            if (result.options.set_type === 'sibling') {

                //appends an item with a path that matches the message path - but made unique by a shortid at the end of the path
                if (result.path.indexOf('/') !== (result.path.length - 1))
                    result.path += '/';

                result.path += hyperid();
            }
        },
        __formatSetData: () => {

            if (typeof result.data !== 'object' || result.data instanceof Array === true ||
                result.data instanceof Date === true || result.data == null)
                result.data = {
                    value: result.data
                };

            result.setData = {
                data: result.data,
                _meta: {
                    path: result.path
                }
            };

            if (result.options && result.options.modifiedBy)
                result.setData._meta.modifiedBy = result.options.modifiedBy;
            else
                result.setData._meta.path = result.path;
        },
        __handleTag: () => {
            // tags
            if (result.options.tag) {
                if (result.data != null)
                    throw new Error('Cannot set tag with new data.');

                result.setData.data = {};
                result.options.merge = true;
            }
        },
        __handleMerge: async () => {
            // merge
            if (result.options.merge) {

                // console.log('---->>> RESULT: ', result.findByPathFunc);

                let existing = await result.findByPathFunc(result.path, null);

                if (!existing)
                    result.options.upsertType = 2; //just inserting
                else {

                    for (var propertyName in existing.data)
                        if (result.setData.data[propertyName] == null)
                            result.setData.data[propertyName] = existing.data[propertyName];

                    result.setData.created = existing.created;
                    result.setData.modified = Date.now();
                    result.setData._id = existing._id;

                    result.options.updateType = 1; //updating
                }
            }
        },
        __handleIncrement: () => {
            // TODO: implement this...
        },
        __clear: () => {
            result.path = null;
            result.data = null;
            result.options = null;
            result.findByPathFunc = null;
            result.setData = null;
        }
    }

    return result;

}())