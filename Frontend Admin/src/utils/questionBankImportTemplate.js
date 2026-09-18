import ExcelJS from 'exceljs'

const HEADERS = [
  'topic_name',
  'difficulty',
  'language',
  'survey_subtype',
  'question_text',
  ...Array.from({ length: 10 }, (_, index) => `option_${index + 1}`),
  'correct_option',
  'points_value',
  'time_limit_seconds',
  'allow_multiple_select',
  'rating_min',
  'rating_max',
  'rating_min_label',
  'rating_max_label',
]

const SAMPLE_ROWS = [
  [
    'General Knowledge',
    'easy',
    'en',
    '',
    'Which planet is known as the Red Planet?',
    'Earth',
    'Mars',
    'Venus',
    'Jupiter',
    '',
    '',
    '',
    '',
    '',
    '',
    'Mars',
    10,
    30,
    false,
    '',
    '',
    '',
    '',
  ],
  [
    'Math',
    'medium',
    'en',
    '',
    'What is 2 + 2?',
    '3',
    '4',
    '5',
    '6',
    '',
    '',
    '',
    '',
    '',
    '',
    '4',
    10,
    15,
    false,
    '',
    '',
    '',
    '',
  ],
]

function downloadBlob(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function styleHeader(row) {
  row.height = 26
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173B57' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
}

export async function downloadQuestionBankImportTemplate({ includeExamples = false } = {}) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Quiz System'
  workbook.created = new Date()

  const instructions = workbook.addWorksheet('Instructions')
  instructions.columns = [{ width: 24 }, { width: 100 }]
  instructions.addRows([
    [
      'Question Bank upload template',
      'Choose the question type in the Upload questions modal. Keep all Excel rows consistent with that type. Imported rows become drafts for you to submit for review.',
    ],
    ['Required columns', 'topic_name, difficulty, question_text'],
    [
      'Difficulty',
      'Must be one of: easy, medium, hard.',
    ],
    [
      'Correct answer',
      'For quiz MCQ/True-False, correct_option must contain the exact text of one available option (example: Mars). Matching is case-insensitive.',
    ],
    [
      'Options',
      'Option text values must be unique within each question. MCQ/Poll need at least 2; True-False exactly 2; Ranking 2–10.',
    ],
    [
      'Limits',
      'Maximum 500 questions and 5MB per import. Media is not imported from Excel.',
    ],
  ])
  instructions.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF173B57' } }
  instructions.eachRow((row, index) => {
    row.alignment = { vertical: 'top', wrapText: true }
    if (index > 1) row.getCell(1).font = { bold: true }
  })

  const questions = workbook.addWorksheet('Questions', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  questions.addRow(HEADERS)
  styleHeader(questions.getRow(1))
  if (includeExamples) questions.addRows(SAMPLE_ROWS)

  questions.columns.forEach((column, index) => {
    const header = HEADERS[index]
    column.width =
      header === 'question_text' ? 48 : header.startsWith('option_') ? 22 : 18
  })
  questions.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: HEADERS.length },
  }

  const difficultyColumn = HEADERS.indexOf('difficulty') + 1
  const subtypeColumn = HEADERS.indexOf('survey_subtype') + 1
  const multipleColumn = HEADERS.indexOf('allow_multiple_select') + 1
  for (let row = 2; row <= 501; row += 1) {
    questions.getCell(row, difficultyColumn).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"easy,medium,hard"'],
    }
    questions.getCell(row, subtypeColumn).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"mcq,poll,rating,open_text,word_cloud,ranking,true_false,emoji_reaction"'],
    }
    questions.getCell(row, multipleColumn).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"true,false"'],
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(
    buffer,
    includeExamples
      ? 'question-bank-import-sample.xlsx'
      : 'question-bank-import-template.xlsx',
  )
}
