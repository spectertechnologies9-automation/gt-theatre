// Shared enquiry handling used by the Vite dev/preview middleware and the
// standalone production server. Enquiries are stored locally in
// data/enquiries.json — nothing is sent to any external service.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export const OCCASIONS = [
  'Private movie night',
  "Couples' experience",
  'Birthday celebration',
  'Anniversary celebration',
  'Family screening',
  'Friends & exclusive gathering',
  'Something else',
]

const MAX_BODY = 16 * 1024

export function validateEnquiry(input) {
  const errors = {}
  const s = (v) => (typeof v === 'string' ? v.trim() : '')
  const data = {
    name: s(input?.name),
    phone: s(input?.phone),
    date: s(input?.date),
    time: s(input?.time),
    guests: Number.parseInt(String(input?.guests ?? ''), 10),
    occasion: s(input?.occasion),
    notes: s(input?.notes),
  }

  if (data.name.length < 2) errors.name = 'Please share your name.'
  else if (data.name.length > 80) errors.name = 'Please keep your name under 80 characters.'

  const digits = data.phone.replace(/\D/g, '')
  if (!/^[+\d][\d\s\-().]*$/.test(data.phone) || digits.length < 7 || digits.length > 15)
    errors.phone = 'Please enter a valid contact number.'

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.date = 'Please choose a preferred date.'
  else {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = new Date(data.date + 'T00:00:00')
    if (Number.isNaN(d.getTime())) errors.date = 'Please choose a valid date.'
    else if (d < today) errors.date = 'Please choose a date from today onwards.'
  }

  if (!/^\d{2}:\d{2}$/.test(data.time)) errors.time = 'Please choose a preferred time.'

  if (!Number.isFinite(data.guests) || data.guests < 1 || data.guests > 50)
    errors.guests = 'Please enter the number of guests (1–50).'

  if (!OCCASIONS.includes(data.occasion)) errors.occasion = 'Please select an occasion.'

  if (data.notes.length > 1000) errors.notes = 'Please keep additional requirements under 1000 characters.'

  return { ok: Object.keys(errors).length === 0, errors, data }
}

let writeQueue = Promise.resolve()

export async function storeEnquiry(dataDir, data) {
  const file = path.join(dataDir, 'enquiries.json')
  const record = {
    id: 'ST-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    receivedAt: new Date().toISOString(),
    ...data,
  }
  // Serialise writes so concurrent submissions never clobber each other.
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(dataDir, { recursive: true })
    let list = []
    try {
      list = JSON.parse(await fs.readFile(file, 'utf8'))
      if (!Array.isArray(list)) list = []
    } catch {
      list = []
    }
    list.push(record)
    const tmp = file + '.tmp'
    await fs.writeFile(tmp, JSON.stringify(list, null, 2))
    await fs.rename(tmp, file)
  })
  await writeQueue
  return record
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

// Connect-style handler: (req, res, next)
export function createEnquiryHandler(dataDir) {
  return async (req, res, next) => {
    const url = (req.url || '').split('?')[0]
    if (url !== '/api/enquiries') return next ? next() : send(res, 404, { error: 'Not found' })
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return send(res, 405, { error: 'Method not allowed' })
    }
    try {
      const raw = await readBody(req)
      let json
      try {
        json = JSON.parse(raw || '{}')
      } catch {
        return send(res, 400, { error: 'Invalid request body.' })
      }
      // Honeypot field: silently accept bots without storing.
      if (typeof json.company === 'string' && json.company.trim() !== '') {
        return send(res, 201, { ok: true, id: 'ST-RECEIVED' })
      }
      const { ok, errors, data } = validateEnquiry(json)
      if (!ok) return send(res, 422, { error: 'Please review the highlighted fields.', fields: errors })
      const record = await storeEnquiry(dataDir, data)
      return send(res, 201, { ok: true, id: record.id })
    } catch (err) {
      const status = err && err.status ? err.status : 500
      return send(res, status, { error: status === 413 ? 'Request too large.' : 'We could not save your enquiry. Please try again.' })
    }
  }
}
