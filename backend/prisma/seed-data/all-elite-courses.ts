/**
 * DocumentIulia.ro - All Elite Courses Combined
 * Master file that imports and exports all comprehensive courses
 */

// Import existing comprehensive courses
import { eliteBusinessCourses as existingCourses } from './courses-comprehensive-content';

// Import VBA course
import { excelVBACourse } from './courses-elite-vba';

// Import HR/Payroll course
import { hrPayrollRomaniaCourse } from './courses-hr-payroll';

// Import Project Management course
import { projectManagementCourse } from './courses-project-management';

// Import Freelancer Romania course
import { freelancerRomaniaCourse } from './courses-freelancer-romania';

// Combine all courses into one array
export const allEliteCourses = [
  ...existingCourses,
  excelVBACourse,
  hrPayrollRomaniaCourse,
  projectManagementCourse,
  freelancerRomaniaCourse,
];

// Re-export for backwards compatibility
export { existingCourses as eliteBusinessCourses };

// Export individual courses
export {
  excelVBACourse,
  hrPayrollRomaniaCourse,
  projectManagementCourse,
  freelancerRomaniaCourse,
};
