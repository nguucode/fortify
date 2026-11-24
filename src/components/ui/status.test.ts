import { expect, test } from 'vitest'
import { TONE } from './status'

// Every status union in src/domain/types.ts and src/spec/validate.ts, plus the risk/priority words StatusCell renders.
const ALL = [
  'Prospect', 'Client', 'Former client',
  'Bound', 'Active', 'Renewed', 'Rewritten', 'Non-renewed', 'Canceled', 'Expired', 'Pending cancellation',
  'New', 'Contacted', 'Qualified', 'Disqualified',
  'Gathering info', 'Quoting', 'Proposed', 'Won', 'Lost',
  'Requested', 'Quoted', 'Declined', 'Referred', 'Presented', 'Accepted', 'Not taken',
  'Upcoming', 'In review', 'Remarketing', 'Decided', 'Done',
  'In progress', 'Waiting on carrier', 'Waiting on client',
  'Needs review', 'Issued', 'Re-issued', 'Replaced', 'Withdrawn',
  'Reported', 'Submitted to carrier', 'Claim # assigned', 'Open', 'Closed',
  'Succeeded', 'Partial', 'Failed', 'Inactive', 'Retired',
  'Draft', 'Ready', 'In design', 'In build',
  'High', 'Medium', 'Normal', 'Low',
]

test('every status has a tone, and the semantic anchors hold', () => {
  expect(ALL.filter((s) => !TONE[s])).toEqual([])
  expect(['In progress', 'In design', 'In build'].map((s) => TONE[s])).toEqual(['blue', 'blue', 'blue'])
  expect(['Waiting on carrier', 'Waiting on client'].map((s) => TONE[s])).toEqual(['orange', 'orange'])
})
