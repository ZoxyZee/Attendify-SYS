# Web Services

Browser-side API service modules.

- `api.js`: shared Axios client and auth/error handling
- `employeeService.js`: employee CRUD calls
- `deviceService.js`: device calls
- `attendanceService.js`: attendance calls
- `dashboardService.js`: dashboard summary calls
- `companyService.js`: company settings calls
- `recognitionService.js`: web recognition helper calls

All service modules should use `api.js` so auth and error handling stay consistent.

