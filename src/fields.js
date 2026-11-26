// ---------------------------------------------------------------------------
// FIELD DEFINITIONS - edit this list to add/remove/reorder form fields.
//
// Each field becomes a form input AND a column in your Google Sheet.
// The column header in the sheet is the `key`. New keys are added to the
// sheet automatically the first time an order using them is saved.
//
// type: 'text' | 'tel' | 'number' | 'money' | 'select' | 'textarea' | 'date'
// ---------------------------------------------------------------------------
export const FIELDS = [
  { key: 'firstName', label: 'First name', type: 'text', required: true, autoComplete: 'given-name' },
  { key: 'lastName', label: 'Last name', type: 'text', required: true, autoComplete: 'family-name' },
  { key: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
  { key: 'address', label: 'Address', type: 'text', autoComplete: 'street-address' },
  { key: 'item', label: 'Item', type: 'text', required: true },
  { key: 'amountPaid', label: 'Amount paid', type: 'money', required: true },
  {
    key: 'paymentMethod',
    label: 'How paid',
    type: 'select',
    required: true,
    options: ['Cash', 'Venmo', 'Zelle', 'Cash App', 'Card', 'Check', 'Other'],
  },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Which fields show on the collapsed order card in the list.
export const TITLE_FIELDS = ['firstName', 'lastName'];
export const SUBTITLE_FIELD = 'item';
export const AMOUNT_FIELD = 'amountPaid';
export const SEARCH_FIELDS = ['firstName', 'lastName', 'phone', 'address', 'item', 'paymentMethod', 'notes'];
