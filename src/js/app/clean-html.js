const sanitizeHtml = require('sanitize-html');

export function cleanHTML(dirty) {
    return sanitizeHtml(dirty, {
        allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'p', 'span' ],
        transformTags: {
            'div': sanitizeHtml.simpleTransform('p'),
        },
        allowedAttributes: {
            'span': [ 'class', 'data-timestamp', 'contentEditable' ]
        }
    });
};
