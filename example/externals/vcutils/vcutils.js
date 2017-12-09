
function hasValue (value) {
    if (typeof (value) === 'undefined') {
        return false;
    }
    if (value === null) {
        return false;
    }
    return true;
}

function hasValueIsArray (obj, allowZeroLength) {
    if (!hasValue(obj)) {
        return false;
    }
    if (!Array.isArray(obj)) {
        return false;
    }
    if (typeof (allowZeroLength) !== 'boolean') {
        allowZeroLength = true;
    }
    if (!allowZeroLength) {
        if (obj.length === 0) {
            return false;
        }
    }
    return true;
}

function hasValueIsNonZeroLengthArray (obj) {
    return hasValueIsArray(obj, false);
}

function hasValueIsNonEmptyObject (obj) {
    if (!hasValue(obj) || typeof obj !== 'object') {
        return false;
    }

    return hasValueIsNonZeroLengthArray(Object.keys(obj));
}

function stringContains (fullstring, substring) {
    if (!hasValue(fullstring)) {
        return false;
    }

    if (fullstring.search(substring) === -1) {
        return false;
    }

    return true;
}

function isValidEmailAddress (email) {
    if (!hasValue(email) || (typeof (email) !== 'string')) {
        return false;
    }
    var filter = /^([\w-.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
    return filter.test(email);
}

function isValidEmailAddressList (emailList) {
    if ((emailList === null) || (typeof (emailList) !== 'string')) {
        return false;
    }
    if (emailList.trim().length === 0) {
        return false;
    }
    try {
        var list = emailList.split(/[ ,]+/);
        for (var i = 0; i < list.length; i++) {
            if (!isValidEmailAddress(list[i]))	    		{
                return false;
            }
        }
    } catch (exception) {
        console.log(exception);
        return false;
    }
    return true;
}

function isValidId (id) {
    if ((id === null) || (typeof (id) === 'undefined') || isNaN(id)) {
        return false;
    }
    if (typeof (id) === 'number') {
        if (id < 1) {
            return false;
        }
        return true;
    }
    if (typeof (id) === 'string') {
        var nid = parseInt(id, 10);
        if (isNaN(nid)) {
            return false;
        }
        return isValidId(nid);
    }
    return false;
}

function caseInsensitiveEqual (a, b) {
    if (!hasValue(a) && !hasValue(b)) {
        return true;
    }
    if (!hasValue(a) || !hasValue(b)) {
        return false;
    }
    if (a.toLowerCase() === b.toLowerCase()) {
        return true;
    }
    return false;
}

// ////////////////////////////////////////////
//
//  is true
//
function isTrue (obj) {
    if ((typeof (obj) === 'boolean') && (obj !== null)) {
        if (obj === true) {
            return true;
        }
    }
    return false;
}

// ////////////////////////////////////////////
//
//  is false
//
function isFalse (obj) {
    if ((typeof (obj) === 'boolean') && (obj !== null)) {
        if (obj === false) {
            return true;
        }
    }
    return false;
}

// ////////////////////////////////////////////
//
//  is a string
//
function isString (obj) {
    if ((typeof (obj) === 'string') && (obj !== null)) {
        return true;
    }
    return false;
}

// ////////////////////////////////////////////
//
//  does array have the string defined
//
function arrayHasString (arr, str) {
    if ((typeof (arr) === 'undefined') || (typeof (str) !== 'string')) {
        return false;
    }
    if (arr.constructor === Array) {
        for (var i = 0; i < arr.length; i++) {
            if (typeof (arr[i]) === 'string') {
                if (arr[i].trim().toLowerCase() === str.trim().toLowerCase()) {
                    return true;
                }
            }
        }
    }
    return false;
}

function arrayContains (a, obj) {
    if (typeof (a) === 'undefined' || a === null || a.constructor !== Array) {
        return false;
    }
    for (var i = 0; i < a.length; i++) {
        if (a[i] === obj) {
            return true;
        }
    }
    return false;
}

function isDeepEquivalent (x, y) {
    // If both are function
    if (x instanceof Function) {
        if (y instanceof Function) {
            return x.toString() === y.toString();
        }
        return false;
    }
    if (!x || !y) {
        if (isNaN(x) && isNaN(y))    		{
            return true;
        }
        return x === y;
    }
    if (x === y || x.valueOf() === y.valueOf()) {
        return true;
    }

    // {} !== [] case
    if (Array.isArray(x) !== Array.isArray(y))    	{
        return false;
    }

    // If one of them is date, they must had equal valueOf
    if (x instanceof Date) {
        return false;
    }
    if (y instanceof Date) {
        return false;
    }

    // If they are not function or strictly equal, they both need to be Objects
    if (!(x instanceof Object)) {
        return false;
    }
    if (!(y instanceof Object)) {
        return false;
    }

    // Both objects must have same number of keys to be equivalent
    if (Object.keys(x).length !== Object.keys(y).length)    	{
        return false;
    }

    var p = Object.keys(x);
    return Object.keys(y).every(function (i) {
        return p.indexOf(i) !== -1;
    }) ?
    p.every(function (i) {
        return isDeepEquivalent(x[i], y[i]);
    }) : false;
}

function valuesAreEquivalent (v1, v2) {
    if (v1 === v2) {
        return true;
    }
    try {
        var fv1 = parseFloat(v1);
        if (isNaN(fv1))    	    {
            return false;
        }
        var fv2 = parseFloat(v2);
        if (isNaN(fv2))    	    {
            return false;
        }
        if (fv1 === fv2)        	{
            return true;
        }
        if (fv1 === 0 || fv2 === 0)        	{
            return false;
        }
        var fmax = Math.max(fv1, fv2) * 0.999;
        if ((fv1 >= fmax) && (fv2 >= fmax))        	{
            return true;
        }
    } catch (exception) {
        console.log(exception, v1 + ':' + v2);
    }
    return false;
}

function isInteger (value) {
    if (((typeof (value) !== 'number') && (typeof (value) !== 'string')) || isNaN(value)) {
        return false;
    }
    var x = parseFloat(value);
    return (x | 0) === x;
}

exports.valuesAreEquivalent = valuesAreEquivalent;
exports.isDeepEquivalent = isDeepEquivalent;
exports.arrayContains = arrayContains;
exports.isInteger = isInteger;
exports.isString = isString;
exports.isTrue = isTrue;
exports.isFalse = isFalse;
exports.arrayHasString = arrayHasString;
exports.isValidEmailAddress = isValidEmailAddress;
exports.isValidEmailAddressList = isValidEmailAddressList;
exports.isValidId = isValidId;
exports.hasValue = hasValue;
exports.hasValueIsArray = hasValueIsArray;
exports.hasValueIsNonZeroLengthArray = hasValueIsNonZeroLengthArray;
exports.hasValueIsNonEmptyObject = hasValueIsNonEmptyObject;
exports.stringContains = stringContains;
exports.caseInsensitiveEqual = caseInsensitiveEqual;
