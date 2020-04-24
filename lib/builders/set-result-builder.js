module.exports = (function SetResultBuilder() {

    const result = {

        // closures

        withId: (id) => {
            result.id = id;
            return result;
        },

        withSession: (session) => {
            result.session = session;
            return result;
        },

        withRequest: (request) => {
            result.request = request;
            return result;
        },

        withResponseData: (responseData) => {
            result.responseData = responseData;
            return result;
        },

        withResponseMeta: (responseMeta) => {
            result.responseMeta = responseMeta;
            return result;
        },

        build: () => {
            let x = {
                id: result.id,
                session: result.session,
                request: result.request,
                response: {
                    data: result.responseData
                }
            }

            result.__clear();
            return x;
        },

        __clear: () => {
            result.id = null;
            result.session = null;
            result.request = null;
            result.response = null;
        }
    }

    return result;

})();