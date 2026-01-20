/**
 * Comprehensive tests for Calendar Helper Functions
 * Testing dateToViewIndex and getMonthPreview utilities
 */

const { dateToViewIndex, getMonthPreview, monthNames } = require('./calendar-helpers');

describe('dateToViewIndex', () => {
    describe('Normal cases - same year', () => {
        const config = { startYear: 2025, startMonth: 1 };

        test('should return 1 for the start month', () => {
            expect(dateToViewIndex(1, 2025, config)).toBe(1);
        });

        test('should return 2 for the second month', () => {
            expect(dateToViewIndex(2, 2025, config)).toBe(2);
        });

        test('should return 6 for June in same year', () => {
            expect(dateToViewIndex(6, 2025, config)).toBe(6);
        });

        test('should return 12 for December in same year', () => {
            expect(dateToViewIndex(12, 2025, config)).toBe(12);
        });
    });

    describe('Normal cases - across years', () => {
        const config = { startYear: 2025, startMonth: 1 };

        test('should return 13 for January of next year', () => {
            expect(dateToViewIndex(1, 2026, config)).toBe(13);
        });

        test('should return 24 for December of next year', () => {
            expect(dateToViewIndex(12, 2026, config)).toBe(24);
        });

        test('should return 25 for January two years later', () => {
            expect(dateToViewIndex(1, 2027, config)).toBe(25);
        });
    });

    describe('Mid-year start configuration', () => {
        const config = { startYear: 2025, startMonth: 6 }; // June start

        test('should return 1 for June 2025', () => {
            expect(dateToViewIndex(6, 2025, config)).toBe(1);
        });

        test('should return 7 for December 2025', () => {
            expect(dateToViewIndex(12, 2025, config)).toBe(7);
        });

        test('should return 8 for January 2026', () => {
            expect(dateToViewIndex(1, 2026, config)).toBe(8);
        });

        test('should return 13 for June 2026', () => {
            expect(dateToViewIndex(6, 2026, config)).toBe(13);
        });
    });

    describe('Negative indices - dates before timeline start', () => {
        const config = { startYear: 2025, startMonth: 6 };

        test('should return negative index for months before start', () => {
            expect(dateToViewIndex(1, 2025, config)).toBe(-4);
        });

        test('should return 0 for month immediately before start', () => {
            expect(dateToViewIndex(5, 2025, config)).toBe(0);
        });

        test('should return negative index for previous year', () => {
            expect(dateToViewIndex(12, 2024, config)).toBe(-5);
        });
    });

    describe('Edge cases - different start configurations', () => {
        test('December start - next month wraps to new year', () => {
            const config = { startYear: 2025, startMonth: 12 };
            expect(dateToViewIndex(12, 2025, config)).toBe(1);
            expect(dateToViewIndex(1, 2026, config)).toBe(2);
        });

        test('works with non-standard start month (March)', () => {
            const config = { startYear: 2025, startMonth: 3 };
            expect(dateToViewIndex(3, 2025, config)).toBe(1);
            expect(dateToViewIndex(2, 2025, config)).toBe(0);
        });
    });

    describe('Multiple years span', () => {
        const config = { startYear: 2024, startMonth: 1 };

        test('should correctly calculate index for date 2 years later', () => {
            expect(dateToViewIndex(1, 2026, config)).toBe(25);
        });

        test('should correctly calculate index for date 5 years later', () => {
            expect(dateToViewIndex(12, 2029, config)).toBe(72);
        });

        test('should correctly calculate index for date 3 years before', () => {
            expect(dateToViewIndex(1, 2021, config)).toBe(-35);
        });
    });

    describe('Month value edge cases', () => {
        const config = { startYear: 2025, startMonth: 1 };

        test('should handle month 0 (edge case)', () => {
            expect(dateToViewIndex(0, 2025, config)).toBe(0);
        });

        test('should handle month 13 (edge case)', () => {
            expect(dateToViewIndex(13, 2025, config)).toBe(13);
        });

        test('should handle negative month (edge case)', () => {
            expect(dateToViewIndex(-1, 2025, config)).toBe(-1);
        });
    });
});

