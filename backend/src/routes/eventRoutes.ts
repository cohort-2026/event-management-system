import { Router } from 'express';
const router = Router();
// GET /api/events  POST /api/events  GET /api/events/:id
// PATCH /api/events/:id/submit  PATCH /api/events/:id/approve  PATCH /api/events/:id/reject
// PATCH /api/events/:id/cancel  PUT /api/events/:id  DELETE /api/events/:id
// GET /api/events/:id/bookings  GET /api/events/:id/vendors
export default router;
