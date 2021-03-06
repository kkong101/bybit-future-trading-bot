# π Bybit Derivatives Trading Bot  π§

## β οΈ DISCLAIMER
```
This is just for practice to improve your coding skills. 
You use it at your own risk.
We don't have financial responsibility. π
```

## How to work this bot(strategy)

This bot works in the futures trading. 
Long and short positions are continuously held based on the current price every specific second, and a trade is concluded when the price fluctuates a lot. After that, this strategy of making a profit when the price was restored to the original price. 
Additionally, the vix index of bitcoins is crawled from web, and multiple coins can be operated at the same time in this bot. Also, in order to minimize the number of bybit API requests(To avoid limit_rate), it is implemented so that requests are not sent when the price does not change. In addition, various functions have been implemented.

- You can configure available money rate depending on VIX index(VIX is crawled per min)
- You can configure leverage depending on VIX index
- You can configure how many seconds to send long or short replace limit order requests.
- The current price of coins is get by Websocket
- Transaction execution is also delivered though WebSocket.
- You can set the target price, stop loss, and how long the position will be held for each coin.
- You set set how many gaps from the current price to keep the limit order.(Percentage or Tick_size)



## Usage

```
npm install
```


## Configuration

- **`COINS.json`**

```json
  "white_list": [
    {
      "symbol": "LITUSDT",
      "tick_size": 0,
      "percentage": 1.54,
      "loss": 1.3,
      "profit": 1.6,
      "close_time": 1500
    },
    {
      "symbol": "FITFIUSDT",
      "tick_size": 0,
      "percentage": 1.44,
      "loss": 1.3,
      "profit": 1.53,
      "close_time": 1500
    },
    {
      "symbol": "XCNUSDT",
      "tick_size": 0,
      "percentage": 2.1,
      "loss": 1.5,
      "profit": 1.7,
      "close_time": 1500
    }
  ],
......
```

- νμ¬ white_listμΌλ‘λ§ μλνκ² λμ΄μμ.

       (λλ¦¬κ³  μΆμ μ½μΈμ white_listμ λ±λ‘, black_listλ κ·Έλ₯ λ³΅μ¬ λΆμ¬λ£κΈ°μ©μΌλ‘ μ¬μ© - λ¬΄μλ°λ)

- `tick_size` β λͺ tick κ°κ²©μΌλ‘ μ§μ κ°λ₯Ό μΆμ ν  κ²μΈμ§ μ€μ 
- `percentage` β λͺ νΌμνΈ κ°κ²©μΌλ‘ μ§μ κ°λ₯Ό μΆμ ν  κ²μΈμ§ μ€μ 

  π«Β μ£Όμ μ¬ν­ β μμ μμμ κ°μ΄ λμ€ νλλ§ μ€μ ν΄μΌν¨. μ€μ  μνλ μͺ½μ μ«μ `0`μΌλ‘ μλ ₯

- `**SECRET.json**`

```json
{
  "mode": "test",
  "url": {
    "test": "https://api-testnet.bybit.com",
    "live": "https://api.bybit.com"
  },
  "websocket": {
    "public": {
      "test": "wss://stream-testnet.bybit.com/realtime_public",
      "live": "wss://stream.bybit.com/realtime_public"
    },
    "private": {
      "test": "wss://stream-testnet.bybit.com/realtime_private",
      "live": "wss://stream.bybit.com/realtime_private"
    }
  },
  "bybit": {
    "API_KEY": "3r47qwdvrP4MaiSj5Vtnp12",
    "API_SECRET": "cketj83qwdP58efwefwefOVSyxTTZ4Mk7gU0N"
  }
}
```

- λ°μ΄λΉνΈ Key μ€μ νμΌ(λΈμΆλμ§ μκ² μ‘°μ¬.)
- `mode` β βtestβ μ βliveβ λ‘ μ€μ (νμ€νΈ or μ€μ  κ³μ’)
- `API_KEY, API_SECRET` β λ°κΈλ°μ Key μλ ₯. Test νκ²½μμλ Testμ key, Real-net νκ²½μμλ real-net key μλ ₯
- λλ¨Έμ§ κ°λ€μ κ±΄λ€λ©΄ μλ¨.

- `**TRADE.json**`

```json
{
  "vix": [
    {
      "range": "1~20", // vix μ§μμ λ²μ (λ¬΄μ‘°κ±΄ `μ«μ~μ«μ` λ‘ μ¬μ©ν΄μΌν¨.)
      "leverage": 6.5, // ν΄λΉ λ²μμ λ λ²λ¦¬μ§
      "using_money_rate": 0.7 // ν΄λΉ λ²μμ κ°μ© μλλ¨Έλμ νΌμνμ΄μ§(μ¬κΈ°μλ 70%)
    },
    {
      "range": "20~50", // μ΄ν λμΌ
      "leverage": 6.5,
      "using_money_rate": 0.8
    },
    {
      "range": "50~55",
      "leverage": 3,
      "using_money_rate": 0.7
    },
    {
      "range": "55~100",
      "leverage": 3,
      "using_money_rate": 0.8
    }
  ],
  "close_position": {
    "profit": {
      "profit_percentage": 1
      // μ²΄κ²°λ μνμμ ν΄λΉ νΌμνμ΄μ§ λ§νΌ profitμ΄λ©΄ μμ₯κ°λ‘ λ°λ‘ μ΅μ 
      // μ¬κΈ°μ 1μ 1%λ₯Ό μλ―Έν¨.
    },
    "loss": {
      "loss_percentage": 1
      // μ²΄κ²°λ μνμμ ν΄λΉ νΌμνμ΄μ§ λ§νΌ lossμ΄λ©΄ μμ₯κ°λ‘ λ°λ‘ μμ 
      // μ¬κΈ°μ 1μ 1%λ₯Ό μλ―Έν¨.
    },
    "close_position_time": 200 // λͺμ΄ νμ μ²΄κ²°λ ν¬μ§μ μ λ¦¬ν  κ²μΈμ§
    // μ¬κΈ°μλ 200μ΄ (3λΆ 20μ΄) νμ μ λ¦¬ν¨μ μλ―Έ
  },
  "order_interval": 3,
  // λͺμ΄ κ°κ²©μΌλ‘ replace_order(μ§μ κ° μΆμ μ ν μ§)λ₯Ό λ£μμ§ μ¬κΈ°μ 3μ 3μ΄λ§λ€ μ§μ κ° μΆμ 
  "call_put_tick_size": 30, // λ¬΄μ (μ­μ  μμ )
  "circuit_breaker": {
    // Circuit breaker λΆλΆ
    "time": 600, // λͺμ΄λμ κ±°λ μ€μ§ν μ§
    "percentage": 0.01 // νμ§νλ νΌμνμ΄μ§
  },
  "additional_position": 3 // λ¬΄μ (μΆνμ 2λ² μ΄μμ λ¬ΌνκΈ° κΈ°λ₯μμ μ¬μ©ν  μμ )
}
```

