import { toCsv } from './csv'

describe('toCsv (US-FND-019)', () => {
  it('quotes every cell, escapes quotes, and neutralises formulas', () => {
    expect(toCsv(['Name', 'Note'], [['Torres "TJ" LLC', '=HYPERLINK("x")'], ['A', null]])).toBe('"Name","Note"\n"Torres ""TJ"" LLC","\'=HYPERLINK(""x"")"\n"A",""')
  })
})
