"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDeltaSignal = exports.hashListing = void 0;
var normalizeHashes = function (input) {
    if (!Array.isArray(input))
        return [];
    return input
        .filter(function (value) { return typeof value === 'string'; })
        .map(function (value) { return value.trim(); });
};
var hashListing = function (input) {
    var normalizedTitle = input.title.trim().toLowerCase();
    return "".concat(input.id, "::").concat(input.price, "::").concat(normalizedTitle);
};
exports.hashListing = hashListing;
var computeDeltaSignal = function (input) {
    var current = normalizeHashes(input.currentListingHashes);
    var lastSeen = new Set(normalizeHashes(input.lastSeenListingHashes));
    if (!current.length) {
        return {
            changed: false,
            deltaCount: 0,
            currentCount: 0,
            lastSeenCount: lastSeen.size,
        };
    }
    var newHashes = new Set();
    for (var _i = 0, current_1 = current; _i < current_1.length; _i++) {
        var hash = current_1[_i];
        if (!lastSeen.has(hash)) {
            newHashes.add(hash);
        }
    }
    var deltaCount = newHashes.size;
    return {
        changed: deltaCount > 0,
        deltaCount: deltaCount,
        currentCount: current.length,
        lastSeenCount: lastSeen.size,
    };
};
exports.computeDeltaSignal = computeDeltaSignal;
