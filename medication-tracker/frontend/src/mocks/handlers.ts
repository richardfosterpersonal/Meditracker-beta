import { rest } from 'msw'
import { API_BASE_URL } from '../config'

export const handlers = [
  // Medication endpoints
  rest.get(`${API_BASE_URL}/medications`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([])
    )
  }),

  // Schedule endpoints
  rest.get(`${API_BASE_URL}/schedules`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([])
    )
  }),

  // Add more handlers as needed
]
