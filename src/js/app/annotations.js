import {getTime} from './timestamps'
import {getPlayer} from './player/player'

var segmentStartTime = -1;

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
    insertInSegment(ratingNode, 1);
};

function insertDescription() {
    var descripNode = getDescriptionElement();
    insertInSegment(descripNode, 2);
};

function markRedundant() {
    var redundantNode = getRedundantElement();
    insertInSegment(redundantNode, 0);
};

function markTimestamp(markString) {
    if(markString == "begin") {
        segmentStartTime = getTime().raw
    }
    var timestampNode = getTimestampElement(markString);
    insertInSegment(timestampNode, 0);
};

function skipToSegmentStart() {
    if(segmentStartTime != -1) {
        var player = getPlayer();
        player.skipTo(segmentStartTime);
    }
};

function insertInSegment(segmentNode, cursorOffset) {
    var node = getSelectedImmediateChildNode();
    if(node && node.id == "segment") {
        var childNodes = node.childNodes;
        // Remove <p><br></p> node
        if(!childNodes[1].id) node.replaceChild(segmentNode, childNodes[1]);
        insertAfter(childNodes[childNodes.length - 2], segmentNode);
        var segmentText = segmentNode.childNodes[0];
        setCursor(segmentText, segmentText.length - cursorOffset);
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
        // If textbox div has no children create a dummy child
        if(node && node.id && node.id == "textbox") {
            var dummyChild = document.createElement('p');
            node.appendChild(dummyChild);
            node = dummyChild;
        } else {
            while(node && node.parentElement.id != "textbox") {
                node = node.parentNode;
            }
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
    rating.innerHTML = '&nbsp&nbsp&nbsp&nbsp"rating":&nbsp,';
    return rating;
};

function getDescriptionElement() {
    const description = document.createElement('p');
    description.setAttribute('id', 'description');
    description.innerHTML = '&nbsp&nbsp&nbsp&nbsp"description":&nbsp"",';
    return description;
};

function getRedundantElement() {
    const redundant = document.createElement('p');
    redundant.setAttribute('id', 'repetitive');
    redundant.innerHTML = '&nbsp&nbsp&nbsp&nbsp"repetitive": true,';
    return redundant;
};

function getTimestampElement(markString) {
    const timestamp = document.createElement('p');
    timestamp.setAttribute('id', 'timestamp');
    var time = getTime();
    timestamp.innerHTML = '&nbsp&nbsp&nbsp&nbsp"' + markString + '": "' + time.formatted + '",';
    return timestamp;
};

function isValidRating(rating) {
    return (rating == -2 || rating == -1 || rating == 1 || rating == 2 || rating == 3);
};

function splitTimestamp(timestamp) {
    var timestampSplit = timestamp.split(":");
    return {
        hours: parseInt(timestampSplit[0]),
        minutes: parseInt(timestampSplit[1]),
        seconds: parseInt(timestampSplit[2])
    }
};

function isValidTimestamp(timestamp) {
    return /^\d{1,2}:[0-5][0-9]:[0-5][0-9]$/.test(timestamp);
};


function isValidBeginEnd(begin, end) {
    if(!(isValidTimestamp(begin) && isValidTimestamp(end))) {
        return false;
    }
    var beginParts = splitTimestamp(begin);
    var endParts = splitTimestamp(end);

    if(endParts.hours < beginParts.hours) {
        return false;
    } else if(endParts.hours > beginParts.hours) {
        return true;
    }

    if(endParts.minutes < beginParts.minutes) {
        return false;
    } else if(endParts.minutes > beginParts.minutes) {
        return true;
    }

    if(endParts.seconds <= beginParts.seconds) {
        return false;
    }

    return true;
};

function parseJSON(JSONString) {
    var JSONObj;
    var returnObj = {status: true, error: "", obj: null};
    try {
        JSONObj = JSON.parse(JSONString);
    } catch(err) {
        returnObj.status = false;
        returnObj.error = "Invalid JSON.";
        return returnObj;
    }

    var errorString = "Invalid Segment.\n";
    try {
        for(var i = 0; i < JSONObj.length; i++) {
            var segment = JSONObj[i];
            if(!("begin" in segment)) {
                errorString += "'begin' key not found in: \n";
                throw segment;
            }
            if(!("end" in segment)) {
                errorString += "'end' key not found in: \n";
                throw segment;
            }
            if(!("rating" in segment)) {
                errorString += "'rating' key not found in: \n";
                throw segment;
            }
            if(!("description" in segment)) {
                errorString += "'description' key not found in: \n";
                throw segment;
            }

            if(!isValidBeginEnd(segment.begin, segment.end)) {
                errorString += "Invalid 'begin' or 'end' value in: \n";
                throw segment;
            }

            if(!isValidRating(segment.rating)) {
                errorString += "Invalid 'rating' value in: \n";
                throw segment;
            }

            if(typeof segment.description != "string") {
                errorString += "Invalid 'description' value in: \n";
                throw segment;
            }

            if("repetitive" in segment && segment.repetitive != true) {
                errorString += "Invalid 'repetitive' value in: \n";
                throw segment;
            }
        }
    } catch(segment) {
        returnObj.status = false;
        var segmentString = JSON.stringify(segment).replace(/,/g, ",\n");
        returnObj.error = errorString + segmentString;
    }

    returnObj.obj = JSONObj;
    return returnObj;
};

export {insertSegment, insertRating, insertDescription, markRedundant, markTimestamp, skipToSegmentStart, parseJSON};
