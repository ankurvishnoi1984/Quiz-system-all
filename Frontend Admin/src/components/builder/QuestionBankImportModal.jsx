import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Modal from '../ui/Modal'
import {
  previewQuestionBankImportApi,
  importQuestionBankQuestionsApi,
} from '../../services/questionBankApi'
import { parseQuestionBankImportFile } from '../../utils/questionBankImportParser'
import { downloadQuestionBankImportTemplate } from '../../utils/questionBankImportTemplate'

const IMPORT_QUESTION_TYPES = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'poll', label: 'Poll' },
  { value: 'survey', label: 'Survey' },
  { value: 'word_cloud', label: 'Word Cloud' },
  { value: 'emoji_reaction', label: 'Emoji Reaction' },
  { value: 'rating', label: 'Rating' },
  { value: 'open_text', label: 'Text' },
  { value: 'true_false', label: 'True/False' },
  { value: 'ranking', label: 'Ranking' },
]

export function QuestionBankImportModal({
  open,
  onClose,
  accessToken,
  owners = [],
  role,
  onImported,
}) {
  const inputRef = useRef(null)
  const isAdmin = ['super_admin', 'client_admin', 'dept_admin'].includes(role)
  const [file, setFile] = useState(null)
  const [questionType, setQuestionType] = useState('mcq')
  const [ownerId, setOwnerId] = useState('')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (!open) return
    setQuestionType('mcq')
    setOwnerId(owners[0]?.user_id ? String(owners[0].user_id) : '')
  }, [open, owners])

  const reset = () => {
    setFile(null)
    setPreview(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const close = () => {
    if (isPreviewing || isImporting) return
    reset()
    onClose()
  }

  const generatePreview = async (nextFile = file, nextQuestionType = questionType) => {
    if (!nextFile) return
    if (!nextQuestionType) {
      setPreview(null)
      setError('Select a question type before uploading the workbook.')
      return
    }
    if (isAdmin && !ownerId) {
      setPreview(null)
      setError('Select the Host account that will own these questions.')
      return
    }
    setIsPreviewing(true)
    setError('')
    try {
      const rows = await parseQuestionBankImportFile(nextFile, {
        questionType: nextQuestionType,
      })
      const data = await previewQuestionBankImportApi(accessToken, {
        filename: nextFile.name,
        owner_id: isAdmin ? Number(ownerId) : undefined,
        rows,
      })
      setPreview(data)
    } catch (previewError) {
      setPreview(null)
      const details = Array.isArray(previewError.details)
        ? previewError.details.filter(Boolean)
        : []
      setError(
        details[0] ||
          previewError.message ||
          'Unable to preview this workbook.',
      )
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleFile = (nextFile) => {
    setFile(nextFile || null)
    setPreview(null)
    setError('')
    if (nextFile) generatePreview(nextFile, questionType)
  }

  const handleImport = async () => {
    if (!preview?.valid_rows) return
    const validRows = (preview.rows || []).filter((row) => row.valid)
    if (!validRows.length) return
    setIsImporting(true)
    setError('')
    try {
      const result = await importQuestionBankQuestionsApi(accessToken, {
        owner_id: isAdmin ? Number(ownerId) : undefined,
        questions: validRows.map((row) => ({
          row: row.row,
          payload: row.payload,
          errors: [],
        })),
      })
      await onImported?.(result)
      reset()
      onClose()
    } catch (importError) {
      const details = Array.isArray(importError.details)
        ? importError.details.filter(Boolean)
        : []
      setError(
        details[0] ||
          importError.message ||
          'Unable to import questions. Please review the workbook.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Modal open={open} title="Upload question bank from Excel" onClose={close} size="lg">
      <div className="space-y-5">
        <div className="rounded-2xl border border-blue-200/70 bg-blue-50/60 p-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-navy-700" />
            <div>
              <p className="text-sm font-semibold text-navy-900">Use the Question Bank .xlsx format</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Include topic_name, difficulty, and question_text. MCQ/True-False rows need a
                correct_option that matches one option exactly. Imports are saved as drafts.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadQuestionBankImportTemplate()}
                  className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-blue-50"
                >
                  Download empty template
                </button>
                <button
                  type="button"
                  onClick={() => downloadQuestionBankImportTemplate({ includeExamples: true })}
                  className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-blue-50"
                >
                  Download sample
                </button>
              </div>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Host account</span>
            <select
              value={ownerId}
              disabled={isPreviewing || isImporting}
              onChange={(event) => {
                setOwnerId(event.target.value)
                setPreview(null)
              }}
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-medium text-navy-900 shadow-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-200"
            >
              <option value="">Select Host account</option>
              {owners.map((owner) => (
                <option key={owner.user_id} value={owner.user_id}>
                  {owner.full_name} ({owner.email})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Question type</span>
          <select
            value={questionType}
            disabled={isPreviewing || isImporting}
            onChange={(event) => {
              setQuestionType(event.target.value)
              setPreview(null)
              setError('')
              if (file && event.target.value) {
                generatePreview(file, event.target.value)
              }
            }}
            className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-medium text-navy-900 shadow-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-200"
          >
            {IMPORT_QUESTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block rounded-2xl border-2 border-dashed border-blue-200 bg-slate-50/70 p-5 text-center transition hover:border-blue-400">
          <Upload className="mx-auto size-7 text-navy-700" />
          <span className="mt-2 block text-sm font-semibold text-navy-900">
            {file?.name || 'Choose an Excel workbook'}
          </span>
          <span className="mt-1 block text-xs text-slate-500">.xlsx only, up to 5MB</span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={isPreviewing || isImporting || !questionType || (isAdmin && !ownerId)}
            onChange={(event) => handleFile(event.target.files?.[0])}
            className="sr-only"
          />
        </label>

        {isPreviewing ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-navy-800">
            Reading and validating workbook…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {preview ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {preview.total_rows} rows
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {preview.valid_rows} valid
              </span>
              {preview.invalid_rows ? (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                  {preview.invalid_rows} skipped
                </span>
              ) : null}
            </div>
            <div className="max-h-72 overflow-auto rounded-2xl border border-blue-200/70">
              <table className="min-w-full divide-y divide-blue-100 text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 bg-white">
                  {(preview.rows || []).map((row) => (
                    <tr key={row.row} className={row.valid ? '' : 'bg-red-50/50'}>
                      <td className="px-3 py-2 font-semibold text-slate-600">{row.row}</td>
                      <td className="max-w-xs px-3 py-2">
                        <p className="line-clamp-2 font-medium text-slate-800">
                          {row.question_text || row.payload?.question_text || 'Untitled'}
                        </p>
                        {!row.valid ? (
                          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-red-700">
                            {(row.errors || []).map((rowError) => (
                              <li key={rowError}>{rowError}</li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                        {row.question_type || row.payload?.question_type}
                      </td>
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <CheckCircle2 className="size-4 text-emerald-600" aria-label="Valid" />
                        ) : (
                          <AlertTriangle className="size-4 text-red-600" aria-label="Invalid" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-blue-100 pt-4">
          <button
            type="button"
            onClick={close}
            disabled={isPreviewing || isImporting}
            className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isPreviewing || isImporting || !preview?.valid_rows}
            className="rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting
              ? 'Importing…'
              : `Import ${preview?.valid_rows || 0} draft${preview?.valid_rows === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
