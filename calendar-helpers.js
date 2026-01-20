/**
 * Calendar Helper Functions for Gantt Flow
 * Pure utility functions for date and timeline calculations
 */

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Converts a month and year to a timeline view index based on config
 * @param {number} monthVal - Month value (1-12)
 * @param {number} year - Year value
 * @param {Object} config - Configuration object with startYear and startMonth
 * @returns {number} View index representing position in timeline
 */
function dateToViewIndex(monthVal, year, config) {
    const monthsDiff = (year - config.startYear) * 12 + (monthVal - config.startMonth);
    return monthsDiff + 1;
}

/**
 * Generates a human-readable preview of a month value with fractional positioning
 * @param {number} val - Month value (1-12) with optional decimal for position within month
 * @param {number} year - Year value
 * @returns {string} Preview string like "Early Jan 2025" or "..." for invalid inputs
 */
function getMonthPreview(val, year) {
    if (!val || isNaN(val) || !year) return "...";
    const mIdx = Math.floor(val);
    const mName = monthNames[mIdx - 1] || "???";
    const decimal = val % 1;
    let p = (decimal < 0.4) ? "Early" : (decimal < 0.7) ? "Mid" : "Late";
    return `${p} ${mName} ${year}`;
}

// Export for Node.js (Jest testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        dateToViewIndex,
        getMonthPreview,
        monthNames
    };
}
