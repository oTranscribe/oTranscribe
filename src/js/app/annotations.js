import {getTime} from './timestamps'

function insertSegment() {
    var node = getSelectedImmediateChildNode();
    if(node) {
        var segmentNode = getSegmentElement();
        insertAfter(node, segmentNode);
        setCursor(segmentNode, 1);
    }
};

function insertRating() {
    var ratingNode = getRatingElement();
    insertInSegment(ratingNode);
};

function insertDescription() {
    var descripNode = getDescriptionElement();
    insertInSegment(descripNode);
};

function markRedundant() {
    var redundantNode = getRedundantElement();
    insertInSegment(redundantNode);
};

function markTimestamp(markString) {
    var timestampNode = getTimestampElement(markString);
    insertInSegment(timestampNode);
};

function insertInSegment(segmentNode) {
    var node = getSelectedImmediateChildNode();
    if(node && node.id == "segment") {
        var childNodes = node.childNodes;
        // Remove <p><br></p> node
        if(!childNodes[1].id) node.replaceChild(segmentNode, childNodes[1]);
        insertAfter(childNodes[childNodes.length - 2], segmentNode);
        setCursor(segmentNode, 1);
    }
};

function setCursor(node, pos) {
    var sel = window.getSelection();
    var range = document.createRange();
    range.setStart(node, pos);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
};

function insertAfter(currNode, nextNode) {
    currNode.parentNode.insertBefore(nextNode, currNode.nextSibling);
};

function getSelectedImmediateChildNode() {
    var sel, node = null;
    if (window.getSelection && (sel = window.getSelection()).rangeCount) {
        node = sel.anchorNode;
        while(node && node.parentElement.id != "textbox") {
            node = node.parentNode;
        }
    }
    return node;
};

function getSegmentElement() {
    const segment = document.createElement('span');
    segment.setAttribute('id', 'segment');
    segment.innerHTML = '<p>{</p>';
    segment.innerHTML += '<p><br></p>';
    segment.innerHTML += '<p>}</p>';
    return segment;
};

function getRatingElement() {
    const rating = document.createElement('p');
    rating.setAttribute('id', 'rating');
    rating.innerHTML = '&nbsp&nbsp&nbsp&nbsp"rating":&nbsp';
    return rating;
};

function getDescriptionElement() {
    const description = document.createElement('p');
    description.setAttribute('id', 'description');
    description.innerHTML = '&nbsp&nbsp&nbsp&nbsp"description":&nbsp';
    return description;
};

function getRedundantElement() {
    const redundant = document.createElement('p');
    redundant.setAttribute('id', 'redundant');
    redundant.innerHTML = '&nbsp&nbsp&nbsp&nbsp"redundant": true';
    return redundant;
};

function getTimestampElement(markString) {
    const timestamp = document.createElement('p');
    timestamp.setAttribute('id', 'timestamp');
    var time = getTime();
    timestamp.innerHTML = '&nbsp&nbsp&nbsp&nbsp"' + markString + '": "' + time.formatted + '"';
    return timestamp;
};

export {insertSegment, insertRating, insertDescription, markRedundant, markTimestamp};
