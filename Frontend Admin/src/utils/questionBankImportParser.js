import { parseQuestionImportFile } from './questionImportParser'

const DIFFICULTIES = new Set(['easy', 'medium', 'hard'])

function cellText(value) {
  if (value == null) return ''
  return String(value).trim()
}

/**
 * Parse a Question Bank Excel workbook.
 * Reuses the session builder row parser, then attaches topic/difficulty/language.
 */
export async function parseQuestionBankImportFile(file, { questionType } = {}) {
  const rows = await parseQuestionImportFile(file, { questionType })

  // Re-read bank-only columns from the workbook by reusing parser payloads
  // and validating topic/difficulty on each row.
  const workbook = await file.arrayBuffer()
  const ExcelJS = (await import('exceljs')).default
  const book = new ExcelJS.Workbook()
  await book.xlsx.load(workbook)
  const worksheet = book.getWorksheet('Questions') || book.worksheets[0]
  const headers = new Map()
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const header = String(cell.value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    if (header) headers.set(columnNumber, header)
  })

  return rows.map((row) => {
    const excelRow = worksheet.getRow(row.row)
    const values = {}
    headers.forEach((header, columnNumber) => {
      values[header] = excelRow.getCell(columnNumber).value
    })

    const topicName = cellText(values.topic_name || values.topic)
    const difficulty = cellText(values.difficulty || 'medium').toLowerCase() || 'medium'
    const language = cellText(values.language || 'en') || 'en'
    const errors = [...(row.errors || [])]

    if (!topicName) errors.push('topic_name is required')
    if (!DIFFICULTIES.has(difficulty)) {
      errors.push('difficulty must be easy, medium, or hard')
    }
    if (language.length > 20) errors.push('language must be 20 characters or less')

    const payload = {
      ...row.payload,
      topic_name: topicName,
      difficulty,
      language,
    }

    return {
      ...row,
      errors: [...new Set(errors)],
      valid: errors.length === 0,
      payload,
    }
  })
}
