import axios from 'axios'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 日本時間での指定日の価格をCoinGeckoから取得
 */
export const fetchXymPriceJPY = async (
  date: dayjs.Dayjs,
  coinName: string,
): Promise<number> => {
  const jpDateStr = date.tz('Asia/Tokyo').format('DD-MM-YYYY')
  const url = `https://api.coingecko.com/api/v3/coins/${coinName}/history?date=${jpDateStr}&localization=false`

  try {
    const response = await axios.get(url)
    const price = response.data.market_data?.current_price?.jpy

    if (typeof price !== 'number') {
      throw new Error('JPY価格が取得できませんでした')
    }

    return price
  } catch (error) {
    console.error(`CoinGecko価格取得失敗（${jpDateStr}）:`, error)
    throw error
  }
}
