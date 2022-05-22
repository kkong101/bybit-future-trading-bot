# 바이비트를 이용한 자동매매 봇

## 본 소스코드는 학습을 목적으로 제작하였기 때문에 사용 시 금전적 손실에 대한 책임을 지지 않습니다.😂

## 1. 버전

| Version 1.0.0
(2022.05.22) | - 기능

1. 롱 2개 숏 2개의 지정가로 작동
2. limit_order를 계속 추적하는 방식으로 beam 체결
3. Vix, Circuit breaker(개선 필요)
4. | 로그 전부 출력 (ctrl + f 한 뒤 “err” 검색 시 에러 추적 가능) |
   | ------------------------------------------------------------ |
   | Version 1.1.0 (예정)
   (~2022.05.29) | - 추가 및 보완 기능
5. TP/SL 개선
6. 새로운 Circuit Breaker 방식 도입 |

🚫 Version 2부터 Real-net 사용을 권장함…

## 2. 설치 및 실행 방법

[실행 Setting 방법](https://www.notion.so/Setting-1f06902257c946af90a3acf2b6908247)

## 3. Trading 설정값

- **`COINS.json`**

```json
"white_list": [
    { "symbol": "LTCUSDT", "tick_size": 0, "percentage": 0.3 },
    { "symbol": "NEARUSDT", "tick_size": 50, "percentage": 0 },
    { "symbol": "LINKUSDT", "tick_size": 0, "percentage": 0.3 }
  ],
  "black_list": [
    { "symbol": "SOLUSDT", "tick_size": 0, "percentage": 0.4 },
    { "symbol": "NEARUSDT", "tick_size": 0, "percentage": 0.4 },
    { "symbol": "LINKUSDT", "tick_size": 0, "percentage": 0.4 },
    { "symbol": "LRCUSDT", "tick_size": 0, "percentage": 0.4 },
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
    "API_KEY": "3r47vrP4MaiSj5Vtnp12",
    "API_SECRET": "cketj83P58efwefwefOVSyxTTZ4Mk7gU0N"
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

## 4. 버그 & 추가 기능 제보(ex)

| 순서 | 종류      | 설명                                        | 중요도 | 진행도 |
| ---- | --------- | ------------------------------------------- | ------ | ------ |
| 1    | 버그      | 가격이 제대로 호출이 안됩니다.              | 상     | 0%     |
| 2    | 기능 추가 | 추가적인 설정값을 넣고 싶습니다.            | 중     | 10%    |
| 3    | 기능 개선 | Circuit breaker의 기능을 개선하고 싶습니다. | 하     | 30%    |
