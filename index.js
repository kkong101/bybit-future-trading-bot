const SECRET = require("./SECRET.json");
const { cancelAll, setBalance } = require("./trade/deposit");
const { setVix } = require("./vix/index");
const { WebsocketClient } = require("bybit-api");
const {
  coin_info,
  on_position_coin_list,
  absent_position_list,
} = require("./globalState/index");
const { trade, create_order_queue } = require("./globalState/index");
const COINS = require("./COINS.json");
const TRADE = require("./TRADE.json");
const {
  order_long_position,
  replace_order,
  order_short_position,
  close_one_position,
  close_all_position,
  create_limit_order,
  get_current_price,
} = require("./trade/order");

const { check_order, check_send_order } = require("./subscribe/update");
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
  await cancelAll();
  await setBalance();
  await getCoinInfo();
  setVix();

  const wsUpdate = new WebsocketClient(wsConfigUpdate);

  wsUpdate.subscribe("execution");

  const ws = new WebsocketClient(wsConfig);

  /**
   * 최초 주문 넣어주는 부분
   */
  setTimeout(async () => {
    for (const coin of COINS.white_list) {
      const coinObject = coin_info.find((ee) => ee.symbol == coin.symbol);

      const tick_size = parseFloat(coinObject.tick_size);
      await create_limit_order(coin.symbol, tick_size, [1, 2, 3, 4]);
      coinObject.update_time = Date.now();
    }
  }, 1500);

  /**
   * END ###
   */

  const queue = [];
  let last_updated_time = Date.now();

  setTimeout(() => {
    /**
     * 체결 정보 실시간으로 받는곳
     */
    wsUpdate.on("update", async (data) => {
      console.log("##############");
      console.log(data);
      console.log("##############");
      for (const res of data.data) {
        for (const q of queue) {
          if (q.symbol == res.symbol && q.side == res.side) {
            break;
          } else {
            queue.push({
              symbol: res.symbol,
              side: res.side,
            });
          }
        }
      }
    });
    /**
     * END #####
     */

    setInterval(async () => {
      console.log("trade.is_onCreate_order", trade.is_onCreate_order);
      console.log("trade.is_circuit_breaker", trade.is_circuit_breaker);
      console.log("on_position_coin_list", on_position_coin_list);
      console.log("coin_info[0].order", coin_info[0].order);
      console.log("queue", queue);

      if (trade.is_circuit_breaker || trade.is_onCreate_order) {
        return;
      }
      console.log(
        "Date.now() - last_updated_time",
        Date.now() - last_updated_time
      );
      if (Date.now() - last_updated_time > 7000) {
        for (const coin of coin_info) {
          await check_send_order(coin.symbol);
        }
        last_updated_time = Date.now();
        return;
      }
      if (queue.length == 0) return;

      while (true) {
        await check_send_order(queue.shift().symbol);
        last_updated_time = Date.now();
        if (queue.length == 0) return;
      }
    }, 1000);
  }, 4500);

  /**
   * Websocket으로 불러오는 부분 => API로 불러오게 변경
   */

  setInterval(async () => {
    for (const coin of COINS.white_list) {
      const price = await get_current_price(coin.symbol);
      const idx = coin_info.findIndex((e) => e.symbol == coin.symbol);

      if (
        coin_info[idx].previous_price + coin_info[idx].tick_size >= price &&
        coin_info[idx].previous_price - coin_info[idx].tick_size <= price
      ) {
        console.log(
          "이전가격과 동일하여 replace order 부분 return ################"
        );
        return;
      }

      const res1 = await replace_order(coin.symbol, price, idx, 1);

      const res2 = await replace_order(coin.symbol, price, idx, 2);

      const res3 = await replace_order(coin.symbol, price, idx, 3);

      const res4 = await replace_order(coin.symbol, price, idx, 4);

      console.log("REPLACE ORDER", res4);

      if (res1 && res2 && res3 && res4) {
        coin_info[idx].previous_price = price;
        coin_info[idx].update_time = Date.now();
      }
    }
  }, TRADE.order_interval * 1000);

  /**
   * THE END ###
   */

  /**
   * 이전 버전
   */
  // setTimeout(() => {
  //   ws.close("trade.*");
  //   coin_info.forEach((e) => {
  //     ws.subscribe(`trade.${e.symbol}`);
  //   });

  //   ws.on("update", async (data) => {
  //     // 50틱 이상 가격에 걸어줌.
  //     const symbol = data.data[0].symbol;
  //     const price = parseFloat(data.data[0].price);

  //     console.log("!@#", symbol, " => ", price);

  //     if (coin_info.find((e) => symbol == e.symbol)) {
  //       let idx = coin_info.findIndex((e) => e.symbol == symbol);

  //       console.log("이거 뭐나옴 ? ", Date.now() - coin_info[idx].update_time);
  //       if (
  //         Date.now() - coin_info[idx].update_time >
  //         TRADE.order_interval * 1000
  //       ) {
  //         // 같은 가격이면 요청 보내지 않음.tick_size
  //         if (
  //           coin_info[idx].previous_price + coin_info[idx].tick_size >= price &&
  //           coin_info[idx].previous_price - coin_info[idx].tick_size <= price
  //         ) {
  //           console.log("이전가격과 동일하여 replace order 부분 return");
  //           return;
  //         }
  //         /**
  //          * high_position_price + tick_size * TRADE.call_put_tick_size,
  //          */
  //         console.log("가격 업데이트");

  //         // idx는 coin_info에서 해당하는 coin이 몇번째에 있는지의 대한 값임.
  //         // 1은 limit order가 위에서부터 몇번째인지 >?
  //         const res1 = await replace_order(symbol, price, idx, 1);

  //         const res2 = await replace_order(symbol, price, idx, 2);

  //         const res3 = await replace_order(symbol, price, idx, 3);

  //         const res4 = await replace_order(symbol, price, idx, 4);

  //         console.log("REPLACE ORDER", res4);

  //         coin_info[idx].update_time = Date.now();
  //       }
  //     }
  //   });
  // }, 4000);
  /**
   * THE END ###
   */

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
