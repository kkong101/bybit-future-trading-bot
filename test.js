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

const {
  set_circuit_breaker_condition,
  check_circuit_breaker,
  check_on_position_list,
  check_limit_order_list,
  getCoinInfo,
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

// const test2 = async () => {
//   const ws = new WebsocketClient(wsConfig);

//   ws.close("trade.*");

//   ws.subscribe(`trade.BTCUSDT`);

//   ws.on("update", async (data) => {
//     console.log(data);
//   });
// };

const test123 = async () => {
  const test = [
    { id: "87b0d70b-af04-465f-9d4e-2a605d0f351a", position: 2 },
    { id: "c9f360fa-4a31-4d0f-8a20-dbdf7df53384", position: 3 },
    { id: "8c80a73a-9433-45a0-892d-82e64423e19d", position: 4 },
  ];

  console.log(test.find((e) => e.position == 2));
};

test123();