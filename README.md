# Bybit Derivatives Trading Bot

## DISCLAIMER
```
This is just for practice to improve your coding skills. 
You use it at your own risk.
We don't have financial responsibility. 😂
```

## How to work this bot

This bot works in the futures trading. 
Long and short positions are continuously held based on the current price every specific second, and a trade is concluded when the price fluctuates a lot. After that, this strategy of making a profit when the price was restored to the original price. 
Additionally, the vix index of bitcoins is crawled from web, and multiple coins can be operated at the same time in this bot. Also, in order to minimize the number of bybit API requests(To avoid limit_rate), it is implemented so that requests are not sent when the price does not change. In addition, various functions have been implemented.



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

- 현재 white_list으로만 작동하게 되어있음.

       (돌리고 싶은 코인은 white_list에 등록, black_list는 그냥 복사 붙여넣기용으로 사용 - 무시바람)

- `tick_size` ⇒ 몇 tick 간격으로 지정가를 추적할 것인지 설정
- `percentage` ⇒ 몇 퍼샌트 간격으로 지정가를 추적할 것인지 설정

  🚫 주의 사항 ⇒ 위의 예시와 같이 둘중 하나만 설정해야함. 설정 안하는 쪽은 숫자 `0`으로 입력

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

- 바이비트 Key 설정파일(노출되지 않게 조심.)
- `mode` ⇒ “test” 와 “live” 로 설정(테스트 or 실제 계좌)
- `API_KEY, API_SECRET` ⇒ 발급받은 Key 입력. Test 환경에서는 Test의 key, Real-net 환경에서는 real-net key 입력
- 나머지 값들은 건들면 안됨.

- `**TRADE.json**`

```json
{
  "vix": [
    {
      "range": "1~20", // vix 지수의 범위 (무조건 `숫자~숫자` 로 사용해야함.)
      "leverage": 6.5, // 해당 범위의 레버리지
      "using_money_rate": 0.7 // 해당 범위의 가용 시드머니의 퍼샌테이지(여기서는 70%)
    },
    {
      "range": "20~50", // 이하 동일
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
      // 체결된 상태에서 해당 퍼샌테이지 만큼 profit이면 시장가로 바로 익절
      // 여기서 1은 1%를 의미함.
    },
    "loss": {
      "loss_percentage": 1
      // 체결된 상태에서 해당 퍼샌테이지 만큼 loss이면 시장가로 바로 손절
      // 여기서 1은 1%를 의미함.
    },
    "close_position_time": 200 // 몇초 후에 체결된 포지션 정리할 것인지
    // 여기서는 200초 (3분 20초) 후에 정리함을 의미
  },
  "order_interval": 3,
  // 몇초 간격으로 replace_order(지정가 추적을 할지)를 넣을지 여기서 3은 3초마다 지정가 추적
  "call_put_tick_size": 30, // 무시 (삭제 예정)
  "circuit_breaker": {
    // Circuit breaker 부분
    "time": 600, // 몇초동안 거래 중지할지
    "percentage": 0.01 // 탐지하는 퍼샌테이지
  },
  "additional_position": 3 // 무시 (추후에 2번 이상의 물타기 기능에서 사용할 예정)
}
```

