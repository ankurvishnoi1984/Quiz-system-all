import ExcelJS from 'exceljs'

function downloadBlob(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function styleHeader(row) {
  row.font = { bold: true }
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
  }
}

/**
 * Download a sample participant allowlist Excel for the given join type.
 * @param {'name_email'|'name_mobile'|'name_email_mobile'|string} joinType
 */
export async function downloadJoinAllowlistSample(joinType = 'name_email_mobile') {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quiz System'
  const sheet = workbook.addWorksheet('Participants', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  let headers
  let rows
  let filename

  if (joinType === 'name_mobile') {
    headers = ['name', 'mobile']
    rows = [
      ['Priya Sharma', '9876543210'],
      ['Rahul Verma', '9123456789'],
      ['Anita Desai', '9988776655'],
    ]
    filename = 'participant-list-mobile-sample.xlsx'
  } else if (joinType === 'name_email') {
    headers = ['name', 'email']
    rows = [
      ['Priya Sharma', 'priya.sharma@example.com'],
      ['Rahul Verma', 'rahul.verma@example.com'],
      ['Anita Desai', 'anita.desai@example.com'],
    ]
    filename = 'participant-list-email-sample.xlsx'
  } else {
    headers = ['name', 'email', 'mobile']
    rows = [
      ['Priya Sharma', 'priya.sharma@example.com', '9876543210'],
      ['Rahul Verma', 'rahul.verma@example.com', '9123456789'],
      ['Anita Desai', 'anita.desai@example.com', '9988776655'],
    ]
    filename = 'participant-list-sample.xlsx'
  }

  sheet.addRow(headers)
  styleHeader(sheet.getRow(1))
  sheet.addRows(rows)
  sheet.columns.forEach((column, index) => {
    const header = headers[index]
    column.width = header === 'email' ? 32 : header === 'name' ? 18 : 16
  })
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  }

  const notes = workbook.addWorksheet('Instructions')
  notes.getColumn(1).width = 72
  notes.addRow(['How to use this file'])
  notes.getRow(1).font = { bold: true, size: 12 }
  notes.addRow([
    'Keep the header row. Replace the sample rows with your participants.',
  ])
  notes.addRow([
    'Only email and/or mobile values are used to restrict who can join (name is optional).',
  ])
  notes.addRow([
    'You can also upload a single-column list of emails or mobiles only.',
  ])
  notes.addRow(['Save as .xlsx and upload it on the session form.'])

  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(buffer, filename)
}
