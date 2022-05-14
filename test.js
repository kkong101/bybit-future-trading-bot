const { WebsocketClient } = require("bybit-api");
const SECRET = require("./SECRET.json");
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
  close_one_position,
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

const API_KEY = SECRET.bybit.API_KEY;
const PRIVATE_KEY = SECRET.bybit.API_SECRET;

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

const qwedq = async () => {
  const test = [
    {
      name: "gdgd",
      order: [
        { id: "0091e4a5-ef0b-4a51-b60c-66bcd3fc6218", position: 4 },
        { id: "7fabea12-9a21-4d8f-bebe-47307fbdc840", position: 3 },
        { id: "c33d5991-76d2-43f4-b910-22cfe6542471", position: 2 },
        { id: "e8237014-152b-4190-aba6-4e69eafcba9e", position: 1 },
      ],
    },
    {
      name: "zzz",
      order: [
        { id: "0091e4a5-ef0b-4a51-b60c-66bcd3fc6218", position: 4 },
        { id: "7fabea12-9a21-4d8f-bebe-47307fbdc840", position: 3 },
        { id: "c33d5991-76d2-43f4-b910-22cfe6542471", position: 2 },
        { id: "e8237014-152b-4190-aba6-4e69eafcba9e", position: 1 },
      ],
    },
  ];
  const obj = test.find((e) => e.name == "zzz");
  const obj22 = obj.order.find((e) => e.position == 4);
  obj22.position = -1;
  console.log(test[1]);
};

qwedq();
