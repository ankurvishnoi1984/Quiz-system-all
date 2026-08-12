const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateFullName(value) {
  const name = String(value || '').trim()
  if (!name) return 'Full name is required'
  if (name.length < 2) return 'Full name must be at least 2 characters'
  if (name.length > 120) return 'Full name must be 120 characters or less'
  return ''
}

export function validateEmail(value) {
  const email = String(value || '').trim()
  if (!email) return 'Email is required'
  if (!EMAIL_REGEX.test(email)) return 'Enter a valid email address (e.g. you@company.com)'
  return ''
}

export function validatePassword(value) {
  const password = String(value || '')
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  return ''
}

export function validatePlanId(value) {
  if (!value) return 'Please select a plan'
  return ''
}

export function validateCompanyName(value) {
  const company = String(value || '').trim()
  if (company && company.length > 150) return 'Organization name must be 150 characters or less'
  return ''
}

export function validateRegisterForm(fields) {
  return {
    fullName: validateFullName(fields.fullName),
    email: validateEmail(fields.email),
    password: validatePassword(fields.password),
    plan: validatePlanId(fields.selectedPlanId),
    companyName: validateCompanyName(fields.companyName),
  }
}

export function hasValidationErrors(errors) {
  return Object.values(errors).some(Boolean)
}
