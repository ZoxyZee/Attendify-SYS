# Mobile Services

Mobile app service layer.

- `api.js`: Axios client and mobile error normalization
- `backendUrl.js`: LAN backend URL detection and cleanup
- `database.js`: SQLite schema and local persistence
- `syncService.js`: device registration, attendance marking, pending-log sync
- `attendanceService.js`: local attendance queue and duplicate prevention
- `companyService.js`: company settings fetch
- `embeddingService.js`: on-device TensorFlow face embedding support
- `recognitionService.js`: local/remote recognition orchestration
- `similarityService.js`: embedding similarity and match selection

