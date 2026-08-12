import { WEBSITE_SIGNUP_DEPT_NAME, WEBSITE_SIGNUP_DEPT_SLUG } from '../constants/websiteSignupOrg'

export function getWebsiteSignupDepartment(departments, deptId) {
  const id = deptId != null ? String(deptId) : ''
  if (!id || !departments?.length) return null
  return departments.find((department) => String(department.dept_id) === id) || null
}

export function isWebsiteSignupHost({ user, departments, departmentId }) {
  if (!user || user.role !== 'host') return false

  const dept = getWebsiteSignupDepartment(departments, departmentId ?? user.dept_id)
  if (!dept) return false

  return dept.slug === WEBSITE_SIGNUP_DEPT_SLUG || dept.name === WEBSITE_SIGNUP_DEPT_NAME
}