describe('getMonthPreview', () => {
    describe('Valid inputs - integer months', () => {
        test('should return "Early Jan 2025" for month 1', () => {
            expect(getMonthPreview(1, 2025)).toBe('Early Jan 2025');
        });

        test('should return "Early Jun 2025" for month 6', () => {
            expect(getMonthPreview(6, 2025)).toBe('Early Jun 2025');
        });

        test('should return "Early Dec 2025" for month 12', () => {
            expect(getMonthPreview(12, 2025)).toBe('Early Dec 2025');
        });

        test('should work with different years', () => {
            expect(getMonthPreview(3, 2026)).toBe('Early Mar 2026');
            expect(getMonthPreview(9, 2024)).toBe('Early Sep 2024');
        });
    });

    describe('Valid inputs - decimal positions (Early)', () => {
        test('should return "Early" for decimal 0.0', () => {
            expect(getMonthPreview(5.0, 2025)).toBe('Early May 2025');
        });

        test('should return "Early" for decimal 0.1', () => {
            expect(getMonthPreview(5.1, 2025)).toBe('Early May 2025');
        });

        test('should return "Early" for decimal 0.3', () => {
            expect(getMonthPreview(5.3, 2025)).toBe('Early May 2025');
        });

        test('should return "Early" for decimal just below 0.4', () => {
            expect(getMonthPreview(5.39, 2025)).toBe('Early May 2025');
        });
    });

    describe('Valid inputs - decimal positions (Mid)', () => {
        test('should return "Mid" for decimal 0.4', () => {
            expect(getMonthPreview(5.4, 2025)).toBe('Mid May 2025');
        });

        test('should return "Mid" for decimal 0.5', () => {
            expect(getMonthPreview(5.5, 2025)).toBe('Mid May 2025');
        });

        test('should return "Mid" for decimal 0.6', () => {
            expect(getMonthPreview(5.6, 2025)).toBe('Mid May 2025');
        });

        test('should return "Mid" for decimal just below 0.7', () => {
            expect(getMonthPreview(5.69, 2025)).toBe('Mid May 2025');
        });
    });

    describe('Valid inputs - decimal positions (Late)', () => {
        test('should return "Late" for decimal 0.7', () => {
            expect(getMonthPreview(5.7, 2025)).toBe('Late May 2025');
        });

        test('should return "Late" for decimal 0.8', () => {
            expect(getMonthPreview(5.8, 2025)).toBe('Late May 2025');
        });

        test('should return "Late" for decimal 0.9', () => {
            expect(getMonthPreview(5.9, 2025)).toBe('Late May 2025');
        });

        test('should return "Late" for decimal 0.99', () => {
            expect(getMonthPreview(5.99, 2025)).toBe('Late May 2025');
        });
    });

    describe('All month names coverage', () => {
        test('should correctly display all 12 month names', () => {
            expect(getMonthPreview(1, 2025)).toContain('Jan');
            expect(getMonthPreview(2, 2025)).toContain('Feb');
            expect(getMonthPreview(3, 2025)).toContain('Mar');
            expect(getMonthPreview(4, 2025)).toContain('Apr');
            expect(getMonthPreview(5, 2025)).toContain('May');
            expect(getMonthPreview(6, 2025)).toContain('Jun');
            expect(getMonthPreview(7, 2025)).toContain('Jul');
            expect(getMonthPreview(8, 2025)).toContain('Aug');
            expect(getMonthPreview(9, 2025)).toContain('Sep');
            expect(getMonthPreview(10, 2025)).toContain('Oct');
            expect(getMonthPreview(11, 2025)).toContain('Nov');
            expect(getMonthPreview(12, 2025)).toContain('Dec');
        });
    });

    describe('Invalid inputs - null and undefined', () => {
        test('should return "..." for null month value', () => {
            expect(getMonthPreview(null, 2025)).toBe('...');
        });

        test('should return "..." for undefined month value', () => {
            expect(getMonthPreview(undefined, 2025)).toBe('...');
        });

        test('should return "..." for null year', () => {
            expect(getMonthPreview(5, null)).toBe('...');
        });

        test('should return "..." for undefined year', () => {
            expect(getMonthPreview(5, undefined)).toBe('...');
        });

        test('should return "..." for both null', () => {
            expect(getMonthPreview(null, null)).toBe('...');
        });

        test('should return "..." for both undefined', () => {
            expect(getMonthPreview(undefined, undefined)).toBe('...');
        });
    });

    describe('Invalid inputs - NaN and zero', () => {
        test('should return "..." for NaN month value', () => {
            expect(getMonthPreview(NaN, 2025)).toBe('...');
        });

        test('should return "..." for string that is NaN', () => {
            expect(getMonthPreview('invalid', 2025)).toBe('...');
        });

        test('should return "..." for zero month value', () => {
            expect(getMonthPreview(0, 2025)).toBe('...');
        });
    });

    describe('Edge cases - out of range months', () => {
        test('should return "???" for month value 0', () => {
            expect(getMonthPreview(0, 2025)).toBe('...');
        });

        test('should return "???" for month value 13', () => {
            const result = getMonthPreview(13, 2025);
            expect(result).toContain('???');
            expect(result).toBe('Early ??? 2025');
        });

        test('should return "???" for month value -1', () => {
            const result = getMonthPreview(-1, 2025);
            expect(result).toContain('???');
        });

        test('should return "???" for month value 100', () => {
            const result = getMonthPreview(100, 2025);
            expect(result).toContain('???');
        });
    });

    describe('Edge cases - decimal boundary values', () => {
        test('should handle exact 0.4 threshold (Mid starts here)', () => {
            expect(getMonthPreview(6.4, 2025)).toBe('Mid Jun 2025');
        });

        test('should handle exact 0.7 threshold (Late starts here)', () => {
            expect(getMonthPreview(6.7, 2025)).toBe('Late Jun 2025');
        });

        test('should handle 0.399 (just before Mid)', () => {
            expect(getMonthPreview(6.399, 2025)).toBe('Early Jun 2025');
        });

        test('should handle 0.699 (just before Late)', () => {
            expect(getMonthPreview(6.699, 2025)).toBe('Mid Jun 2025');
        });
    });

    describe('Real-world scenarios', () => {
        test('should format typical task start date', () => {
            expect(getMonthPreview(3.5, 2025)).toBe('Mid Mar 2025');
        });

        test('should format typical task end date', () => {
            expect(getMonthPreview(8.9, 2025)).toBe('Late Aug 2025');
        });

        test('should format milestone date (early month)', () => {
            expect(getMonthPreview(12.1, 2025)).toBe('Early Dec 2025');
        });

        test('should handle multi-year project dates', () => {
            expect(getMonthPreview(1.0, 2026)).toBe('Early Jan 2026');
            expect(getMonthPreview(12.9, 2027)).toBe('Late Dec 2027');
        });
    });

    describe('Type coercion edge cases', () => {
        test('should handle string numbers', () => {
            expect(getMonthPreview('5', 2025)).toBe('Early May 2025');
        });

        test('should handle string year', () => {
            expect(getMonthPreview(5, '2025')).toBe('Early May 2025');
        });

        test('should handle boolean false (falsy)', () => {
            expect(getMonthPreview(false, 2025)).toBe('...');
        });

        test('should handle boolean true (coerces to 1)', () => {
            expect(getMonthPreview(true, 2025)).toBe('Early Jan 2025');
        });
    });

    describe('Negative month values', () => {
        test('should return "???" for negative month', () => {
            const result = getMonthPreview(-5, 2025);
            expect(result).toContain('???');
        });

        test('should return "???" for -1', () => {
            const result = getMonthPreview(-1, 2025);
            expect(result).toContain('???');
        });
    });

    describe('Year display', () => {
        test('should display year correctly in output', () => {
            expect(getMonthPreview(5, 2020)).toContain('2020');
            expect(getMonthPreview(5, 2025)).toContain('2025');
            expect(getMonthPreview(5, 2030)).toContain('2030');
        });

        test('should handle year as string number', () => {
            const result = getMonthPreview(5, '2025');
            expect(result).toBe('Early May 2025');
        });
    });
});

describe('monthNames array', () => {
    test('should contain 12 month names', () => {
        expect(monthNames).toHaveLength(12);
    });

    test('should start with Jan', () => {
        expect(monthNames[0]).toBe('Jan');
    });

    test('should end with Dec', () => {
        expect(monthNames[11]).toBe('Dec');
    });

    test('should contain all expected month abbreviations', () => {
        const expected = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        expect(monthNames).toEqual(expected);
    });
});
