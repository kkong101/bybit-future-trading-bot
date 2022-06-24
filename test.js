const { WebsocketClient } = require("bybit-api");
const SECRET = require("./SECRET.json");
const axios = require("axios");
const {
  circuit_breaker,
  trade,
  on_position_coin_list,
  coin_info,
} = require("./globalState/index");
const { getPercentage } = require("./utils/index");
const { cancelAll, setBalance } = require("./trade/deposit");
const { getAxios, postAxios } = require("./axios/index");
const { setVix } = require("./vix/index");
const {
  close_one_position_market,
  close_all_position,
  get_current_price,
} = require("./trade/order");

const COINS = require("./COINS.json");

const {
  check_circuit_breaker,
  check_on_position_list,
  check_limit_order_list,
  getCoinInfo,
  set_isolated_mode,
} = require("./setInfo/index");
const TRADE = require("./TRADE.json");
const { cancel_one_side_limit_order } = require("./trade/deposit");

const API_KEY =
  SECRET.mode == "live" ? SECRET.bybit.API_KEY : SECRET.bybit_test.API_KEY;
const PRIVATE_KEY =
  SECRET.mode == "live"
    ? SECRET.bybit.API_SECRET
    : SECRET.bybit_test.API_SECRET;

const wsConfig = {
  key: API_KEY,
  secret: PRIVATE_KEY,
  wsUrl: "wss://stream-testnet.bybit.com/realtime_public",
};

const wsConfigUpdate = {
  key: API_KEY,
  secret: PRIVATE_KEY,
  wsUrl: "wss://stream-testnet.bybit.com/realtime_private",
};

// const test = async () => {
//   // console.log(getPercentage(1100, 1000));
//   const ws = new WebsocketClient(wsConfig);

//   ws.subscribe(`trade.BTCUSDT`);

//   ws.on("update", (data) => {
//     if (!trade.is_circuit_breaker) {
//       const price = parseFloat(data.data[0].price);
//       if (Date.now() - circuit_breaker.checked_time > 2000) {
//         set_circuit_breaker_condition();
//         check_circuit_breaker(price);
//       }
//     }
//   });
// };

// const order_money =
// (trade.total_money * trade.using_money_rate) /
// (TRADE.additional_position.long + TRADE.additional_position.short);

// const coinObject = coin_info.find((e) => e.symbol == symbol);

// min_trading_qty: 0.001,
// qty_step: 0.001

// const qty = order_money / price;

// test();

const test2 = async () => {
  const ws = new WebsocketClient(wsConfig);

  ws.close("trade.*");

  ws.subscribe(`trade.ETHUSDT`);

  ws.on("update", async (data) => {
    console.log(data);
    const direction_list = [];
    // ZeroMinusTick & ZeroPlusTick 제거
    for (const res of data.data) {
      if (
        res.tick_direction != "ZeroMinusTick" &&
        res.tick_direction != "ZeroPlusTick"
      ) {
        direction_list.push(res);
      }
    }

    if (direction_list.length > 0) {
      const obj = direction_list[direction_list.length - 1];
      console.log(" ### PRICE == > ", obj.price);
    }
  });
};

const test123 = async (symbol = "BTCUSDT") => {
  const res = await getAxios("/private/linear/position/list", {
    symbol: symbol,
  });

  console.log(res);
  if (res.result || res.result.length != 0) {
    for (const position of res.result) {
      // 만약 구매한 상태라면,
      if (parseFloat(position.size) != 0) {
        console.log(position.side);
      }

      if (parseFloat(position.size) > 0) {
        console.log("성공");
      }
    }
  }
};

const zzzz = (ttt) => {
  console.log(ttt, "ddd");
  const test = ttt.find((e) => e.title === "tset");
  const zzz = test.order.find((e) => e.id === "tsetset");

  zzz.id = 1;
};

const getKoreaTime = (ms) => {
  // ex ) 1655372640
  return new Date(parseInt(ms) * 1000 + 9 * 60 * 60 * 1000);
};

const getEMA = async () => {
  const server_time = parseInt(new Date().getTime() / 1000);
  let N = 30;
  const res = await getAxios("/public/linear/kline", {
    symbol: "UNFIUSDT",
    interval: 1,
    from: server_time - N * 60 * 2,
  });

  const k = 2 / (N + 1);

  const priceList = res.result;

  // 30EMA 부분

  let sma = 0;
  for (let i = 0; i < N; i++) {
    sma += parseFloat(priceList[i].close);
  }

  sma /= N;

  const startPrice = sma;
  let current_ema_30 = 0;
  let prev_ema = startPrice;

  for (let i = N; i < priceList.length; i++) {
    current_ema_30 = (parseFloat(priceList[i].close) - prev_ema) * k + prev_ema;
    prev_ema = current_ema_30;
  }

  console.log("30 => ", current_ema_30);
  // ###############

  // 7EMA 부분
  N = 7;
  let sma7 = 0;
  for (let i = priceList.length - 2 * N; i < priceList.length - N; i++) {
    sma7 += parseFloat(priceList[i].close);
  }

  sma7 /= N;

  const startPrice7 = sma7;
  let current_ema = 0;
  let prev_ema7 = startPrice7;

  for (let i = priceList.length - N; i < priceList.length; i++) {
    current_ema = (parseFloat(priceList[i].close) - prev_ema7) * k + prev_ema7;
    prev_ema7 = current_ema;
  }

  // #################

  console.log("7 => ", current_ema);
  console.log("차이", current_ema_30 - current_ema);
  return [current_ema, current_ema_30];
};

const qdwjnq1 = async () => {
  const MACD = require("technicalindicators").MACD;

  const server_time = parseInt(new Date().getTime() / 1000);
  const res = await getAxios("/public/linear/kline", {
    symbol: "APEUSDT",
    interval: 1,
    from: server_time - 10000,
  });
  console.log(res.result[res.result.length - 1].close);
  let values = [];
  for (const e of res.result) {
    values.push(parseFloat(e.close));
  }
  const macdInput = {
    values: values,
    fastPeriod: 5,
    slowPeriod: 8,
    signalPeriod: 5,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  };

  const kk = MACD.calculate(macdInput);
  console.log(kk[kk.length - 1]);
};

const qwdqwdgsreg = async () => {
  const res = await getAxios("/private/linear/order/search", {
    symbol: "AXSUSDT",
  });
  console.log(res);
};

qwdqwdgsreg();
