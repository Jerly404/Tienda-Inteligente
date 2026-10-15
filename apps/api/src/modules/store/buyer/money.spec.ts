import { csvCell, purchaseTotals } from './money';
describe('confirmed purchase arithmetic',()=>{
 it('uses integer cents for decimal package prices',()=>expect(purchaseTotals([{packages:3,packagePrice:0.1},{packages:7,packagePrice:1.15}],2.1)).toEqual({lines:[0.3,8.05],subtotal:8.35,total:10.45}));
 it('rejects fractional packages',()=>expect(()=>purchaseTotals([{packages:1.5,packagePrice:3}],0)).toThrow());
 it('rejects overflow instead of rounding large totals',()=>expect(()=>purchaseTotals([{packages:Number.MAX_SAFE_INTEGER,packagePrice:3}],0)).toThrow());
 it('escapes spreadsheet formulas and delimiters',()=>{expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');expect(csvCell('A,B')).toBe('"A,B"');});
});
