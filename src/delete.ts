import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import { deleteMetadata } from './metadata.js'

dayjs.extend(utc)
dayjs.extend(timezone)

await deleteMetadata(dayjs().subtract(1, 'day'), 1)
await new Promise((resolve) => setTimeout(resolve, 1000)) // 1秒待機
await deleteMetadata(dayjs().subtract(2, 'day'), 1)
await new Promise((resolve) => setTimeout(resolve, 1000)) // 1秒待機
await deleteMetadata(dayjs().subtract(3, 'day'), 1)
