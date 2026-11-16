import { autoMap, parseCsv, reviewRows } from './leadImport'

describe('lead import (US-LEA-010)', () => {
  it('parses quoted CSV and maps headers by name', () => {
    const rows = parseCsv('First Name,Last,Phone,E-mail,ZIP,Line,Notes\r\n"Ana","Lopez, Jr.",(713) 555-0101,ana@example.com,77019,Home,"said ""call me"""\n')
    expect(rows[1][1]).toBe('Lopez, Jr.')
    expect(rows[1][6]).toBe('said "call me"')
    expect(autoMap(rows[0])).toEqual(['first_name', 'last_name', 'phone', 'email', 'zip', 'line', null])
  })
  it('flags invalid rows and possible duplicates', () => {
    const map = autoMap(['first_name', 'last_name', 'phone', 'email', 'zip', 'line'])
    const r = reviewRows(
      [
        ['Ana', 'Lopez', '7135550101', '', '77019', 'home'],
        ['Bo', 'Diaz', '713555010', '', '77019', 'Auto'],
        ['Cy', 'Ng', '', 'cy@example.com', '77019', 'Auto'],
      ],
      map,
      { phones: new Set(), emails: new Set(['cy@example.com']) },
    )
    expect(r.map((x) => x.status)).toEqual(['Ready', 'Invalid', 'Possible duplicate'])
    expect(r[1].reason).toBe('Row 3: phone has 9 digits')
    expect(r[0].line).toBe('Home')
  })
})
