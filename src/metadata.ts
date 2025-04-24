import axios from 'axios'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import dotenv from 'dotenv'
import { PrivateKey, utils } from 'symbol-sdk'
import {
  Address,
  descriptors,
  KeyPair,
  metadataUpdateValue,
  models,
  SymbolFacade,
  SymbolTransactionFactory,
} from 'symbol-sdk/symbol'

dotenv.config()
dayjs.extend(utc)
dayjs.extend(timezone)

// メタデータキーを生成
const generateMetadataKey = (date: dayjs.Dayjs, coinNo: number): bigint => {
  const jpDateStr = date.tz('Asia/Tokyo').format('YYYYMMDD')
  const paddedCoinNo = coinNo.toString().padStart(6, '0')
  return BigInt(`0xD${jpDateStr}C${paddedCoinNo}`)
}

// メタデータが存在するか確認
export const existMetadata = async (
  date: dayjs.Dayjs,
  coinNo: number,
  address: Address,
): Promise<boolean> => {
  const metadataKey = generateMetadataKey(date, coinNo)
    .toString(16)
    .toUpperCase()
  const query = new URLSearchParams({
    targetAddress: address.toString(),
    sourceAddress: address.toString(),
    scopedMetadataKey: metadataKey,
    metadataType: '0',
  })
  const url = `${process.env.SYMBOL_NODE_URL}/metadata?${query.toString()}`

  try {
    const response = await axios.get(url)
    if (response.data.data.length > 0) {
      console.log(`メタデータは既に登録されています: ${metadataKey}`)
      return true
    }
  } catch (error) {
    console.error(`メタデータの取得に失敗しました: ${metadataKey}`)
    throw error
  }

  return false
}

// トランザクションを作成
const createTransaction = (
  facade: SymbolFacade,
  targetAddress: Address,
  metadataKey: bigint,
  metadataVal: Uint8Array,
  sizeDelta: number,
  targetKeyPair: KeyPair,
): models.Transaction => {
  const descriptor = new descriptors.AccountMetadataTransactionV1Descriptor(
    targetAddress,
    metadataKey,
    sizeDelta,
    metadataVal,
  )
  const tx = facade.createEmbeddedTransactionFromTypedDescriptor(
    descriptor,
    targetKeyPair.publicKey,
  )

  const aggregateDescriptor =
    new descriptors.AggregateCompleteTransactionV2Descriptor(
      SymbolFacade.hashEmbeddedTransactions([tx]),
      [tx],
    )
  return facade.createTransactionFromTypedDescriptor(
    aggregateDescriptor,
    targetKeyPair.publicKey,
    100,
    60 * 60 * 2,
    0,
  )
}

// トランザクションを署名してアナウンス
const signAndAnnounceTransaction = async (
  facade: SymbolFacade,
  targetKeyPair: KeyPair,
  transaction: models.Transaction,
): Promise<boolean> => {
  const sig = facade.signTransaction(targetKeyPair, transaction)
  const jsonPayload = SymbolTransactionFactory.attachSignature(transaction, sig)

  try {
    const response = await axios.put(
      `${process.env.SYMBOL_NODE_URL}/transactions`,
      jsonPayload,
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
    console.log('アナウンス結果:', response.data)
  } catch (error) {
    console.error('アナウンスに失敗しました:', error)
    throw error
  }
  return true
}

// メタデータを保存
export const saveMetadata = async (
  date: dayjs.Dayjs,
  coinNo: number,
  price: number,
) => {
  const facade = new SymbolFacade(process.env.SYMBOL_NETWORK as string)
  const targetKeyPair = new KeyPair(
    new PrivateKey(process.env.SYMBOL_PRIVATE_KEY as string),
  )
  const targetAddress = facade.network.publicKeyToAddress(
    targetKeyPair.publicKey,
  ) as Address

  const metadataKey = generateMetadataKey(date, coinNo)
  const roundedPriceBigInt = BigInt(Math.round(price * 1_000_000))
  const metadataVal = new TextEncoder().encode(roundedPriceBigInt.toString())

  console.log(`メタデータキー: ${metadataKey.toString(16).toUpperCase()}`)
  console.log(`メタデータ値  : ${roundedPriceBigInt}`)

  if (await existMetadata(date, coinNo, targetAddress)) return

  const transaction = createTransaction(
    facade,
    targetAddress,
    metadataKey,
    metadataVal,
    metadataVal.length,
    targetKeyPair,
  )

  return await signAndAnnounceTransaction(facade, targetKeyPair, transaction)
}

// メタデータを取得
export const getMetadata = async (
  date: dayjs.Dayjs,
  coinNo: number,
  address: Address,
) => {
  const metadataKey = generateMetadataKey(date, coinNo)
    .toString(16)
    .toUpperCase()
  const query = new URLSearchParams({
    targetAddress: address.toString(),
    sourceAddress: address.toString(),
    scopedMetadataKey: metadataKey,
    metadataType: '0',
  })
  const url = `${process.env.SYMBOL_NODE_URL}/metadata?${query.toString()}`

  try {
    const response = await axios.get(url)
    if (response.data.data.length > 0) {
      return response.data.data
    }
  } catch (error) {
    console.error(`メタデータの取得に失敗しました: ${metadataKey}`)
    throw error
  }

  return null
}

// メタデータを削除
export const deleteMetadata = async (date: dayjs.Dayjs, coinNo: number) => {
  const facade = new SymbolFacade(process.env.SYMBOL_NETWORK as string)
  const targetKeyPair = new KeyPair(
    new PrivateKey(process.env.SYMBOL_PRIVATE_KEY as string),
  )
  const targetAddress = facade.network.publicKeyToAddress(
    targetKeyPair.publicKey,
  ) as Address

  const metadataKey = generateMetadataKey(date, coinNo)
  let metadataVal = new TextEncoder().encode('')
  let sizeDelta = 0

  const metadataInfo = await getMetadata(date, coinNo, targetAddress)
  if (metadataInfo && metadataInfo.length > 0) {
    sizeDelta -= metadataInfo[0].metadataEntry.valueSize
    metadataVal = metadataUpdateValue(
      utils.hexToUint8(metadataInfo[0].metadataEntry.value),
      metadataVal,
    )
  }

  const transaction = createTransaction(
    facade,
    targetAddress,
    metadataKey,
    metadataVal,
    sizeDelta,
    targetKeyPair,
  )

  return await signAndAnnounceTransaction(facade, targetKeyPair, transaction)
}
