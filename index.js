const SECRET = require("./SECRET.json");
const { cancelAll, setBalance } = require("./trade/deposit");
const { setVix } = require("./vix/index");
const { WebsocketClient } = require("bybit-api");
const { coin_info, on_position_coin_list } = require("./globalState/index");
const { trade } = require("./globalState/index");
const COINS = require("./COINS.json");
const TRADE = require("./TRADE.json");
const {
  order_long_position,
  replace_order,
  order_short_position,
  close_one_position,
  close_all_position,
  create_limit_order,
} = require("./trade/order");

const { realtime_update } = require("./subscribe/update");
const { getCoinInfo, check_on_position_list } = require("./setInfo/index");

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

// 시작했을 때 코인 정보 가져오는 부분

const main = async () => {
  await setBalance();
  await getCoinInfo();
  setVix();

  const wsUpdate = new WebsocketClient(wsConfigUpdate);

  wsUpdate.subscribe("execution");

  const ws = new WebsocketClient(wsConfig);

  // symbol정보만 담음.
  const queue = [];
  /**
   * {
   *  symbol: "BTCUSDT"
   * }
   */

  // 큐를 처리하는 부분
  setInterval(async () => {
    // 큐에 아무것도 없다면, 그냥 나감.
    if (queue.length == 0) return;
    // 큐에 데이터가 있다면,
    // 큐가 비워질때까지 처리 진행, 바이비트 서버 체결 시간이 조금 걸려서 시간 걸어줌.
    while (true) {
      await realtime_update(queue.shift());
      if (queue.length == 0) break;
    }
  }, 1000);

  /**
   * 체결 정보 실시간으로 받는곳
   */
  wsUpdate.on("update", async (data) => {
    console.log("##############");
    console.log(data);
    console.log("##############");

    // Symbol 중복 제거 작업 진행
    for (const order of data.data) {
      // 해당 코인이 없을경우에 넣어줌.
      if (!queue.includes(order.symbol)) queue.push(order.symbol);
    }

    console.log("queue @@@@@@ ", queue);
  });

  ws.close("trade.*");
  coin_info.forEach((e) => {
    ws.subscribe(`trade.${e.symbol}`);
  });

  ws.on("update", async (data) => {
    if (trade.using_money_rate == 0) return;
    // 50틱 이상 가격에 걸어줌.
    const symbol = data.data[0].symbol;
    const price = parseFloat(data.data[0].price);

    console.log(symbol, " => ", price);
    if ((coinObject = coin_info.find((e) => symbol == e.symbol))) {
      const tick_size = parseFloat(coinObject.tick_size);

      let idx = coin_info.findIndex((e) => e.symbol == symbol);

      // 최초 포지션 진입하고 order_id를 저장함.
      if (coinObject.order.length == 0) {
        coin_info[idx].update_time = Date.now();
        if (trade.is_onCreate_order) return;
        trade.is_onCreate_order = true;
        await create_limit_order(symbol, tick_size, [1, 2, 3, 4]);
        trade.is_onCreate_order = false;
      } else {
        if (Date.now() - coin_info[idx].update_time > TRADE.order_interval) {
          // 같은 가격이면 요청 보내지 않음.tick_size
          if (
            coin_info[idx].previous_price + coin_info[idx].tick_size >= price &&
            coin_info[idx].previous_price - coin_info[idx].tick_size <= price
          )
            return;

          console.log("현재 체결중인 포지션", on_position_coin_list);
          console.log("주문 걸려있는 포지션 ", coin_info[0].order);

          /**
           * high_position_price + tick_size * TRADE.call_put_tick_size,
           */

          // idx는 coin_info에서 해당하는 coin이 몇번째에 있는지의 대한 값임.
          // 1은 limit order가 위에서부터 몇번째인지 >?
          const res1 = await replace_order(symbol, price, idx, 1);

          const res2 = await replace_order(symbol, price, idx, 2);

          const res3 = await replace_order(symbol, price, idx, 3);

          const res4 = await replace_order(symbol, price, idx, 4);

          console.log(res4);

          coin_info[idx].update_time = Date.now();
        }
      }
    }
  });

  /**
   * 거래가 체결되면 order_id 다시한번 받아와서 정렬해줘야댐.... 헐..
   */

  // 에러 처리 해야되는 부분
  ws.on("close", () => {
    console.log("connection closed");
  });

  ws.on("error", (err) => {
    console.error("ERR", err);
  });
};

main();
