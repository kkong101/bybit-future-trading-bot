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

const { check_send_order } = require("./subscribe/update");
const {
  getCoinInfo,
  check_on_position_list,
  set_isolated_mode,
} = require("./setInfo/index");

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
  const last_updated_time = [];
  for (const coin of COINS.white_list) {
    last_updated_time.push({
      symbol: coin.symbol,
      updated: Date.now(),
    });
  }

  /**
   * 매수 매도 (체결 정보) 실시간으로 받는곳
   */
  setTimeout(() => {
    wsUpdate.on("update", async (data) => {
      console.log("체결됨##############");
      console.log(data);
      console.log("체결됨##############");
      for (const res of data.data) {
        for (const q of queue) {
          if (q.symbol == res.symbol && q.side == res.side) return;
        }
        queue.push({
          symbol: res.symbol,
          side: res.side,
        });
      }
    });
    /**
     * END #####
     */

    /**
     *  1초마다 queue에 있는 작업들을 체크한뒤 하나씩 실행.
     */
    setInterval(async () => {
      console.log("trade.is_onCreate_order", trade.is_onCreate_order);
      console.log("trade.is_circuit_breaker", trade.is_circuit_breaker);
      console.log("on_position_coin_list", on_position_coin_list);
      let i = 0;
      for (const coin of coin_info) {
        console.log(coin_info[i].symbol, "coin_info.order ", coin.order);
        i++;
      }

      console.log("queue", queue);

      if (trade.is_circuit_breaker || trade.is_onCreate_order) {
        return;
      }
      last_updated_time.forEach((e) => {
        console.log(e.symbol, " =>  updated_time : ", Date.now() - e.updated);
      });

      // for (const coin of last_updated_time) {
      //   if (Date.now() - coin.updated > 7000) {
      //     await check_send_order(coin.symbol);
      //     coin.updated = Date.now();
      //   }
      // }

      if (queue.length == 0) return;

      while (true) {
        const symbol = queue.shift().symbol;
        await check_send_order(symbol);
        const idx = last_updated_time.findIndex((e) => e.symbol == symbol);
        last_updated_time[idx].updated = Date.now();
        if (queue.length == 0) return;
      }
    }, 1000);
  }, 11000);
  /**
   * THE END #######
   */

  /**
   * 실시간 코인 가격 불러오는 부분 #####
   */
  setTimeout(() => {
    ws.close("trade.*");
    coin_info.forEach((e) => {
      ws.subscribe(`trade.${e.symbol}`);
    });
    ws.on("update", async (data) => {
      if (trade.is_circuit_breaker) return;

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

      // 가격 변동이 없으면 return 시킴.
      if (direction_list.length == 0) return;
      const obj = direction_list[direction_list.length - 1];
      console.log(" ### PRICE == > ", obj.price);

      const price = parseFloat(obj.price);
      const symbol = obj.symbol;
      const idx = coin_info.findIndex((e) => e.symbol == symbol);

      if (idx != -1) {
        if (
          Date.now() - coin_info[idx].update_time >
          TRADE.order_interval * 1000
        ) {
          // 같은 가격이면 요청 보내지 않음.tick_size
          if (
            coin_info[idx].previous_price + coin_info[idx].tick_size >= price &&
            coin_info[idx].previous_price - coin_info[idx].tick_size <= price
          ) {
            console.log("이전가격과 동일하여 replace order 부분 return");
            return;
          }
          // idx는 coin_info에서 해당하는 coin이 몇번째에 있는지의 대한 값임.
          // 1은 limit order가 위에서부터 몇번째인지 >?
          const res1 = await replace_order(symbol, price, idx, 1);

          const res2 = await replace_order(symbol, price, idx, 2);

          const res3 = await replace_order(symbol, price, idx, 3);

          const res4 = await replace_order(symbol, price, idx, 4);

          if (res1 && res2 && res3 && res4) {
            coin_info[idx].previous_price = price;
            coin_info[idx].update_time = Date.now();
          }
          console.log(symbol, " 끝 #####");
        }
      }
    });
  }, 13000);
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
