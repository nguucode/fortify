import { renewalMilestones } from './renewals'

describe('renewal notice milestones (US-REN-012)', () => {
  it('FL residential: 120 and 45 days; carrier of last resort adds clearinghouse at 60', () => {
    expect(renewalMilestones('FL', 'Home', false, 100).map((m) => m.offset)).toEqual([-20, 55])
    expect(renewalMilestones('FL', 'Home', true, 100).map((m) => m.label)).toEqual(['Carrier non-renewal notice due by', 'Clearinghouse review', 'Renewal premium notice due by'])
  })
  it('TX auto or home: 60 days; commercial: none', () => {
    expect(renewalMilestones('TX', 'Auto', false, 90)).toEqual([{ label: 'Carrier non-renewal notice due by', offset: 30 }])
    expect(renewalMilestones('TX', 'BOP', false, 90)).toEqual([])
  })
})
