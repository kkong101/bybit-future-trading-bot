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
  check_available_coin_trade,
  check_position_order,
  check_circuit_breaker,
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

  let isReady = false;
  const request_interval = 500;

  /**
   * 최초 주문 넣어주는 부분
   */
  setTimeout(async () => {
    let idx = 1;
    for (const coin of COINS.white_list) {
      setTimeout(async () => {
        const coinObject = coin_info.find((ee) => ee.symbol == coin.symbol);
        if (!coinObject) return;

        const tick_size = parseFloat(coinObject.tick_size);
        await create_limit_order(coin.symbol, tick_size, [1, 2, 3, 4]);
        coinObject.update_time = Date.now();
      }, idx * request_interval);
      idx++;
    }
    setTimeout(() => {
      isReady = true;
    }, COINS.white_list.length * request_interval + 4000);
  }, 5000);

  /**
   * END ###
   */

  const queue = [];
  const last_updated_time = [];
  let i = 0;
  for (const coin of COINS.white_list) {
    last_updated_time.push({
      symbol: coin.symbol,
      updated: Date.now() + i,
    });
    i += 2500;
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
      if (!isReady) return;
      console.log("trade.is_onCreate_order", trade.is_onCreate_order);
      console.log("trade.is_circuit_breaker", trade.is_circuit_breaker);
      console.log("on_position_coin_list", on_position_coin_list);

      coin_info.forEach((coin) =>
        console.log(coin.symbol, "coin_info.order ", coin.order)
      );

      console.log("queue", queue);

      if (trade.is_circuit_breaker || trade.is_onCreate_order) {
        return;
      }
      last_updated_time.forEach((e) => {
        console.log(e.symbol, " =>  updated_time : ", Date.now() - e.updated);
      });

      for (const coin of last_updated_time) {
        if (Date.now() - coin.updated > 40000) {
          console.log("check_send_order##### 작동");
          await check_send_order(coin.symbol);
          coin.updated = Date.now();
        }
      }

      if (queue.length == 0) return;

      while (true) {
        const symbol = queue.shift().symbol;
        await check_send_order(symbol);
        const idx = last_updated_time.findIndex((e) => e.symbol == symbol);
        last_updated_time[idx].updated = Date.now();
        if (queue.length == 0) return;
      }
    }, 1000);
  }, COINS.white_list.length * request_interval + 4000);
  /**
   * THE END #######
   */

  /**
   * 실시간 코인 가격 불러오는 부분 #####
   */
  setTimeout(() => {
    // ws.close("trade.*");
    coin_info.forEach((e) => {
      ws.subscribe(`trade.${e.symbol}`);
    });

    if (coin_info.find((e) => e.symbol == "BTCUSDT") == null)
      ws.subscribe(`trade.BTCUSDT`);

    ws.on("update", async (data) => {
      if (!isReady) return;
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
      if (symbol == "BTCUSDT") {
        if (!trade.is_circuit_breaker) await check_circuit_breaker(price);
      }

      // 코인 가격 업데이트 해줌.
      if (idx != -1) coin_info[idx].current_price = price;
    });

    /**
     * 받아온 가격들을 queue에 넣어주고 symbol 단위로 처리해준다.
     */
    setInterval(async () => {
      // 포지션 정리할거 있는지 체크
      for (const coin of coin_info) {
        // 같은 가격이면 요청 보내지 않음.tick_size
        await check_position_order(coin.symbol);
        if (
          coin.previous_price > coin.current_price + coin.tick_size * 2 ||
          coin.previous_price < coin.current_price - coin.tick_size * 2
        ) {
          /**
           * 403이 떠서 일단 이렇게....
           */
          const idx = coin_info.findIndex((e) => e.symbol == coin.symbol);
          const full_position_list = [1, 2, 3, 4];
          let time = 100;
          for (const p of full_position_list) {
            setTimeout(async () => {
              await replace_order(coin.symbol, coin.current_price, idx, p);
            }, time);

            time += 100;
          }
        } else {
          console.log(coin.symbol, " => ####### 가격변동 없어서 break ######");
        }
      }
    }, TRADE.order_interval * 1000);
    /**
     * THE END #####
     */
  }, COINS.white_list.length * request_interval + 8000);
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
