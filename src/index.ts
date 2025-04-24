import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import { PrivateKey } from 'symbol-sdk'
import { Address, KeyPair, SymbolFacade } from 'symbol-sdk/symbol'
import { fetchXymPriceJPY } from './fetchPrice.js'
import { existMetadata, saveMetadata } from './metadata.js'

/**
 * 昨日から年始めのXYMのJPY価格を取得し、メタデータとして保存する
 */

dayjs.extend(utc)
dayjs.extend(timezone)

const today = dayjs().tz('Asia/Tokyo')
const yesterday = today.subtract(1, 'day')
const startOfYear = yesterday.startOf('year')
console.log(`開始年月日: ${startOfYear.format('YYYY-MM-DD')}`)

const facade = new SymbolFacade(process.env.SYMBOL_NETWORK as string)
const targetKeyPair = new KeyPair(
  new PrivateKey(process.env.SYMBOL_PRIVATE_KEY as string),
)
const targetAddress = facade.network.publicKeyToAddress(
  targetKeyPair.publicKey,
) as Address

// todayからstartOfYearまで繰り返す
let latest = today
for (; latest.isAfter(startOfYear); latest = latest.subtract(1, 'day')) {
  if (await existMetadata(latest, 1, targetAddress)) break
}
console.log(`最新年月日: ${latest.format('YYYY-MM-DD')}`)
latest = latest.add(1, 'day')

// latestからyesterdayまで繰り返す
for (let date = latest; date.isBefore(today); date = date.add(1, 'day')) {
  if (await existMetadata(date, 1, targetAddress)) continue

  // XYMのJPY価格を取得
  const price = await fetchXymPriceJPY(date)
  console.log(
    `XYMのJPY価格（${date.tz('Asia/Tokyo').format('YYYY-MM-DD')}）: ¥${price}`,
  )

  // メタデータを保存
  await saveMetadata(date, 1, price)

  // 待機
  await new Promise((resolve) => setTimeout(resolve, 30000))
}
