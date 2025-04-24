# symbol-metaprice

`symbol.xym` の価格 (日本円) をメタデータに格納します。  
Scoped Metadata Key は `D{yyyymmdd}C000001` の形式で指定します。  
価格は分割可能性が 6 の整数値として表現されます。

例:

- Scoped Metadata Key: `D20250423C000001` -> 2025/04/23
- 値: `1593672` -> 1.593672 円

## 使用方法

`.env` ファイルを作成し、以下の内容を編集してください。

- `SYMBOL_NETWORK`: 使用するネットワーク (testnet または mainnet)
- `SYMBOL_NODE_URL`: API を提供するノードの URL
- `SYMBOL_PRIVATE_KEY`: データを書き込むアカウントの秘密鍵

例:

```.env
SYMBOL_NETWORK=testnet
SYMBOL_NODE_URL=https://t.sakia.harvestasya.com:3001
SYMBOL_PRIVATE_KEY=****************************************************************
COIN_NO=1
COIN_NAME=symbol
```

設定後、以下のコマンドを実行します。

```bash
yarn start
```
